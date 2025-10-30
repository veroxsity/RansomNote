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

    const onLobbyUpdate = (lobby: Lobby) => {
      console.log('🔄 Lobby update received:', lobby);
      setState(prev => ({ ...prev, lobby, isLoading: false }));
    };

    const onLobbyJoined = (data: { lobby: Lobby; player: Player }) => {
      console.log('✅ Lobby joined:', data);
      setState(prev => ({
        ...prev,
        lobby: data.lobby,
        currentPlayer: data.player,
        isLoading: false,
      }));
    };

    const onRoundBegin = (data: { prompt: string; words: string[]; timeLimit: number }) => {
      console.log('🎮 Round begin:', data);
      setState(prev => ({
        ...prev,
        round: {
          prompt: data.prompt,
          submissions: {},
          votes: {},
          stage: 'ANSWERING',
          submissionTime: data.timeLimit,
        },
      }));
    };

    const onRoundReveal = (data: { submissions: Record<number, string[]> }) => {
      console.log('👀 Round reveal:', data);
      setState(prev => ({
        ...prev,
        round: prev.round ? {
          ...prev.round,
          submissions: data.submissions,
          stage: 'REVEALING',
        } : null,
      }));
    };

    const onLobbyError = (data: { message: string }) => {
      console.error('❌ Lobby error:', data.message);
      setState(prev => ({ ...prev, error: data.message, isLoading: false }));
    };

    socket.on('lobby:update', onLobbyUpdate);
    socket.on('lobby:joined', onLobbyJoined);
    socket.on('round:begin', onRoundBegin);
    socket.on('round:reveal', onRoundReveal);
    socket.on('lobby:error', onLobbyError);

    return () => {
      socket.off('lobby:update', onLobbyUpdate);
      socket.off('lobby:joined', onLobbyJoined);
      socket.off('round:begin', onRoundBegin);
      socket.off('round:reveal', onRoundReveal);
      socket.off('lobby:error', onLobbyError);
    };
  }, [socket]);

  // Actions
  const createLobby = useCallback((nickname: string) => {
    if (!socket) return;
    console.log('📝 Creating lobby with nickname:', nickname);
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    socket.emit('lobby:create', { nickname });
  }, [socket]);

  const joinLobby = useCallback((code: string, nickname: string) => {
    if (!socket) return;
    console.log('🚪 Joining lobby:', code, 'with nickname:', nickname);
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    socket.emit('lobby:join', { code, nickname });
  }, [socket]);

  const startGame = useCallback(() => {
    if (!socket || !state.lobby) return;
    socket.emit('game:start', { code: state.lobby.code });
  }, [socket, state.lobby]);

  const setReady = useCallback(() => {
    if (!socket || !state.lobby) return;
    socket.emit('player:ready', { code: state.lobby.code });
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
    setReady,
    submitAnswer,
    submitVote,
  };
};