import { Test, TestingModule } from '@nestjs/testing';
import { GameService } from './game.service';
import { LobbyService } from './services/lobby.service';
import { Round } from '../shared/types/game';

describe('GameService', () => {
  let service: GameService;
  let lobbyService: LobbyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GameService, LobbyService],
    }).compile();

    service = module.get<GameService>(GameService);
    lobbyService = module.get<LobbyService>(LobbyService);
  });

  describe('startRound', () => {
    it('initializes a round and assigns words', () => {
      const lobby = service.createLobby('Host', 'socket-host');
      service.joinLobby(lobby.code, 'P2', 's2');
      service.joinLobby(lobby.code, 'P3', 's3');

      const updated = service.startRound(lobby.code, 5, 10);
      expect(updated).toBeDefined();
      expect(updated.currentRound).toBeDefined();
      const round = updated.currentRound as Round;
      expect(round.prompt).toBeDefined();
      expect(round.stage).toBe('ANSWERING');
      expect(round.submissions).toEqual({});
      expect(round.votes).toEqual({});

      updated.players.forEach((p) => {
        expect(Array.isArray(p.words)).toBe(true);
        expect(p.words.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('submitAnswer', () => {
    it('accepts valid submissions and rejects invalid ones', () => {
      const lobby = service.createLobby('Host', 'socket-host');
      const { player: p2 } = service.joinLobby(lobby.code, 'P2', 's2');
      const { player: p3 } = service.joinLobby(lobby.code, 'P3', 's3');

      service.startRound(lobby.code, 4, 10);
      const updated = service.getLobby(lobby.code)!;

      const p2Words = updated.players.find(p => p.id === p2.id)!.words;
      const valid = p2Words.slice(0, 2);
      const res = service.submitAnswer(lobby.code, p2.id, valid);
      expect(res.allSubmitted).toBe(false);
      expect(updated.currentRound!.submissions[p2.id]).toEqual(valid);

      expect(() => service.submitAnswer(lobby.code, p3.id, ['not-a-word'])).toThrow();
    });

    it('rejects using a word more times than present in player pool', () => {
      const lobby = service.createLobby('Host', 'socket-host');
      const { player: p2 } = service.joinLobby(lobby.code, 'P2', 's2');

      // Start with small pool to control counts
      service.startRound(lobby.code, 3, 10);
      const updated = service.getLobby(lobby.code)!;
      const p2Words = updated.players.find(p => p.id === p2.id)!.words;

      // Find a word in pool; attempt to use it 2x when it may appear once
      const word = p2Words[0];
      const overuse = [word, word];

      // If the word appears only once in pool, this must throw; if it appears twice, try thrice
      const occurrences = p2Words.filter(w => w === word).length;
      if (occurrences === 1) {
        expect(() => service.submitAnswer(lobby.code, p2.id, overuse)).toThrow();
      } else {
        // try 3 times
        expect(() => service.submitAnswer(lobby.code, p2.id, [word, word, word])).toThrow();
      }
    });
  });

  describe('voting and scoring', () => {
    it('accepts votes and determines a winner awarding points', () => {
      const lobby = service.createLobby('Host', 'socket-host');
      const { player: p2 } = service.joinLobby(lobby.code, 'P2', 's2');
      const { player: p3 } = service.joinLobby(lobby.code, 'P3', 's3');

      const roundLobby = service.startRound(lobby.code, 4, 10);
      const host = roundLobby.players.find(p => p.id === 1)!;
      const p2Found = roundLobby.players.find(p => p.id === p2.id)!;
      const p3Found = roundLobby.players.find(p => p.id === p3.id)!;

      // All players must submit answers with their actual words
      service.submitAnswer(lobby.code, p2.id, [p2Found.words[0]]);
      service.submitAnswer(lobby.code, p3.id, [p3Found.words[0]]);
      service.submitAnswer(lobby.code, host.id, [host.words[0]]);

      const votingLobby = service.startVoting(lobby.code, 5);
      expect(votingLobby.currentRound!.stage).toBe('VOTING');

      // Each player votes for someone else's submission
      const v1 = service.submitVote(lobby.code, p2.id, p3.id);
      expect(v1.allVoted).toBe(false);

      const v2 = service.submitVote(lobby.code, p3.id, p2.id);
      expect(v2.allVoted).toBe(false);

      // Host must vote to complete voting
      const v3 = service.submitVote(lobby.code, host.id, p2.id);
      expect(v3.allVoted).toBe(true);
      const winnerId = v3.winnerId;
      expect([p2.id, p3.id]).toContain(winnerId);

      const winner = votingLobby.players.find(pl => pl.id === winnerId)!;
      expect(winner.score).toBeGreaterThanOrEqual(1);
    });
  });
});