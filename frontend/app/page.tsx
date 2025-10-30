'use client';

import { useEffect, useState } from 'react';
import { useGame } from './hooks/useGame';
import { LobbyCreation } from './components/lobby/LobbyCreation';
import { PlayerList } from './components/lobby/PlayerList';
import { GameBoard } from './components/game/GameBoard';
import { ErrorBoundary } from './components/shared/ErrorBoundary';

export default function Page() {
  const { lobby, error, startGame, setReady, currentPlayer, round, isConnected, isLoading } = useGame();
  
  const isHost = currentPlayer?.id === 1;
  const isPlayerReady = currentPlayer?.status === 'READY';
  const isGameActive = lobby && ['IN_PROGRESS', 'ROUND_ACTIVE', 'VOTING', 'ROUND_END'].includes(lobby.state);

  return (
    <div className="min-h-screen p-3 sm:p-8 bg-gray-100">
      {!isConnected && (
        <div className="max-w-2xl mx-auto mb-3 sm:mb-4 p-2 rounded bg-yellow-100 text-yellow-800 text-center text-xs sm:text-sm">
          Reconnecting to server...
        </div>
      )}
      <h1 className="text-2xl sm:text-3xl font-bold text-center mb-4 sm:mb-8">Ransom Notes Online</h1>
      
      {error && (
        <div className="max-w-md mx-auto mb-3 sm:mb-4 p-3 sm:p-4 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      {!lobby ? (
        <LobbyCreation />
      ) : isGameActive ? (
        <ErrorBoundary>
          <GameBoard />
        </ErrorBoundary>
      ) : (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 sm:mb-4 gap-2">
              <h2 className="text-lg sm:text-xl font-semibold">Lobby: {lobby.code}</h2>
              <div className="text-xs sm:text-sm text-gray-600">
                State: {lobby.state}
              </div>
            </div>

            {typeof lobby.judgeIndex === 'number' && lobby.judgeIndex >= 0 && (
              <div className="mb-3 p-2 rounded bg-yellow-50 text-yellow-800 text-xs sm:text-sm">
                Current judge: <strong>{lobby.players[lobby.judgeIndex]?.nickname}</strong>
              </div>
            )}
            
            <PlayerList players={lobby.players} judgeIndex={lobby.judgeIndex} />

            {lobby.state === 'WAITING_FOR_PLAYERS' && (
              <div className="mt-4 space-y-2">
                {!isPlayerReady && (
                  <button 
                    onClick={setReady}
                    disabled={isLoading}
                    className="w-full bg-blue-500 text-white px-4 py-3 sm:py-2 rounded hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 text-base font-medium min-h-[48px] sm:min-h-0"
                  >
                    {isLoading ? 'Ready…' : 'Ready Up'}
                  </button>
                )}
                
                {isHost && lobby.players.length >= 2 && (
                  <button 
                    onClick={startGame}
                    className="w-full bg-green-500 text-white px-4 py-3 sm:py-2 rounded hover:bg-green-600 active:bg-green-700 text-base font-medium min-h-[48px] sm:min-h-0"
                  >
                    Start Game
                  </button>
                )}

                {isHost && (
                  <button
                    onClick={() => {
                      // Emit early end; relies on server handler
                      // We go through raw socket to avoid bloating game context
                      const event = new CustomEvent('game:end-request');
                      window.dispatchEvent(event);
                    }}
                    className="w-full bg-red-500 text-white px-4 py-3 sm:py-2 rounded hover:bg-red-600 active:bg-red-700 text-base font-medium min-h-[48px] sm:min-h-0"
                  >
                    End Game
                  </button>
                )}
                
                <p className="text-xs sm:text-sm text-gray-600 text-center mt-2">
                  {lobby.players.length} / 8 players • Minimum 2 players to start
                </p>
                <p className="text-xs text-gray-500 text-center">
                  {lobby.players.filter(p => p.status === 'READY').length} ready
                </p>
              </div>
            )}
            
            {lobby.state === 'GAME_END' && (
              <div className="mt-4 text-center">
                <h3 className="text-xl sm:text-2xl font-bold text-green-600 mb-3 sm:mb-4">Game Over!</h3>
                <div className="space-y-2">
                  {[...lobby.players].sort((a, b) => b.score - a.score).map((player, index) => (
                    <div key={player.id} className="flex justify-between p-2 sm:p-2 bg-gray-50 rounded text-sm sm:text-base">
                      <span>{index + 1}. {player.nickname}</span>
                      <span className="font-bold">{player.score} points</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
