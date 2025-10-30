import { useContext } from 'react';
import { GameContext } from '../contexts/game.context';
import type { GameContextValue } from '../contexts/game.context';

// Updated useGame: consume shared GameContext instead of owning its own state.
export const useGame = (): GameContextValue => {
  const ctx = useContext(GameContext);
  if (ctx) return ctx;
  // Safe fallback during SSR or if provider not yet mounted.
  return {
    lobby: null,
    currentPlayer: null,
    round: null,
    error: null,
    isLoading: false,
    hasSubmitted: false,
    hasVoted: false,
    lastWinnerId: null,
    isConnected: false,
    createLobby: () => {},
    joinLobby: () => {},
    startGame: () => {},
    setReady: () => {},
    submitAnswer: () => {},
    submitVote: () => {},
  };
};