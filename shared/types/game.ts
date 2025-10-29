export type GameState = 'LOBBY_CREATED' | 'WAITING_FOR_PLAYERS' | 'IN_PROGRESS' | 'ROUND_ACTIVE' | 'VOTING' | 'ROUND_END' | 'GAME_END';
export type LobbyState = GameState;

export interface Player {
  id: number
  nickname: string
  score: number
  status: 'JOINED' | 'READY' | 'DISCONNECTED'
  words: string[]
  socketId?: string
}

export interface Lobby {
  code: string
  state: LobbyState
  players: Player[]
  judgeIndex: number | null
  roundNumber: number
  currentRound?: Round
}

export interface Round {
  prompt: string;
  submissions: Record<number, string[]>;  // playerID → ordered word IDs
  votes: Record<number, number>;         // voterID → submissionID
  stage: 'ANSWERING' | 'VOTING' | 'REVEALING' | 'COMPLETE';
  timeLimit: number;
  submissionTime?: number;
  voteTime?: number;
  judgeId?: number | null;
}

// Socket event payloads
export interface CreateLobbyPayload {
  hostNickname: string;
}

export interface JoinLobbyPayload {
  code: string;
  nickname: string;
}

export interface SubmitAnswerPayload {
  wordIds: string[];
  roundNumber: number;
}

export interface VotePayload {
  submissionId: number;
  roundNumber: number;
}

// Socket event responses
export interface LobbyUpdateResponse {
  lobby: Lobby;
  round?: Round;
}

export interface RoundBeginResponse {
  prompt: string;
  words: string[];
  timeLimit: number;
}
