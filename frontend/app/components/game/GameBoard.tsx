'use client';

import { useGame } from '../../hooks/useGame';
import { WordPool } from './WordPool';
import { SubmissionArea } from './SubmissionArea';
import { VotingUI } from './VotingUI';
import { useEffect, useState } from 'react';
import { Timer } from '../shared/Timer';
import { ScoreBoard } from '../shared/ScoreBoard';

export const GameBoard = () => {
  const { lobby, round, currentPlayer, submitAnswer, lastWinnerId, hasSubmitted } = useGame();
  const [selectedWords, setSelectedWords] = useState<string[]>([]);

  // Clear selection when a new round begins
  useEffect(() => {
    setSelectedWords([]);
  }, [lobby?.roundNumber]);

  // Clear selection only after server ACK confirms submission
  useEffect(() => {
    if (hasSubmitted) {
      setSelectedWords([]);
    }
  }, [hasSubmitted]);

  if (!lobby || !round || !currentPlayer) {
    return <div>Loading game...</div>;
  }

  const handleWordSelect = (word: string) => {
    setSelectedWords((prev) => [...prev, word]);
  };

  const handleWordRemove = (index: number) => {
    setSelectedWords((prev) => prev.filter((_, i) => i !== index));
  };

  const handleWordMove = (from: number, to: number) => {
    if (from === to) return;
    setSelectedWords((prev) => {
      const next = [...prev];
      const [w] = next.splice(from, 1);
      next.splice(to, 0, w);
      return next;
    });
  };

  const handleSubmit = () => {
    if (selectedWords.length === 0) return;
    // Submit current selection; UI will clear upon server ACK
    submitAnswer(selectedWords);
  };

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-6">
      <div className="bg-white rounded-lg shadow-md p-3 sm:p-6 mb-4 sm:mb-6 relative">
        {typeof lastWinnerId !== 'undefined' && lastWinnerId !== null && (
          <div className="absolute left-1/2 -translate-x-1/2 -top-3 bg-green-600 text-white text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-full shadow z-10">
            Winner: {lobby.players.find(p => p.id === lastWinnerId)?.nickname}
          </div>
        )}
        <div className="hidden sm:block absolute right-4 top-4 w-48">
          <ScoreBoard players={lobby.players} />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 pr-12 sm:pr-52">Round {lobby.roundNumber}</h2>
        
        {/* Mobile scoreboard */}
        <div className="block sm:hidden mb-3">
          <ScoreBoard players={lobby.players} />
        </div>
        
        <div className="bg-blue-50 p-3 sm:p-4 rounded-md mb-4 sm:mb-6">
          <p className="text-base sm:text-lg font-semibold text-blue-900">{round.prompt}</p>
        </div>

        {round.stage === 'ANSWERING' && (
          <>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-2">
              <span className="text-xs sm:text-sm text-gray-600">Build your sentence using your words</span>
              <Timer initialSeconds={round.submissionTime ?? 90} />
            </div>
            <SubmissionArea
              words={selectedWords}
              onRemove={handleWordRemove}
              onMove={handleWordMove}
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
          <>
            <div className="flex justify-end mb-3">
              <Timer initialSeconds={round.voteTime ?? 30} />
            </div>
            <VotingUI
              submissions={round.submissions}
              players={lobby.players}
              currentPlayerId={currentPlayer.id}
              judgeIndex={lobby.judgeIndex}
            />
          </>
        )}

        {round.stage === 'REVEALING' && (
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-lg sm:text-xl font-semibold">Submissions</h3>
            {Object.entries(round.submissions).map(([playerId, words]) => {
              const player = lobby.players.find((p) => p.id === Number(playerId));
              return (
                <div key={playerId} className="bg-gray-50 p-3 sm:p-4 rounded-md">
                  <p className="font-semibold text-sm sm:text-base">{player?.nickname}</p>
                  <p className="text-base sm:text-lg">{words.join(' ')}</p>
                </div>
              );
            })}
            <p className="text-xs sm:text-sm text-gray-500">Voting will begin shortly…</p>
          </div>
        )}

        {lobby.state === 'ROUND_END' && (
          <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-gray-600">
            Next round starting in <span className="inline-block align-middle"><Timer initialSeconds={5} /></span>
          </div>
        )}
      </div>
    </div>
  );
};
