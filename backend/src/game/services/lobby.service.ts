import { Injectable } from '@nestjs/common';
import { Lobby, Player, Round, LobbyState } from '../../shared/types/game';

@Injectable()
export class LobbyService {
  private lobbies: Map<string, Lobby> = new Map();

  createLobby(hostPlayer: Player): Lobby {
    const lobby: Lobby = {
      code: this.generateLobbyCode(),
      state: 'WAITING',
      players: [hostPlayer],
      judgeIndex: null,
      roundNumber: 0,
    };

    this.lobbies.set(lobby.code, lobby);
    return lobby;
  }

  getLobby(code: string): Lobby | undefined {
    return this.lobbies.get(code);
  }

  joinLobby(code: string, nickname: string, socketId?: string): Player {
    const lobby = this.lobbies.get(code);
    if (!lobby) {
      throw new Error('Lobby not found');
    }

    if (lobby.players.find((p) => p.nickname === nickname)) {
      throw new Error('Nickname already taken in lobby');
    }

    if (lobby.players.length >= 8) {
      throw new Error('Lobby is full');
    }

    const nextId = lobby.players.length > 0 ? Math.max(...lobby.players.map((p) => p.id)) + 1 : 1;
    const player: Player = {
      id: nextId,
      nickname,
      score: 0,
      status: 'JOINED',
      words: [],
      socketId,
    };

    lobby.players.push(player);
    return player;
  }

  removePlayer(lobbyCode: string, playerId: number) {
    const lobby = this.lobbies.get(lobbyCode);
    if (!lobby) return;

    lobby.players = lobby.players.filter((p) => p.id !== playerId);

    if (lobby.players.length === 0) {
      this.lobbies.delete(lobbyCode);
    }
  }

  findPlayerBySocket(socketId: string): { lobby: Lobby; player: Player } | undefined {
    for (const lobby of this.lobbies.values()) {
      const player = lobby.players.find((p) => p.socketId === socketId);
      if (player) return { lobby, player };
    }
    return undefined;
  }

  updatePlayerStatus(lobbyCode: string, playerId: number, status: Player['status']) {
    const lobby = this.lobbies.get(lobbyCode);
    if (!lobby) return;
    const player = lobby.players.find((p) => p.id === playerId);
    if (player) player.status = status;
  }

  startGame(lobbyCode: string): void {
    const lobby = this.lobbies.get(lobbyCode);
    if (!lobby) throw new Error('Lobby not found');
    
    if (lobby.players.length < 3) {
      throw new Error('Not enough players to start game');
    }

    lobby.state = 'IN_PROGRESS';
    lobby.roundNumber = 1;
    lobby.judgeIndex = 0; // First player is initial judge
    
    // Reset scores
    lobby.players.forEach(player => {
      player.score = 0;
      player.status = 'READY';
    });
  }

  startRound(lobbyCode: string): Round {
    const lobby = this.lobbies.get(lobbyCode);
    if (!lobby) throw new Error('Lobby not found');
    if (lobby.state !== 'IN_PROGRESS') throw new Error('Game not in progress');

    const round: Round = {
      prompt: this.getRandomPrompt(),
      submissions: {},
      votes: {},
      stage: 'ANSWERING',
      timeLimit: 60, // 60 seconds for answering
      judgeId: lobby.judgeIndex !== null ? lobby.players[lobby.judgeIndex].id : null
    };

    lobby.currentRound = round;
    // Update the lobby state
    lobby.state = 'ROUND_ACTIVE';

    // Assign random words to each player (except judge)
    lobby.players.forEach(player => {
      if (player.id !== round.judgeId) {
        player.words = this.getRandomWords(10); // Give each player 10 random words
      }
    });

    return round;
  }

