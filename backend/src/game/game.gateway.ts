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
    origin:
      process.env.NODE_ENV === 'production'
        ? 'https://ransomnotes.example.com' // Update with real production domain
        : 'http://localhost:3000',
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(private readonly gameService: GameService) {}

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
      this.server.to(lobby.code).emit('lobby:update', this.gameService.getLobby(lobby.code));
      // Optionally remove player after reconnect window (handled elsewhere)
    }
  }

  @SubscribeMessage('lobby:create')
  async handleCreate(@MessageBody() payload: { nickname: string }, @ConnectedSocket() client: Socket) {
    const { nickname } = payload;
    if (!nickname || nickname.trim().length === 0) {
      throw new Error('Invalid nickname');
    }
    const lobby = this.gameService.createLobby(nickname, client.id);
    client.join(lobby.code);
    // Send lobby update to everyone in room (including creator)
    this.server.to(lobby.code).emit('lobby:update', lobby);
  }

  @SubscribeMessage('lobby:join')
  async handleJoin(@MessageBody() payload: { code: string; nickname: string }, @ConnectedSocket() client: Socket) {
    const { code, nickname } = payload;
    
    if (!nickname || nickname.trim().length === 0) {
      throw new Error('Invalid nickname');
    }

    // Get lobby and join
    const { lobby, player } = this.gameService.joinLobby(code, nickname, client.id);
    client.join(code);

    // Emit updates to all clients in room
    client.emit('lobby:joined', { lobby, player });
    this.server.to(code).emit('lobby:update', lobby);
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

    // Check minimum players (3+)
    const activePlayers = lobby.players.filter(p => p.status !== 'DISCONNECTED');
    if (activePlayers.length < 3) {
      throw new Error('Not enough players');
    }

    // Check all players ready
    const allReady = activePlayers.every(p => p.status === 'READY');
    if (!allReady) {
      throw new Error('All players must be ready');
    }

    try {
      const updatedLobby = this.gameService.startRound(code, 15, 90, (nextLobby) => {
        // on reveal (timeout or completed) -> broadcast reveal and lobby update
        this.server.to(code).emit('round:reveal', {
          submissions: nextLobby.currentRound?.submissions,
        });
        this.server.to(code).emit('lobby:update', nextLobby);
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
      this.server.to(code).emit('game:start', updatedLobby);
      this.server.to(code).emit('lobby:update', updatedLobby);
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
      this.server.to(lobbyCode).emit('lobby:update', lobby);

      if (allSubmitted) {
        // reveal submissions to everyone
        this.server.to(lobbyCode).emit('round:reveal', {
          submissions: lobby.currentRound?.submissions,
        });
        // start voting phase (30s) after reveal
        try {
          this.gameService.startVoting(lobbyCode, 30, ({ winnerId, lobby: updated }) => {
            // broadcast result and updated lobby
            this.server.to(lobbyCode).emit('result:winner', { winnerId, players: updated.players });
            this.server.to(lobbyCode).emit('lobby:update', updated);
          });
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
      this.server.to(lobbyCode).emit('lobby:update', res.lobby);
      if (res.allVoted) {
        const winnerId = res.winnerId;
        this.server.to(lobbyCode).emit('result:winner', { winnerId, players: res.lobby.players });
        this.server.to(lobbyCode).emit('lobby:update', res.lobby);
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