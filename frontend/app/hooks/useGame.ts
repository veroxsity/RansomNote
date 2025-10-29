import { useCallback, useEffect, useState } from 'react';
import { useSocket } from '../contexts/socket.context';
import { Lobby, Player, Round } from '../../../shared/types/game';

interface GameState {
  lobby: Lobby | null;
  currentPlayer: Player | null;
  round: Round | null;
  error: string | null;
  isLoading: boolean;
}

export const useGame = () => {
  const { socket, isConnected } = useSocket();
  const [state, setState] = useState<GameState>({
    lobby: null,
    currentPlayer: null,
    round: null,
    error: null,
    isLoading: false,
  });

  // Handle lobby updates
  useEffect(() => {
    if (!socket) return;

    socket.on('lobby:update', (lobby: Lobby) => {
      setState(prev => ({ ...prev, lobby }));
    });

    socket.on('round:begin', (data: { prompt: string; words: string[]; timeLimit: number }) => {
      setState(prev => ({
        ...prev,
        round: {
          prompt: data.prompt,
          submissions: {},
          votes: {},
          stage: 'ANSWERING',
          timeLimit: data.timeLimit,
        },
      }));
    });

    socket.on('round:reveal', (data: { submissions: Record<number, string[]> }) => {
      setState(prev => ({
        ...prev,
        round: prev.round ? {
          ...prev.round,
          submissions: data.submissions,
          stage: 'REVEALING',
        } : null,
      }));
    });

    socket.on('lobby:error', (data: { message: string }) => {
      setState(prev => ({ ...prev, error: data.message }));
    });

    return () => {
      socket.off('lobby:update');
      socket.off('round:begin');
      socket.off('round:reveal');
      socket.off('lobby:error');
    };
  }, [socket]);

  // Actions
  const createLobby = useCallback((nickname: string) => {
    if (!socket) return;
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    socket.emit('lobby:create', { nickname }, (response: any) => {
      if (response.error) {
        setState(prev => ({ ...prev, error: response.error, isLoading: false }));
      }
    });
  }, [socket]);

  const joinLobby = useCallback((code: string, nickname: string) => {
    if (!socket) return;
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    socket.emit('lobby:join', { code, nickname }, (response: any) => {
      if (response.error) {
        setState(prev => ({ ...prev, error: response.error, isLoading: false }));
      } else {
        setState(prev => ({
          ...prev,
          currentPlayer: response.player,
          isLoading: false,
        }));
      }
    });
  }, [socket]);

  const startGame = useCallback(() => {
    if (!socket || !state.lobby) return;
    socket.emit('game:start', { code: state.lobby.code });
  }, [socket, state.lobby]);

  const submitAnswer = useCallback((answer: string[]) => {
    if (!socket || !state.lobby || !state.currentPlayer) return;
    socket.emit('round:submit', {
      lobbyCode: state.lobby.code,
      playerId: state.currentPlayer.id,
      answer,
    });
  }, [socket, state.lobby, state.currentPlayer]);

  const submitVote = useCallback((submissionId: number) => {
    if (!socket || !state.lobby || !state.currentPlayer) return;
    socket.emit('round:vote', {
      lobbyCode: state.lobby.code,
      voterId: state.currentPlayer.id,
      submissionId,
    });
  }, [socket, state.lobby, state.currentPlayer]);

  return {
    ...state,
    isConnected,
    createLobby,
    joinLobby,
    startGame,
    submitAnswer,
    submitVote,
  };
};