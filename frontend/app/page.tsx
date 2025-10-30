'use client';

import { useEffect, useState } from 'react';
import { useGame } from './hooks/useGame';
import { LobbyCreation } from './components/lobby/LobbyCreation';
import { PlayerList } from './components/lobby/PlayerList';
import { GameScreen } from './components/game/GameScreen';

export default function Page() {
  const { lobby, error, startGame, setReady, currentPlayer, round } = useGame();
  
  const isHost = currentPlayer?.id === 1;
  const isPlayerReady = currentPlayer?.status === 'READY';
  const isGameActive = lobby && ['IN_PROGRESS', 'ROUND_ACTIVE', 'VOTING', 'ROUND_END'].includes(lobby.state);

  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <h1 className="text-3xl font-bold text-center mb-8">Ransom Notes Online</h1>
      
      {error && (
        <div className="max-w-md mx-auto mb-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {!lobby ? (
        <LobbyCreation />
      ) : isGameActive ? (
        <GameScreen />
      ) : (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Lobby: {lobby.code}</h2>
              <div className="text-sm text-gray-600">
                State: {lobby.state}
              </div>
            </div>
            
            <PlayerList players={lobby.players} judgeIndex={lobby.judgeIndex} />

            {lobby.state === 'WAITING_FOR_PLAYERS' && (
              <div className="mt-4 space-y-2">
                {!isPlayerReady && (
                  <button 
                    onClick={setReady}
                    className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Ready Up
                  </button>
                )}
                
                {isHost && lobby.players.length >= 2 && (
                  <button 
                    onClick={startGame}
                    className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  >
                    Start Game
                  </button>
                )}
                
                <p className="text-sm text-gray-600 text-center mt-2">
                  {lobby.players.length} / 8 players • Minimum 2 players to start
                </p>
                <p className="text-xs text-gray-500 text-center">
                  {lobby.players.filter(p => p.status === 'READY').length} ready
                </p>
              </div>
            )}
            
            {lobby.state === 'GAME_END' && (
              <div className="mt-4 text-center">
                <h3 className="text-2xl font-bold text-green-600 mb-4">Game Over!</h3>
                <div className="space-y-2">
                  {[...lobby.players].sort((a, b) => b.score - a.score).map((player, index) => (
                    <div key={player.id} className="flex justify-between p-2 bg-gray-50 rounded">
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
