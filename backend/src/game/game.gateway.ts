import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';

@WebSocketGateway({
  cors: {
    origin: (() => {
      const env = process.env.FRONTEND_ORIGIN;
      if (env && env.length > 0) {
        // Support comma-separated list
        return env.split(',').map((s) => s.trim());
      }
      return ['http://localhost:3000'];
    })(),
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly RECONNECT_WINDOW_MS = 30000; // 30 seconds

  constructor(private readonly gameService: GameService) {}

  // Helper to safely target a room across environments/tests
  private room(code: string): { emit: (event: string, ...args: any[]) => void } {
    const anyServer: any = this.server as any;
    if (anyServer) {
      if (typeof anyServer.to === 'function') {
        return anyServer.to(code);
      }
      if (typeof anyServer.in === 'function') {
        return anyServer.in(code);
      }
      if (typeof anyServer.emit === 'function') {
        // Fallback to broadcasting to all (best-effort in tests)
        return { emit: (event: string, ...args: any[]) => anyServer.emit(event, ...args) };
      }
    }
    // No-op fallback for tests
    return { emit: () => {} };
  }

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    const found = this.gameService.findPlayerBySocket(client.id);
    if (found) {
      const { lobby, player } = found;
      // Mark disconnected and broadcast lobby update
  this.gameService.updatePlayerStatus(lobby.code, player.id, 'DISCONNECTED');
  this.room(lobby.code).emit('lobby:update', this.gameService.getLobby(lobby.code));
      
      // Set reconnection window
      const timeout = setTimeout(() => {
        const currentLobby = this.gameService.getLobby(lobby.code);
        if (currentLobby) {
          const currentPlayer = currentLobby.players.find(p => p.id === player.id);
          // Only remove if still disconnected
          if (currentPlayer && currentPlayer.status === 'DISCONNECTED') {
            this.gameService.removePlayer(lobby.code, player.id);
            this.room(lobby.code).emit('lobby:update', this.gameService.getLobby(lobby.code));
          }
        }
        this.reconnectTimers.delete(client.id);
      }, this.RECONNECT_WINDOW_MS);
      
      this.reconnectTimers.set(client.id, timeout);
    }
  }

  @SubscribeMessage('lobby:create')
  async handleCreate(@MessageBody() payload: { nickname: string }, @ConnectedSocket() client: Socket) {
    const { nickname } = payload;
    console.log(`📝 Creating lobby for "${nickname}"`);
    
    if (!nickname || nickname.trim().length === 0) {
      throw new Error('Invalid nickname');
    }
  const lobby = this.gameService.createLobby(nickname, client.id);
  await client.join(lobby.code);
    
    console.log(`✅ Lobby ${lobby.code} created. Host: ${nickname}`);
    // Debug: print room members
  const roomAfterCreate = this.server?.sockets?.adapter?.rooms?.get?.(lobby.code);
    console.log(`👥 Room ${lobby.code} members after create:`, roomAfterCreate ? Array.from(roomAfterCreate.values()) : []);
    
    // Send the host their player info and lobby
    const hostPlayer = lobby.players[0]; // Host is always first player
    client.emit('lobby:joined', { lobby, player: hostPlayer });
    
    // Send lobby update to everyone in room (including creator)
    console.log(`📢 Broadcasting lobby:update to room "${lobby.code}"`);
  this.room(lobby.code).emit('lobby:update', lobby);
  }

  @SubscribeMessage('lobby:join')
  async handleJoin(@MessageBody() payload: { code: string; nickname: string }, @ConnectedSocket() client: Socket) {
    const { code, nickname } = payload;
    
    console.log(`🚪 Player "${nickname}" joining lobby ${code}`);
    
    if (!nickname || nickname.trim().length === 0) {
      throw new Error('Invalid nickname');
    }

    // Restrict late joins during active gameplay
    const existingLobby = this.gameService.getLobby(code);
    if (!existingLobby) {
      throw new Error('Lobby not found');
    }
    if (existingLobby.state !== 'WAITING_FOR_PLAYERS') {
      return client.emit('lobby:error', { message: 'Cannot join while a round is active' });
    }

    // Get lobby and join
  const { lobby, player } = this.gameService.joinLobby(code, nickname, client.id);
  await client.join(code);

    console.log(`✅ Player "${nickname}" joined. Lobby now has ${lobby.players.length} players:`, lobby.players.map(p => p.nickname));
    // Debug: print room members
  const roomAfterJoin = this.server?.sockets?.adapter?.rooms?.get?.(code);
    console.log(`👥 Room ${code} members after join:`, roomAfterJoin ? Array.from(roomAfterJoin.values()) : []);
    
    // Send the joining player their info
    client.emit('lobby:joined', { lobby, player });
    
    // Broadcast updated lobby to ALL clients in the room (including sender)
    console.log(`📢 Broadcasting lobby:update to room "${code}"`);
  this.room(code).emit('lobby:update', lobby);
  }

  @SubscribeMessage('player:ready')
  async handlePlayerReady(@MessageBody() payload: { code: string }, @ConnectedSocket() client: Socket) {
    const { code } = payload;
    const found = this.gameService.findPlayerBySocket(client.id);
    
    if (!found || found.lobby.code !== code) {
      throw new Error('Player not found in lobby');
    }

    this.gameService.updatePlayerStatus(code, found.player.id, 'READY');
  this.room(code).emit('lobby:update', this.gameService.getLobby(code));
  }

  @SubscribeMessage('game:start')
  async handleGameStart(@MessageBody() payload: { code: string }, @ConnectedSocket() client: Socket) {
    const { code } = payload;
    const lobby = this.gameService.getLobby(code);
    if (!lobby) {
      throw new Error('Lobby not found');
    }

    // Verify requester is host
    const hostPlayer = lobby.players.find(p => p.id === 1 && p.socketId === client.id);
    if (!hostPlayer) {
      throw new Error('Only host can start game');
    }

    // Check minimum players (2+)
    const activePlayers = lobby.players.filter(p => p.status !== 'DISCONNECTED');
    if (activePlayers.length < 2) {
      throw new Error('Not enough players');
    }

    // Require all active players to be READY before game start
    const allReady = activePlayers.every(p => p.status === 'READY');
    if (!allReady) {
      throw new Error('All players must be ready');
    }

    try {
      const updatedLobby = this.gameService.startRound(code, 15, 90, (nextLobby) => {
        // on reveal (timeout or completed) -> broadcast reveal and lobby update
        this.room(code).emit('round:reveal', {
          submissions: nextLobby.currentRound?.submissions,
        });
        this.room(code).emit('lobby:update', nextLobby);

        // start voting phase (30s) after reveal as a fallback for timeout path
        try {
          const votingLobby = this.gameService.startVoting(code, 30, ({ winnerId, lobby: finalLobby }) => {
            this.room(code).emit('result:winner', { winnerId, players: finalLobby.players });
            this.room(code).emit('lobby:update', finalLobby);
          });
          // broadcast lobby update immediately to reflect VOTING stage
          this.room(code).emit('lobby:update', votingLobby);
        } catch (e) {
          // ignore if already started via allSubmitted path
        }
      });

      // send each player their prompt + word pool privately
      for (const player of updatedLobby.players) {
        if (player.socketId) {
          this.server.to(player.socketId).emit('round:begin', {
            prompt: updatedLobby.currentRound?.prompt,
            words: player.words,
            timeLimit: updatedLobby.currentRound?.submissionTime ?? 90,
            roundNumber: updatedLobby.roundNumber,
          });
        }
      }

      // broadcast game start and lobby state
  this.room(code).emit('game:start', updatedLobby);
  this.room(code).emit('lobby:update', updatedLobby);
    } catch (err: any) {
      client.emit('lobby:error', { message: err.message });
    }
  }

  @SubscribeMessage('round:submit')
  async handleSubmit(
    @MessageBody() payload: { lobbyCode: string; playerId: number; answer: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    const { lobbyCode, playerId, answer } = payload;
    // verify socket belongs to player
    const found = this.gameService.findPlayerBySocket(client.id);
    if (!found) return client.emit('lobby:error', { message: 'Player not found for socket' });
    if (found.player.id !== playerId || found.lobby.code !== lobbyCode) {
      return client.emit('lobby:error', { message: 'Socket/player mismatch' });
    }

    try {
      const { lobby, allSubmitted } = this.gameService.submitAnswer(lobbyCode, playerId, answer);
      // ack
      client.emit('round:submitAck', { ok: true });
      // broadcast state
  this.room(lobbyCode).emit('lobby:update', lobby);

      if (allSubmitted) {
        // reveal submissions to everyone
        this.room(lobbyCode).emit('round:reveal', {
          submissions: lobby.currentRound?.submissions,
        });
        // start voting phase (30s) after reveal
        try {
          const votingLobby = this.gameService.startVoting(lobbyCode, 30, ({ winnerId, lobby: updated }) => {
            // broadcast result and updated lobby
            this.room(lobbyCode).emit('result:winner', { winnerId, players: updated.players });
            this.room(lobbyCode).emit('lobby:update', updated);
          });
          // immediately reflect the VOTING stage change
          this.room(lobbyCode).emit('lobby:update', votingLobby);
        } catch (e: any) {
          // ignore
        }
      }
    } catch (err: any) {
      client.emit('round:submitAck', { ok: false, message: err.message });
    }
  }

  @SubscribeMessage('round:vote')
  async handleVote(
    @MessageBody() payload: { lobbyCode: string; voterId: number; submissionId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { lobbyCode, voterId, submissionId } = payload;
    try {
      const res = this.gameService.submitVote(lobbyCode, voterId, submissionId);
      client.emit('round:voteAck', { ok: true });
      this.room(lobbyCode).emit('lobby:update', res.lobby);
      if (res.allVoted) {
        const winnerId = res.winnerId;
        this.room(lobbyCode).emit('result:winner', { winnerId, players: res.lobby.players });
        this.room(lobbyCode).emit('lobby:update', res.lobby);

        // Auto-start next round after short delay unless game ended
        if (res.lobby.state !== 'GAME_END') {
          setTimeout(() => {
            try {
              const nextLobby = this.gameService.startRound(lobbyCode, 15, 90, (nextL) => {
                this.room(lobbyCode).emit('round:reveal', {
                  submissions: nextL.currentRound?.submissions,
                });
                this.room(lobbyCode).emit('lobby:update', nextL);
                // Begin voting after reveal timeout as fallback
                try {
                  const vl = this.gameService.startVoting(lobbyCode, 30, ({ winnerId, lobby: finalLobby }) => {
                    this.room(lobbyCode).emit('result:winner', { winnerId, players: finalLobby.players });
                    this.room(lobbyCode).emit('lobby:update', finalLobby);
                  });
                  this.room(lobbyCode).emit('lobby:update', vl);
                } catch {}
              });
              // send round begin privately with word pools
              for (const player of nextLobby.players) {
                if (player.socketId) {
                  this.server.to(player.socketId).emit('round:begin', {
                    prompt: nextLobby.currentRound?.prompt,
                    words: player.words,
                    timeLimit: nextLobby.currentRound?.submissionTime ?? 90,
                    roundNumber: nextLobby.roundNumber,
                  });
                }
              }
              this.room(lobbyCode).emit('game:start', nextLobby);
              this.room(lobbyCode).emit('lobby:update', nextLobby);
            } catch {}
          }, 5000);
        }
      }
    } catch (err: any) {
      client.emit('round:voteAck', { ok: false, message: err.message });
    }
  }

  // Backwards-compatible aliases for unit tests / direct callers.
  // These helpers accept either (client, payload) or (payload, client).
  lobbyCreate(arg1: Socket | any, arg2?: any) {
    let client: Socket | undefined;
    let payload: any;
    if ((arg1 as Socket).id) {
      client = arg1 as Socket;
      payload = arg2;
    } else {
      payload = arg1;
      client = arg2 as Socket;
    }
    // normalize older tests that pass hostNickname
    if (payload && payload.hostNickname && !payload.nickname) {
      payload.nickname = payload.hostNickname;
    }
    return this.handleCreate(payload || {}, client as Socket);
  }

  lobbyJoin(arg1: Socket | any, arg2?: any) {
    let client: Socket | undefined;
    let payload: any;
    if ((arg1 as Socket).id) {
      client = arg1 as Socket;
      payload = arg2;
    } else {
      payload = arg1;
      client = arg2 as Socket;
    }
    return this.handleJoin(payload || {}, client as Socket);
  }

  gameStart(arg1: Socket | any, arg2?: any) {
    // If called with just a Socket, infer lobby code from socket -> player -> lobby
    if ((arg1 as Socket).id && !arg2) {
      const client = arg1 as Socket;
      const info = this.gameService.findPlayerBySocket(client.id);
      const code = info?.lobby.code;
      if (!code) throw new Error('Lobby code not found for socket');
      return this.handleGameStart({ code }, client);
    }
    // otherwise normalize arguments
    let client: Socket | undefined;
    let payload: any;
    if ((arg1 as Socket).id) {
      client = arg1 as Socket;
      payload = arg2;
    } else {
      payload = arg1;
      client = arg2 as Socket;
    }
    return this.handleGameStart(payload || {}, client as Socket);
  }

  roundSubmit(arg1: Socket | any, arg2?: any) {
    let client: Socket | undefined;
    let data: any;
    if ((arg1 as Socket).id) {
      client = arg1 as Socket;
      data = arg2;
    } else {
      data = arg1;
      client = arg2 as Socket;
    }

    // If data looks like { wordIds, roundNumber } map to internal payload
    if (data && data.wordIds) {
      const info = this.gameService.findPlayerBySocket(client!.id);
      const lobbyCode = info?.lobby.code;
      const playerId = info?.player.id;
      if (!lobbyCode || typeof playerId === 'undefined') {
        throw new Error('Unable to determine lobby or player from socket');
      }

      // Get player and verify words against their pool
      const player = info.lobby.players.find(p => p.id === playerId);
      if (!player) {
        throw new Error('Player not found');
      }
      
      // Validate all words are from player's pool
      const valid = data.wordIds.every((w: string) => player.words.includes(w));
      if (!valid) {
        throw new Error('Invalid word submission');
      }

      // Check submission time limit
      const lobby = this.gameService.getLobby(lobbyCode);
      if (lobby?.currentRound?.submissionTime && 
          Date.now() > lobby.currentRound.submissionTime * 1000) {
        throw new Error('Submission time expired');
      }

      const payload = { lobbyCode, playerId, answer: data.wordIds };
      return this.handleSubmit(payload, client as Socket);
    }

    return this.handleSubmit(data || {}, client as Socket);
  }

  roundVote(arg1: Socket | any, arg2?: any) {
    let client: Socket | undefined;
    let data: any;
    if ((arg1 as Socket).id) {
      client = arg1 as Socket;
      data = arg2;
    } else {
      data = arg1;
      client = arg2 as Socket;
    }

    // If data looks like { submissionId, roundNumber } map to internal payload
    if (data && typeof data.submissionId !== 'undefined') {
      const info = this.gameService.findPlayerBySocket(client!.id);
      const lobbyCode = info?.lobby.code;
      const voterId = info?.player.id;
      if (!lobbyCode || typeof voterId === 'undefined') {
        throw new Error('Unable to determine lobby or voter from socket');
      }

      // Check for self-voting
      if (data.submissionId === voterId) {
        throw new Error('Cannot vote for your own submission');
      }

      // Check if voting is allowed (time not expired)
      const lobby = this.gameService.getLobby(lobbyCode);
      if (lobby?.currentRound?.voteTime && Date.now() > lobby.currentRound.voteTime * 1000) {
        throw new Error('Voting time expired');
      }

      const payload = { lobbyCode, voterId, submissionId: data.submissionId };
      return this.handleVote(payload, client as Socket);
    }

    return this.handleVote(data || {}, client as Socket);
  }
}