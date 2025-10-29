import { Injectable } from '@nestjs/common';
import { LobbyService } from './services/lobby.service';
import { Lobby, Player } from '../shared/types/game';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class GameService {
  constructor(private readonly lobbyService: LobbyService) {}

  createLobby(hostNickname: string, socketId?: string): Lobby {
    const hostPlayer: Player = {
      id: 1,
      nickname: hostNickname,
      score: 0,
      status: 'JOINED',
      words: [],
      socketId,
    };

    return this.lobbyService.createLobby(hostPlayer);
  }

  private submissionTimers: Map<string, NodeJS.Timeout> = new Map();
  private voteTimers: Map<string, NodeJS.Timeout> = new Map();
  private WIN_THRESHOLD = 5;

  /**
   * Start a new round and optionally register a callback (onReveal) that will be
   * called when submissions are revealed (either because everyone submitted or
   * because the submission timeout expired).
   */
  startRound(
    lobbyCode: string,
    wordPoolSize = 15,
    submissionTime = 90,
    onReveal?: (lobby: Lobby) => void,
  ) {
    const lobby = this.lobbyService.getLobby(lobbyCode);
    if (!lobby) throw new Error('Lobby not found');

    // load prompts/words
    const dataPath = path.join(__dirname, '..', '..', 'data', 'words.json');
    const raw = fs.readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(raw) as { prompts: string[]; words: string[] };

    // pick a random prompt
    const prompt = data.prompts[Math.floor(Math.random() * data.prompts.length)];

    // helper to pick N random words (allow repeats across players)
    const pickWords = (n: number) => {
      const words: string[] = [];
      for (let i = 0; i < n; i++) {
        const w = data.words[Math.floor(Math.random() * data.words.length)];
        words.push(w);
      }
      return words;
    };

    // assign words to players
    lobby.players.forEach((p) => {
      p.words = pickWords(wordPoolSize);
    });

    // initialize round
    const round = {
      prompt,
      submissions: {},
      votes: {},
      stage: 'ANSWERING' as const,
      submissionTime,
    };

    lobby.currentRound = round as any;
    lobby.roundNumber = (lobby.roundNumber || 0) + 1;

    // clear any previous timer
    const prev = this.submissionTimers.get(lobbyCode);
    if (prev) {
      clearTimeout(prev);
      this.submissionTimers.delete(lobbyCode);
    }

    // schedule reveal on timeout
    const timeout = setTimeout(() => {
      const l = this.lobbyService.getLobby(lobbyCode);
      if (!l || !l.currentRound) return;

      // auto-fill missing submissions with empty arrays and set stage to REVEALING
      const activePlayers = l.players.filter((p) => p.status !== 'DISCONNECTED');
      activePlayers.forEach((p) => {
        if (!l.currentRound!.submissions[p.id]) {
          l.currentRound!.submissions[p.id] = [];
        }
      });

      l.currentRound!.stage = 'REVEALING';
      this.submissionTimers.delete(lobbyCode);
      if (onReveal) onReveal(l);
    }, submissionTime * 1000);

    // avoid keeping Node event loop alive during tests / short-lived processes
    if (typeof (timeout as any)?.unref === 'function') {
      (timeout as any).unref();
    }

    this.submissionTimers.set(lobbyCode, timeout);

    return lobby;
  }

  submitAnswer(lobbyCode: string, playerId: number, answer: string[]) {
    const lobby = this.lobbyService.getLobby(lobbyCode);
    if (!lobby) throw new Error('Lobby not found');
    const player = lobby.players.find((p) => p.id === playerId);
    if (!player) throw new Error('Player not in lobby');

    const round = lobby.currentRound;
    if (!round) throw new Error('No active round');
    if (round.stage !== 'ANSWERING') throw new Error('Not accepting answers');

    // validate each word is in player's assigned pool
    const valid = answer.every((w) => player.words.includes(w));
    if (!valid) throw new Error('Invalid submission — uses words not in your pool');

    round.submissions[playerId] = answer;

    // check if all players (non-disconnected) have submitted
    const activePlayers = lobby.players.filter((p) => p.status !== 'DISCONNECTED');
    const allSubmitted = activePlayers.every((p) => round.submissions[p.id]);

    if (allSubmitted) {
      round.stage = 'REVEALING';
      // clear timer
      const t = this.submissionTimers.get(lobbyCode);
      if (t) {
        clearTimeout(t);
        this.submissionTimers.delete(lobbyCode);
      }
    }

    return { lobby, allSubmitted };
  }

  cancelTimersForLobby(lobbyCode: string) {
    const t = this.submissionTimers.get(lobbyCode);
    if (t) {
      clearTimeout(t);
      this.submissionTimers.delete(lobbyCode);
    }
  }

  /** Start the voting stage for a lobby. onComplete is called with the final result. */
  startVoting(lobbyCode: string, voteTime = 30, onComplete?: (result: { winnerId: number | null; lobby: Lobby }) => void) {
    const lobby = this.lobbyService.getLobby(lobbyCode);
    if (!lobby || !lobby.currentRound) throw new Error('Lobby or round not found');

    // set stage to VOTING
    lobby.currentRound.stage = 'VOTING';
    lobby.currentRound.voteTime = voteTime;

    // clear existing vote timer
    const prev = this.voteTimers.get(lobbyCode);
    if (prev) {
      clearTimeout(prev);
      this.voteTimers.delete(lobbyCode);
    }

    const timeout = setTimeout(() => {
      // finalize votes on timeout
      const l = this.lobbyService.getLobby(lobbyCode);
      if (!l || !l.currentRound) return;
      const winnerId = this.finalizeVotes(l);
      if (onComplete) onComplete({ winnerId, lobby: l });
      this.voteTimers.delete(lobbyCode);
    }, voteTime * 1000);
    // avoid keeping Node event loop alive during tests / short-lived processes
    if (typeof (timeout as any)?.unref === 'function') {
      (timeout as any).unref();
    }

    this.voteTimers.set(lobbyCode, timeout);
    return lobby;
  }

  /**
   * Clear all pending timers and release resources. Call at shutdown or in tests
   * to avoid open handle warnings.
   */
  shutdown() {
    for (const [code, t] of Array.from(this.submissionTimers.entries())) {
      try {
        clearTimeout(t);
      } catch (e) {
        // ignore
      }
      this.submissionTimers.delete(code);
    }

    for (const [code, t] of Array.from(this.voteTimers.entries())) {
      try {
        clearTimeout(t);
      } catch (e) {
        // ignore
      }
      this.voteTimers.delete(code);
    }
  }

  submitVote(lobbyCode: string, voterId: number, submissionId: number) {
    const lobby = this.lobbyService.getLobby(lobbyCode);
    if (!lobby || !lobby.currentRound) throw new Error('Lobby or round not found');
    const round = lobby.currentRound;

    if (round.stage !== 'VOTING') throw new Error('Not in voting stage');

    const voter = lobby.players.find((p) => p.id === voterId);
    if (!voter || voter.status === 'DISCONNECTED') throw new Error('Voter not found or disconnected');

    // Can't vote for self
    if (voterId === submissionId) throw new Error('Cannot vote for self');

    round.votes[voterId] = submissionId;

    // check if all active players with submissions have voted
    const hasSubmission = Object.keys(round.submissions)
      .map(Number)
      .filter((id) => round.submissions[id]?.length > 0);
    const eligibleVoters = lobby.players.filter(
      (p) => p.status !== 'DISCONNECTED' && hasSubmission.includes(p.id)
    );
    const allVoted = eligibleVoters.every((p) => typeof round.votes[p.id] !== 'undefined');

    if (allVoted) {
      // clear timer
      const t = this.voteTimers.get(lobbyCode);
      if (t) {
        clearTimeout(t);
        this.voteTimers.delete(lobbyCode);
      }
      const winnerId = this.finalizeVotes(lobby);
      return { lobby, winnerId, allVoted: true };
    }

    return { lobby, winnerId: null, allVoted: false };
  }

  private finalizeVotes(lobby: Lobby): number | null {
    const round = lobby.currentRound!;
    // tally votes: submissionId -> count
    const tally: Record<number, number> = {};
    for (const voterIdStr in round.votes) {
      const submissionId = round.votes[Number(voterIdStr)];
      if (submissionId == null) continue;
      tally[submissionId] = (tally[submissionId] || 0) + 1;
    }

    let winnerId: number | null = null;
    let maxVotes = -1;
    const tied: number[] = [];
    for (const sidStr in tally) {
      const sid = Number(sidStr);
      const c = tally[sid];
      if (c > maxVotes) {
        maxVotes = c;
        winnerId = sid;
        // reset ties
        tied.length = 0;
        tied.push(sid);
      } else if (c === maxVotes) {
        tied.push(sid);
      }
    }

    if (tied.length > 1) {
      // tie-break: pick randomly among tied
      const pick = tied[Math.floor(Math.random() * tied.length)];
      winnerId = pick;
    }

    if (winnerId != null) {
      const winner = lobby.players.find((p) => p.id === winnerId);
      if (winner) {
        winner.score += 1;
      }
    }

    // mark round complete
    round.stage = 'COMPLETE';

    // check win condition
    const someoneWon = lobby.players.find((p) => p.score >= this.WIN_THRESHOLD);
    if (someoneWon) {
      lobby.state = 'ENDED' as const;
    } else {
      // advance judgeIndex if present
      if (lobby.judgeIndex == null) {
        lobby.judgeIndex = null;
      } else {
        lobby.judgeIndex = ((lobby.judgeIndex ?? -1) + 1) % lobby.players.length;
      }
      // keep round history elsewhere if needed; clear currentRound to prepare next round
      // (we keep round data in lobby.currentRound until client acknowledges)
    }

    return winnerId;
  }

  joinLobby(code: string, nickname: string, socketId?: string): { lobby: Lobby; player: Player } {
    const player = this.lobbyService.joinLobby(code, nickname, socketId);
    const lobby = this.lobbyService.getLobby(code)!;
    return { lobby, player };
  }

  getLobby(code: string): Lobby | undefined {
    return this.lobbyService.getLobby(code);
  }

  findPlayerBySocket(socketId: string) {
    return this.lobbyService.findPlayerBySocket(socketId);
  }

  removePlayer(lobbyCode: string, playerId: number) {
    return this.lobbyService.removePlayer(lobbyCode, playerId);
  }

  updatePlayerStatus(lobbyCode: string, playerId: number, status: Player['status']) {
    return this.lobbyService.updatePlayerStatus(lobbyCode, playerId, status);
  }
}