  submitAnswer(lobbyCode: string, playerId: number, wordIds: string[]): void {
    const lobby = this.lobbies.get(lobbyCode);
    if (!lobby?.currentRound) throw new Error('No active round');
    if (playerId === lobby.currentRound.judgeId) throw new Error('Judge cannot submit answer');
    
    const player = lobby.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // Validate all submitted words are from player's pool
    if (!wordIds.every(id => player.words.includes(id))) {
      throw new Error('Invalid word submission');
    }

    lobby.currentRound.submissions[playerId] = wordIds;

    // Check if all players have submitted
    const expectedSubmissions = lobby.players.length - 1; // Excluding judge
    if (Object.keys(lobby.currentRound.submissions).length === expectedSubmissions) {
      this.moveToVoting(lobbyCode);
    }
  }

  submitVote(lobbyCode: string, voterId: number, submissionId: number): void {
    const lobby = this.lobbies.get(lobbyCode);
    if (!lobby?.currentRound) throw new Error('No active round');
    if (lobby.currentRound.stage !== 'VOTING') throw new Error('Not in voting stage');
    if (voterId === lobby.currentRound.judgeId) throw new Error('Judge cannot vote');
    if (voterId === submissionId) throw new Error('Cannot vote for own submission');

    lobby.currentRound.votes[voterId] = submissionId;

    // Check if all non-judge players have voted
    const expectedVotes = lobby.players.length - 2; // Excluding judge and submitter
    if (Object.keys(lobby.currentRound.votes).length === expectedVotes) {
      this.moveToRevealing(lobbyCode);
    }
  }

  endRound(lobbyCode: string): void {
    const lobby = this.lobbies.get(lobbyCode);
    if (!lobby?.currentRound) throw new Error('No active round');

    // Calculate scores based on votes
    this.calculateScores(lobby);

    // Check win condition (first to 5 points)
    const winner = lobby.players.find(p => p.score >= 5);
    if (winner) {
      lobby.state = 'GAME_END';
    } else {
      // Rotate judge
      lobby.judgeIndex = lobby.judgeIndex !== null ? (lobby.judgeIndex + 1) % lobby.players.length : 0;
      lobby.roundNumber++;
      lobby.state = 'IN_PROGRESS';
    }
  }

  private moveToVoting(lobbyCode: string): void {
    const lobby = this.lobbies.get(lobbyCode);
    if (!lobby?.currentRound) return;
    
    lobby.currentRound.stage = 'VOTING';
    lobby.state = 'VOTING';
    lobby.currentRound.voteTime = 30; // 30 seconds for voting
  }

  private moveToRevealing(lobbyCode: string): void {
    const lobby = this.lobbies.get(lobbyCode);
    if (!lobby?.currentRound) return;
    
    lobby.currentRound.stage = 'REVEALING';
    lobby.state = 'ROUND_END' as LobbyState;
  }

  private calculateScores(lobby: Lobby): void {
    if (!lobby.currentRound) return;

    const voteCount: Record<number, number> = {};
    Object.values(lobby.currentRound.votes).forEach(submissionId => {
      voteCount[submissionId] = (voteCount[submissionId] || 0) + 1;
    });

    // Award points
    Object.entries(voteCount).forEach(([submissionId, votes]) => {
      const player = lobby.players.find(p => p.id === Number(submissionId));
      if (player) {
        player.score += votes;
      }
    });
  }

  private getRandomPrompt(): string {
    const prompts = [
      'Explain why you\'re late to work',
      'Write a love letter to your arch-nemesis',
      'Create an excuse for missing a deadline',
      'Compose a message to aliens',
      'Write a complaint to customer service'
    ];
    return prompts[Math.floor(Math.random() * prompts.length)];
  }

  private getRandomWords(count: number): string[] {
    const wordPool = [
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'I',
      'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
      'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she'
    ];
    const words: string[] = [];
    for (let i = 0; i < count; i++) {
      words.push(wordPool[Math.floor(Math.random() * wordPool.length)]);
    }
    return words;
  }

  private generateLobbyCode(): string {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  }
}