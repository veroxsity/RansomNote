export type LobbyState = 'WAITING' | 'IN_PROGRESS' | 'ENDED';

export interface Player {
  id: number;
  nickname: string;
  score: number;
  status: 'JOINED' | 'READY' | 'DISCONNECTED';
  words: string[];
  socketId?: string;
}

export interface Lobby {
  code: string;
  state: LobbyState;
  players: Player[];
  judgeIndex: number | null;
  roundNumber: number;
  currentRound?: Round;
}

export interface Round {
  prompt: string;
  submissions: Record<number, string[]>;  // playerID → ordered word IDs
  votes: Record<number, number>;          // voterID → submissionID
  stage: 'ANSWERING' | 'VOTING' | 'REVEALING' | 'COMPLETE';
  submissionTime?: number;
  voteTime?: number;
  judgeId?: number | null;
}