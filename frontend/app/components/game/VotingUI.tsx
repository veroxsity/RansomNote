'use client';

import { useState } from 'react';
import { useGame } from '../../hooks/useGame';
import { Player } from '../../../../shared/types/game';

interface VotingUIProps {
  submissions: Record<number, string[]>;
  players: Player[];
  currentPlayerId: number;
  judgeIndex?: number | null;
}

export const VotingUI = ({ submissions, players, currentPlayerId, judgeIndex }: VotingUIProps) => {
  const { submitVote, judgePick } = useGame();
  const [selectedSubmission, setSelectedSubmission] = useState<number | null>(null);

  const mode = (process.env.NEXT_PUBLIC_VOTE_MODE || 'group').toLowerCase();
  const isJudge = typeof judgeIndex === 'number' && players[judgeIndex] && players[judgeIndex].id === currentPlayerId;

  const handleVote = (playerId: number) => {
    if (playerId === currentPlayerId) return; // Can't vote for self
    if (selectedSubmission !== null) return; // already voted
    setSelectedSubmission(playerId);
    submitVote(playerId);
  };

  const handleJudgePick = (playerId: number) => {
    if (!isJudge) return;
    if (selectedSubmission !== null) return;
    setSelectedSubmission(playerId);
    judgePick(playerId);
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
        {mode === 'judge' ? (isJudge ? 'Pick the Winner' : 'Waiting for the judge…') : 'Vote for the Best Answer'}
      </h3>
      
      {Object.entries(submissions).map(([playerId, words]) => {
        const playerIdNum = Number(playerId);
        const player = players.find(p => p.id === playerIdNum);
        const isSelf = playerIdNum === currentPlayerId;
        const isSelected = selectedSubmission === playerIdNum;
        
        const isClickable = mode === 'judge' ? isJudge && !isSelf : !isSelf;
        const handleClick = () => {
          if (!isClickable) return;
          if (mode === 'judge') handleJudgePick(playerIdNum);
          else handleVote(playerIdNum);
        };

        return (
          <div
            key={playerId}
            className={`p-3 sm:p-4 rounded-md border-2 transition-all min-h-[60px] ${
              isSelf
                ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
                : isSelected
                ? 'bg-green-100 border-green-500'
                : isClickable
                ? 'bg-white border-gray-300 hover:border-blue-500 active:border-blue-600 cursor-pointer'
                : 'bg-white border-gray-200 cursor-not-allowed opacity-80'
            }`}
            onClick={handleClick}
          >
            <p className="font-semibold text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">
              {player?.nickname} {isSelf && '(You)'}
            </p>
            <p className="text-base sm:text-lg break-words">{words.join(' ')}</p>
            {isSelected && (
              <p className="text-green-600 font-semibold mt-2 text-sm sm:text-base">{mode === 'judge' ? '✓ Picked' : '✓ Voted'}</p>
            )}
          </div>
        );
      })}
    </div>
  );
};
