import { Test, TestingModule } from '@nestjs/testing';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { LobbyService } from './services/lobby.service';
import { Socket } from 'socket.io';
import { Player } from '../shared/types/game';

describe('GameGateway', () => {
  let gateway: GameGateway;
  let gameService: GameService;
  let lobbyService: LobbyService;

  // Mock socket for testing
  const mockSocket: Partial<Socket> = {
    id: 'test-socket-id',
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
    to: jest.fn().mockReturnThis(),
    disconnect: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameGateway,
        GameService,
        LobbyService,
      ],
    }).compile();

    gateway = module.get<GameGateway>(GameGateway);
    gameService = module.get<GameService>(GameService);
    lobbyService = module.get<LobbyService>(LobbyService);
    // Provide a mock server to avoid undefined this.server during tests
    const mockServer: any = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };
    (gateway as any).server = mockServer;
  });

  describe('handleConnection', () => {
    it('should handle new socket connections', () => {
      gateway.handleConnection(mockSocket as Socket);
      // Socket should be stored and ready for use
      expect(mockSocket.id).toBeDefined();
    });
  });

  describe('handleDisconnect', () => {
    it('should handle socket disconnections', () => {
      const player: Player = {
        id: 1,
        nickname: 'TestPlayer',
        score: 0,
        status: 'JOINED',
        words: [],
        socketId: mockSocket.id,
      };

      // Create a lobby and add player
      const lobby = lobbyService.createLobby(player);
      
      // Simulate disconnect
      gateway.handleDisconnect(mockSocket as Socket);

      // Player should be marked as disconnected
      const updatedPlayer = lobbyService.getLobby(lobby.code)?.players.find(p => p.id === 1);
      expect(updatedPlayer?.status).toBe('DISCONNECTED');
    });
  });

  describe('lobbyCreate', () => {
    it('should create a new lobby and join socket to room', async () => {
      const createLobbyDto = { nickname: 'Host' };
      
      await gateway.lobbyCreate(mockSocket as Socket, createLobbyDto);

      // Socket should join the lobby room
      expect(mockSocket.join).toHaveBeenCalled();
      
      // Server should broadcast lobby update to room
      expect((gateway as any).server.to).toHaveBeenCalled();
      expect((gateway as any).server.emit).toHaveBeenCalledWith('lobby:update', expect.any(Object));
    });

    it('should reject invalid nicknames', async () => {
      const createLobbyDto = { nickname: '' };
      
      await expect(gateway.lobbyCreate(mockSocket as Socket, createLobbyDto))
        .rejects.toThrow('Invalid nickname');
    });
  });

  describe('lobbyJoin', () => {
    let hostPlayer: Player;
    let lobbyCode: string;

    beforeEach(() => {
      hostPlayer = {
        id: 1,
        nickname: 'Host',
        score: 0,
        status: 'JOINED',
        words: [],
        socketId: 'host-socket',
      };
      const lobby = lobbyService.createLobby(hostPlayer);
      lobbyCode = lobby.code;
    });

    it('should allow players to join existing lobbies', async () => {
      const joinLobbyDto = { code: lobbyCode, nickname: 'Player2' };
      
      await gateway.lobbyJoin(mockSocket as Socket, joinLobbyDto);

      // Socket should join the lobby room
      expect(mockSocket.join).toHaveBeenCalledWith(lobbyCode);
      // Server should broadcast lobby update to room
      expect((gateway as any).server.to).toHaveBeenCalledWith(lobbyCode);
      expect((gateway as any).server.emit).toHaveBeenCalledWith('lobby:update', expect.any(Object));
    });

    it('should reject joining non-existent lobbies', async () => {
      const joinLobbyDto = { code: 'INVALID', nickname: 'Player' };
      
      await expect(gateway.lobbyJoin(mockSocket as Socket, joinLobbyDto))
        .rejects.toThrow('Lobby not found');
    });
  });

  describe('gameStart', () => {
    let hostSocket: Partial<Socket>;
    let lobbyCode: string;

    beforeEach(() => {
      hostSocket = { ...mockSocket, id: 'host-socket' };
      const hostPlayer: Player = {
        id: 1,
        nickname: 'Host',
        score: 0,
        status: 'READY',
        words: [],
        socketId: hostSocket.id,
      };
      const lobby = lobbyService.createLobby(hostPlayer);
      lobbyCode = lobby.code;

      // Add enough players to start
      for (let i = 2; i <= 3; i++) {
        lobbyService.joinLobby(lobbyCode, `Player${i}`, `socket-${i}`);
        lobbyService.updatePlayerStatus(lobbyCode, i, 'READY');
      }
    });

    it('should start the game when host requests', async () => {
      await gateway.gameStart(hostSocket as Socket, { code: lobbyCode });

      // Server should broadcast game start and updates
      expect((gateway as any).server.to).toHaveBeenCalledWith(lobbyCode);
      expect((gateway as any).server.emit).toHaveBeenCalledWith('game:start', expect.any(Object));
      expect((gateway as any).server.emit).toHaveBeenCalledWith('lobby:update', expect.any(Object));
    });

    it('should reject start from non-host players', async () => {
      const playerSocket = { ...mockSocket, id: 'socket-2' };
      
      await expect(gateway.gameStart(playerSocket as Socket))
        .rejects.toThrow('Only host can start game');
    });

    it('should require minimum players', async () => {
      // Remove a player
      lobbyService.removePlayer(lobbyCode, 3);
      
      await expect(gateway.gameStart(hostSocket as Socket))
        .rejects.toThrow('Not enough players');
    });

    it('should require all players to be ready', async () => {
      // Set a player to not ready
      lobbyService.updatePlayerStatus(lobbyCode, 2, 'JOINED');
      
      await expect(gateway.gameStart(hostSocket as Socket))
        .rejects.toThrow('All players must be ready');
    });
  });

  describe('roundSubmit', () => {
    let playerSocket: Partial<Socket>;
    let lobbyCode: string;
    let playerId: number;

    beforeEach(() => {
      // Setup game with players
      const hostPlayer: Player = {
        id: 1,
        nickname: 'Host',
        score: 0,
        status: 'READY',
        words: ['word1', 'word2', 'word3'],
        socketId: 'host-socket',
      };
      const lobby = lobbyService.createLobby(hostPlayer);
      lobbyCode = lobby.code;

      playerSocket = { ...mockSocket, id: 'player-socket' };
      const player = lobbyService.joinLobby(lobbyCode, 'Player2', playerSocket.id!);
      playerId = player.id;

      lobbyService.joinLobby(lobbyCode, 'Player3', 'socket-3');
      
      // Start round for lobby with assigned words
      const updatedLobby = gameService.startRound(lobby.code);
      updatedLobby.players.forEach(p => {
        p.words = ['word1', 'word2', 'word3']; // Ensure each player has valid words
      });
    });

    it('should accept valid submissions', async () => {
      const lobby = gameService.getLobby(lobbyCode)!;
      const player = lobby.players.find(p => p.socketId === playerSocket.id);
      const playerWords = player?.words || [];

      // Set the submission time to future
      if (lobby.currentRound) {
        lobby.currentRound.submissionTime = Date.now() / 1000 + 60; // 1 minute from now
      }

      const submission = {
        wordIds: playerWords.slice(0, 2),
        roundNumber: 1,
      };

      await gateway.roundSubmit(playerSocket as Socket, submission);

      // Server should broadcast update to room
      expect((gateway as any).server.to).toHaveBeenCalledWith(lobbyCode);
      expect((gateway as any).server.emit).toHaveBeenCalledWith('lobby:update', expect.any(Object));
    });

    it('should reject invalid words', async () => {
      const lobby = gameService.getLobby(lobbyCode)!;
      const player = lobby.players.find(p => p.socketId === playerSocket.id)!;
      const validWords = player.words;
      
      const submission = {
        wordIds: ['totally-invalid-word'],
        roundNumber: 1,
      };

      await expect(async () => {
        await gateway.roundSubmit(playerSocket as Socket, submission);
      }).rejects.toThrow('Invalid word submission');
    });

    it('should reject submissions after time limit', async () => {
      // Set submission time to past
      const lobby = gameService.getLobby(lobbyCode)!;
      if (lobby.currentRound) {
        lobby.currentRound.submissionTime = Date.now() / 1000 - 60; // 1 minute ago
      }

      const submission = {
        wordIds: ['word1'], // Use any word since we're testing timing
        roundNumber: 1,
      };

      await expect(async () => {
        await gateway.roundSubmit(playerSocket as Socket, submission);
      }).rejects.toThrow('Submission time expired');
    });
  });

  describe('roundVote', () => {
    let voterSocket: Partial<Socket>;
    let lobbyCode: string;
    let voterId: number;

    beforeEach(() => {
      // Setup game with submissions
      const hostPlayer: Player = {
        id: 1,
        nickname: 'Host',
        score: 0,
        status: 'READY',
        words: [],
        socketId: 'host-socket',
      };
      const lobby = lobbyService.createLobby(hostPlayer);
      lobbyCode = lobby.code;

      // Add voter
      voterSocket = { ...mockSocket, id: 'voter-socket' };
      const voter = lobbyService.joinLobby(lobbyCode, 'Voter', voterSocket.id!);
      voterId = voter.id;

      // Add third player
      lobbyService.joinLobby(lobbyCode, 'Player3', 'socket-3');

      // Start round for lobby
      const updatedLobby = gameService.startRound(lobby.code);

      // Add submissions to current round
      if (updatedLobby.currentRound) {
        updatedLobby.currentRound.stage = 'VOTING';
        // Ensure all players have valid words
        updatedLobby.players.forEach(p => {
          p.words = ['word1', 'word2', 'word3'];
        });
        // Add valid submissions for each player
        updatedLobby.currentRound.submissions = {
          1: ['word1'],
          2: ['word2'],
          3: ['word3'],
        };
      }
    });

    it('should accept valid votes', async () => {
      // Submit votes using valid IDs
      const vote = {
        submissionId: 1, // Vote for host's submission
        roundNumber: 1,
      };

      await gateway.roundVote(voterSocket as Socket, vote);

      // Server should broadcast update to room
      expect((gateway as any).server.to).toHaveBeenCalledWith(lobbyCode);
      expect((gateway as any).server.emit).toHaveBeenCalledWith('lobby:update', expect.any(Object));
    });

    it('should reject self-voting', async () => {
      // Get voter's ID from the lobby
      const lobby = gameService.getLobby(lobbyCode)!;
      const voter = lobby.players.find(p => p.socketId === voterSocket.id)!;

      const vote = {
        submissionId: voter.id, // Try to vote for own submission
        roundNumber: 1,
      };

      await expect(async () => {
        await gateway.roundVote(voterSocket as Socket, vote);
      }).rejects.toThrow('Cannot vote for your own submission');
    });

    it('should reject votes after time limit', async () => {
      // Set vote time to past
      const lobby = gameService.getLobby(lobbyCode)!;
      if (lobby.currentRound) {
        lobby.currentRound.voteTime = Date.now() / 1000 - 60; // 1 minute ago
      }

      const vote = {
        submissionId: 1, // Vote for any other submission
        roundNumber: 1,
      };

      await expect(async () => {
        await gateway.roundVote(voterSocket as Socket, vote);
      }).rejects.toThrow('Voting time expired');
    });
  });
});