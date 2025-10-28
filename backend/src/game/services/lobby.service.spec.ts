import { Test, TestingModule } from '@nestjs/testing';
import { LobbyService } from './lobby.service';
import { Player } from '../../../src/shared/types/game';

describe('LobbyService', () => {
  let service: LobbyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LobbyService],
    }).compile();

    service = module.get<LobbyService>(LobbyService);
  });

  describe('createLobby', () => {
    it('should create a lobby with a host player', () => {
      const hostPlayer: Player = {
        id: 1,
        nickname: 'Host',
        score: 0,
        status: 'JOINED',
        words: [],
      };

      const lobby = service.createLobby(hostPlayer);
      expect(lobby).toBeDefined();
      expect(lobby.code).toMatch(/^[A-Z0-9]{6}$/);
      expect(lobby.state).toBe('WAITING');
      expect(lobby.players).toHaveLength(1);
      expect(lobby.players[0]).toBe(hostPlayer);
    });

    it('should generate unique lobby codes', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        const lobby = service.createLobby({
          id: i,
          nickname: `Host${i}`,
          score: 0,
          status: 'JOINED',
          words: [],
        });
        expect(codes.has(lobby.code)).toBeFalsy();
        codes.add(lobby.code);
      }
    });
  });

  describe('joinLobby', () => {
    let hostPlayer: Player;
    let lobbyCode: string;

    beforeEach(() => {
      hostPlayer = {
        id: 1,
        nickname: 'Host',
        score: 0,
        status: 'JOINED',
        words: [],
      };
      const lobby = service.createLobby(hostPlayer);
      lobbyCode = lobby.code;
    });

    it('should allow a player to join an existing lobby', () => {
      const player = service.joinLobby(lobbyCode, 'Player2', 'socket2');
      expect(player).toBeDefined();
      expect(player.id).toBe(2);
      expect(player.nickname).toBe('Player2');
      expect(player.socketId).toBe('socket2');

      const lobby = service.getLobby(lobbyCode);
      expect(lobby?.players).toHaveLength(2);
    });

    it('should reject duplicate nicknames', () => {
      expect(() => service.joinLobby(lobbyCode, 'Host', 'socket2')).toThrow('Nickname already taken');
    });

    it('should reject joining non-existent lobby', () => {
      expect(() => service.joinLobby('INVALID', 'Player', 'socket')).toThrow('Lobby not found');
    });

    it('should reject joining full lobby (>8 players)', () => {
      // Add 7 more players (8 total with host)
      for (let i = 2; i <= 8; i++) {
        service.joinLobby(lobbyCode, `Player${i}`, `socket${i}`);
      }

      expect(() => service.joinLobby(lobbyCode, 'TooMany', 'socketX')).toThrow('Lobby is full');
    });
  });

  describe('removePlayer', () => {
    let lobbyCode: string;
    let hostId: number;

    beforeEach(() => {
      const host = {
        id: 1,
        nickname: 'Host',
        score: 0,
        status: 'JOINED',
        words: [],
      };
      const lobby = service.createLobby(host);
      lobbyCode = lobby.code;
      hostId = host.id;

      // Add some players
      service.joinLobby(lobbyCode, 'Player2', 'socket2');
      service.joinLobby(lobbyCode, 'Player3', 'socket3');
    });

    it('should remove a player from the lobby', () => {
      const lobby = service.getLobby(lobbyCode)!;
      expect(lobby.players).toHaveLength(3);

      service.removePlayer(lobbyCode, 2); // Remove Player2
      expect(service.getLobby(lobbyCode)?.players).toHaveLength(2);
    });

    it('should delete empty lobbies', () => {
      service.removePlayer(lobbyCode, hostId);
      service.removePlayer(lobbyCode, 2);
      service.removePlayer(lobbyCode, 3);

      expect(service.getLobby(lobbyCode)).toBeUndefined();
    });

    it('should handle removing non-existent players', () => {
      const lobby = service.getLobby(lobbyCode)!;
      const playerCount = lobby.players.length;
      
      service.removePlayer(lobbyCode, 999);
      expect(service.getLobby(lobbyCode)?.players).toHaveLength(playerCount);
    });
  });

  describe('findPlayerBySocket', () => {
    it('should find player and lobby by socket id', () => {
      const lobby = service.createLobby({
        id: 1,
        nickname: 'Host',
        score: 0,
        status: 'JOINED',
        words: [],
        socketId: 'host-socket',
      });

      service.joinLobby(lobby.code, 'Player2', 'socket2');

      const found = service.findPlayerBySocket('socket2');
      expect(found).toBeDefined();
      expect(found?.player.nickname).toBe('Player2');
      expect(found?.lobby.code).toBe(lobby.code);
    });

    it('should return undefined for unknown socket', () => {
      expect(service.findPlayerBySocket('unknown')).toBeUndefined();
    });
  });

  describe('updatePlayerStatus', () => {
    let lobbyCode: string;
    let playerId: number;

    beforeEach(() => {
      const host = {
        id: 1,
        nickname: 'Host',
        score: 0,
        status: 'JOINED',
        words: [],
      };
      const lobby = service.createLobby(host);
      lobbyCode = lobby.code;

      const player = service.joinLobby(lobbyCode, 'Player2', 'socket2');
      playerId = player.id;
    });

    it('should update player status', () => {
      service.updatePlayerStatus(lobbyCode, playerId, 'READY');
      const lobby = service.getLobby(lobbyCode);
      const player = lobby?.players.find(p => p.id === playerId);
      expect(player?.status).toBe('READY');
    });

    it('should handle invalid lobby/player combinations', () => {
      service.updatePlayerStatus('INVALID', playerId, 'READY');
      service.updatePlayerStatus(lobbyCode, 999, 'READY');
      // Should not throw
    });
  });
});