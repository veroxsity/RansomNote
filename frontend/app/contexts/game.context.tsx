'use client';

import { createContext } from 'react';
import { Lobby, Player, Round } from '../../../shared/types/game';

export interface GameContextValue {
  lobby: Lobby | null;
  currentPlayer: Player | null;
  round: Round | null;
  error: string | null;
  isLoading: boolean;
  hasSubmitted: boolean;
  hasVoted: boolean;
  lastWinnerId?: number | null;
  isConnected?: boolean;
  // actions
  createLobby: (nickname: string) => void;
  joinLobby: (code: string, nickname: string) => void;
  startGame: () => void;
  setReady: () => void;
  submitAnswer: (answer: string[]) => void;
  submitVote: (submissionId: number) => void;
}

export const GameContext = createContext<GameContextValue | null>(null);
