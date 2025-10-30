'use client';

import { useGame } from '../../hooks/useGame';
import { WordPool } from './WordPool';
import { SubmissionArea } from './SubmissionArea';
import { VotingUI } from './VotingUI';
import { useState } from 'react';

export const GameBoard = () => {
  const { lobby, round, currentPlayer, submitAnswer } = useGame();
  const [selectedWords, setSelectedWords] = useState<string[]>([]);

  if (!lobby || !round || !currentPlayer) {
    return <div>Loading game...</div>;
  }

  const handleWordSelect = (word: string) => {
    setSelectedWords([...selectedWords, word]);
  };

  const handleWordRemove = (index: number) => {
    setSelectedWords(selectedWords.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (selectedWords.length === 0) return;
    submitAnswer(selectedWords);
    setSelectedWords([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">Round {lobby.roundNumber}</h2>
        <div className="bg-blue-50 p-4 rounded-md mb-6">
          <p className="text-lg font-semibold text-blue-900">{round.prompt}</p>
        </div>

        {round.stage === 'ANSWERING' && (
          <>
            <SubmissionArea 
              words={selectedWords} 
              onRemove={handleWordRemove}
              onSubmit={handleSubmit}
            />
            
            <WordPool 
              words={currentPlayer.words} 
              selectedWords={selectedWords}
              onWordSelect={handleWordSelect} 
            />
          </>
        )}

        {round.stage === 'VOTING' && (
          <VotingUI 
            submissions={round.submissions}
            players={lobby.players}
            currentPlayerId={currentPlayer.id}
          />
        )}

        {round.stage === 'REVEALING' && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Submissions</h3>
            {Object.entries(round.submissions).map(([playerId, words]) => {
              const player = lobby.players.find(p => p.id === Number(playerId));
              return (
                <div key={playerId} className="bg-gray-50 p-4 rounded-md">
                  <p className="font-semibold">{player?.nickname}</p>
                  <p className="text-lg">{words.join(' ')}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
