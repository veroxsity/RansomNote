'use client';

interface SubmissionAreaProps {
  words: string[];
  onRemove: (index: number) => void;
  onMove?: (from: number, to: number) => void;
  onSubmit: () => void;
}

export const SubmissionArea = ({ words, onRemove, onMove, onSubmit }: SubmissionAreaProps) => {
  return (
    <div className="mb-4 sm:mb-6">
      <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Your Answer</h3>
      <div className="min-h-[80px] sm:min-h-[100px] bg-gray-50 border-2 border-dashed border-gray-300 rounded-md p-3 sm:p-4 mb-3 sm:mb-4" role="list" aria-label="Selected words">
        {words.length === 0 ? (
          <p className="text-gray-400 text-center text-sm sm:text-base">Select words to build your answer</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {words.map((word, index) => (
              <div
                key={index}
                className="flex items-center gap-1 sm:gap-2"
                role="listitem"
              >
                <button
                  onClick={() => onRemove(index)}
                  onKeyDown={(e) => {
                    if (!onMove) return;
                    if (e.key === 'ArrowLeft') {
                      e.preventDefault();
                      onMove(index, Math.max(0, index - 1));
                    }
                    if (e.key === 'ArrowRight') {
                      e.preventDefault();
                      onMove(index, Math.min(words.length - 1, index + 1));
                    }
                  }}
                  tabIndex={0}
                  className="px-3 py-2 sm:px-3 sm:py-1 bg-green-500 text-white rounded-md hover:bg-red-500 active:bg-red-600 transition-colors text-sm sm:text-base min-h-[44px] sm:min-h-0"
                  title="Click to remove"
                  aria-label={`Word ${word}. Press Enter to remove. Use left and right arrows to reorder.`}
                >
                  {word}
                </button>
                {onMove && (
                  <div className="flex flex-col sm:flex-row items-center gap-1">
                    <button
                      onClick={() => onMove(index, Math.max(0, index - 1))}
                      disabled={index === 0}
                      className="px-2 py-1 text-xs bg-gray-200 rounded disabled:opacity-50 min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0"
                      title="Move left"
                      aria-label="Move word left"
                    >
                      ←
                    </button>
                    <button
                      onClick={() => onMove(index, Math.min(words.length - 1, index + 1))}
                      disabled={index === words.length - 1}
                      className="px-2 py-1 text-xs bg-gray-200 rounded disabled:opacity-50 min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0"
                      title="Move right"
                      aria-label="Move word right"
                    >
                      →
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <button
        onClick={onSubmit}
        disabled={words.length === 0}
        className="w-full bg-green-600 text-white px-4 py-3 sm:py-3 rounded-md font-semibold hover:bg-green-700 active:bg-green-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-base min-h-[48px]"
      >
        Submit Answer
      </button>
    </div>
  );
};
