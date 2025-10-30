'use client';

import { useState } from 'react';
import { useGame } from '../../hooks/useGame';
import { Player } from '../../../../shared/types/game';

interface VotingUIProps {
  submissions: Record<number, string[]>;
  players: Player[];
  currentPlayerId: number;
}

export const VotingUI = ({ submissions, players, currentPlayerId }: VotingUIProps) => {
  const { submitVote } = useGame();
  const [selectedSubmission, setSelectedSubmission] = useState<number | null>(null);

  const handleVote = (playerId: number) => {
    if (playerId === currentPlayerId) return; // Can't vote for self
    setSelectedSubmission(playerId);
    submitVote(playerId);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold mb-4">Vote for the Best Answer</h3>
      
      {Object.entries(submissions).map(([playerId, words]) => {
        const playerIdNum = Number(playerId);
        const player = players.find(p => p.id === playerIdNum);
        const isSelf = playerIdNum === currentPlayerId;
        const isSelected = selectedSubmission === playerIdNum;
        
        return (
          <div
            key={playerId}
            className={`p-4 rounded-md border-2 transition-all ${
              isSelf
                ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
                : isSelected
                ? 'bg-green-100 border-green-500'
                : 'bg-white border-gray-300 hover:border-blue-500 cursor-pointer'
            }`}
            onClick={() => !isSelf && handleVote(playerIdNum)}
          >
            <p className="font-semibold text-sm text-gray-600 mb-2">
              {player?.nickname} {isSelf && '(You)'}
            </p>
            <p className="text-lg">{words.join(' ')}</p>
            {isSelected && (
              <p className="text-green-600 font-semibold mt-2">✓ Voted</p>
            )}
          </div>
        );
      })}
    </div>
  );
};
