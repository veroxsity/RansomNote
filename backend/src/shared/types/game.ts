export type LobbyState = 'WAITING_FOR_PLAYERS' | 'IN_PROGRESS' | 'ROUND_ACTIVE' | 'VOTING' | 'ROUND_END' | 'GAME_END';

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
  submissions: Record<number, string[]>;  // playerID → ordered words
  votes: Record<number, number>;          // voterID → submissionID
  stage: 'ANSWERING' | 'VOTING' | 'REVEALING' | 'COMPLETE';
  submissionTime?: number;
  voteTime?: number;
}