import { Test, TestingModule } from '@nestjs/testing';
import { GameService } from './game.service';
import { LobbyService } from './services/lobby.service';

describe('GameService (judge mode)', () => {
  let service: GameService;
  let lobbyService: LobbyService;

  beforeEach(async () => {
    // Ensure judge mode and a low win threshold for quick assertions
    process.env.VOTE_MODE = 'judge';
    process.env.WIN_THRESHOLD = '1';

    const module: TestingModule = await Test.createTestingModule({
      providers: [GameService, LobbyService],
    }).compile();

    service = module.get<GameService>(GameService);
    lobbyService = module.get<LobbyService>(LobbyService);
  });

  afterEach(() => {
    delete process.env.VOTE_MODE;
    delete process.env.WIN_THRESHOLD;
  });

  it('prevents judge from submitting and voting; allows finalize by judge pick', () => {
    const lobby = service.createLobby('Host', 's1');
  const { player: p2 } = service.joinLobby(lobby.code, 'P2', 's2');

    // Start round and set judge to host (index 0)
    lobby.judgeIndex = 0;
    const updated = service.startRound(lobby.code, 3, 10);

    const host = updated.players.find(p => p.id === 1)!;
    const player2 = updated.players.find(p => p.id === p2.id)!;

    // Judge cannot submit
    expect(() => service.submitAnswer(lobby.code, host.id, [host.words[0]])).toThrow('Judge cannot submit');

    // Non-judge can submit
    expect(() => service.submitAnswer(lobby.code, player2.id, [player2.words[0]])).not.toThrow();

    // Move to VOTING stage explicitly (simulate reveal done)
    if (updated.currentRound) {
      updated.currentRound.stage = 'VOTING';
    }

    // Voting disabled in judge mode
    expect(() => service.submitVote(lobby.code, player2.id, player2.id)).toThrow('Voting disabled in judge mode');

    // Judge picks a winner directly
    const fin = service.finalizeWinner(lobby.code, player2.id);
    expect(fin.winnerId).toBe(player2.id);
    const winner = fin.lobby.players.find(p => p.id === player2.id)!;
    expect(winner.score).toBeGreaterThanOrEqual(1);
    // With WIN_THRESHOLD=1, game should end
    expect(fin.lobby.state).toBe('GAME_END');
  });
});
