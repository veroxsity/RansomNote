'use client';

import { FC, PropsWithChildren, useCallback, useEffect, useState } from 'react';
import { GameContext } from './game.context';
import { useSocket } from './socket.context';
import { Lobby, Player, Round } from '../../../shared/types/game';
import toast, { Toaster } from 'react-hot-toast';

interface GameState {
  lobby: Lobby | null;
  currentPlayer: Player | null;
  round: Round | null;
  error: string | null;
  isLoading: boolean;
  hasSubmitted: boolean;
  hasVoted: boolean;
  lastWinnerId?: number | null;
  isJudgeTurn?: boolean;
}

export const GameProvider: FC<PropsWithChildren> = ({ children }) => {
  const { socket, isConnected } = useSocket();
  const [state, setState] = useState<GameState>({
    lobby: null,
    currentPlayer: null,
    round: null,
    error: null,
    isLoading: false,
    hasSubmitted: false,
    hasVoted: false,
    lastWinnerId: null,
    isJudgeTurn: false,
  });

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const onLobbyUpdate = (lobby: Lobby) => {
      setState(prev => ({
        ...prev,
        lobby,
        // Sync round from server if present
        round: lobby.currentRound ?? prev.round,
        // Also refresh currentPlayer reference from updated lobby (keeps words in sync)
        currentPlayer: prev.currentPlayer
          ? lobby.players.find(p => p.id === prev.currentPlayer!.id) ?? prev.currentPlayer
          : prev.currentPlayer,
        isLoading: false,
      }));
    };

    const onLobbyJoined = (data: { lobby: Lobby; player: Player }) => {
      setState(prev => ({
        ...prev,
        lobby: data.lobby,
        currentPlayer: data.player,
        isLoading: false,
      }));
      try { (window as any).__ransom_lobby_code__ = data.lobby.code; } catch {}
    };

    const onRoundBegin = (data: { prompt: string; words: string[]; timeLimit: number }) => {
      setState(prev => ({
        ...prev,
        currentPlayer: prev.currentPlayer ? { ...prev.currentPlayer, words: data.words } : prev.currentPlayer,
        round: {
          prompt: data.prompt,
          submissions: {},
          votes: {},
          stage: 'ANSWERING',
          submissionTime: data.timeLimit,
        },
        hasSubmitted: false,
        hasVoted: false,
      }));
    };

    const onRoundReveal = (data: { submissions: Record<number, string[]> }) => {
      setState(prev => ({
        ...prev,
        round: prev.round
          ? { ...prev.round, submissions: data.submissions, stage: 'REVEALING' }
          : prev.round,
      }));
    };

    const onJudgeBegin = (data: { submissions: Record<number, string[]> }) => {
      // Judge is prompted to pick among submissions; mark judge turn and stage to VOTING locally
      setState(prev => ({
        ...prev,
        isJudgeTurn: true,
        round: prev.round ? { ...prev.round, submissions: data.submissions, stage: 'VOTING' } : prev.round,
      }));
    };

    const onLobbyError = (data: { message: string }) => {
      setState(prev => ({ ...prev, error: data.message, isLoading: false }));
      try { toast.error(data.message); } catch {}
    };

    const onSubmitAck = (ack: { ok: boolean; message?: string }) => {
      setState(prev => ({
        ...prev,
        hasSubmitted: ack.ok ? true : false,
        error: ack.ok ? prev.error : (ack.message ?? 'Submit failed'),
      }));
      if (ack.ok) { try { toast.success('Answer submitted'); } catch {} } else { try { toast.error(ack.message ?? 'Submit failed'); } catch {} }
    };

    const onVoteAck = (ack: { ok: boolean; message?: string }) => {
      setState(prev => ({
        ...prev,
        hasVoted: ack.ok ? true : false,
        error: ack.ok ? prev.error : (ack.message ?? 'Vote failed'),
      }));
      if (ack.ok) { try { toast.success('Vote submitted'); } catch {} } else { try { toast.error(ack.message ?? 'Vote failed'); } catch {} }
    };

    const onWinner = (data: { winnerId: number | null }) => {
      setState(prev => ({ ...prev, lastWinnerId: data?.winnerId ?? null, isJudgeTurn: false }));
      if (data?.winnerId == null) {
        try { toast('Round complete'); } catch {}
      } else {
        try {
          const name = state.lobby?.players.find(p => p.id === data.winnerId)?.nickname ?? 'Winner';
          toast.success(`${name} wins the round`);
        } catch {}
      }
    };

    socket.on('lobby:update', onLobbyUpdate);
    socket.on('lobby:joined', onLobbyJoined);
    socket.on('round:begin', onRoundBegin);
    socket.on('round:reveal', onRoundReveal);
  socket.on('judge:begin', onJudgeBegin);
    socket.on('lobby:error', onLobbyError);
    socket.on('round:submitAck', onSubmitAck);
    socket.on('round:voteAck', onVoteAck);
    socket.on('result:winner', onWinner);

    return () => {
      socket.off('lobby:update', onLobbyUpdate);
      socket.off('lobby:joined', onLobbyJoined);
      socket.off('round:begin', onRoundBegin);
      socket.off('round:reveal', onRoundReveal);
      socket.off('judge:begin', onJudgeBegin);
      socket.off('lobby:error', onLobbyError);
      socket.off('round:submitAck', onSubmitAck);
      socket.off('round:voteAck', onVoteAck);
      socket.off('result:winner', onWinner);
    };
  }, [socket]);

  // Actions
  const createLobby = useCallback((nickname: string) => {
    if (!socket) return;
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    socket.emit('lobby:create', { nickname });
  }, [socket]);

  const joinLobby = useCallback((code: string, nickname: string) => {
    if (!socket) return;
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    socket.emit('lobby:join', { code, nickname });
  }, [socket]);

  const startGame = useCallback(() => {
    if (!socket || !state.lobby) return;
    socket.emit('game:start', { code: state.lobby.code });
  }, [socket, state.lobby]);

  const setReady = useCallback(() => {
    if (!socket || !state.lobby) return;
    setState(prev => ({ ...prev, isLoading: true }));
    socket.emit('player:ready', { code: state.lobby.code });
  }, [socket, state.lobby]);

  const submitAnswer = useCallback((answer: string[]) => {
    if (!socket || !state.lobby || !state.currentPlayer || state.hasSubmitted) return;
    socket.emit('round:submit', {
      lobbyCode: state.lobby.code,
      playerId: state.currentPlayer.id,
      answer,
    });
  }, [socket, state.lobby, state.currentPlayer, state.hasSubmitted]);

  const submitVote = useCallback((submissionId: number) => {
    if (!socket || !state.lobby || !state.currentPlayer || state.hasVoted) return;
    socket.emit('round:vote', {
      lobbyCode: state.lobby.code,
      voterId: state.currentPlayer.id,
      submissionId,
    });
  }, [socket, state.lobby, state.currentPlayer, state.hasVoted]);

  const judgePick = useCallback((winnerId: number) => {
    if (!socket || !state.lobby) return;
    socket.emit('judge:pick', { lobbyCode: state.lobby.code, winnerId });
  }, [socket, state.lobby]);

  return (
    <GameContext.Provider
      value={{
        ...state,
        isConnected,
        createLobby,
        joinLobby,
        startGame,
        setReady,
        submitAnswer,
        submitVote,
        judgePick,
      }}
    >
      {/* Toast container */}
      <Toaster position="top-right" />
      {children}
    </GameContext.Provider>
  );
};
