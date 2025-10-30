import { Injectable } from '@nestjs/common';
import { Lobby, Player, Round, LobbyState } from '../../shared/types/game';

@Injectable()
export class LobbyService {
  private lobbies: Map<string, Lobby> = new Map();

  createLobby(hostPlayer: Player): Lobby {
    const lobby: Lobby = {
      code: this.generateLobbyCode(),
      state: 'WAITING_FOR_PLAYERS',
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

    const maxPlayers = Number(process.env.MAX_PLAYERS) || 8;
    if (lobby.players.length >= maxPlayers) {
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



  private generateLobbyCode(): string {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  }
}