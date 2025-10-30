'use client';

interface WordPoolProps {
  words: string[];
  selectedWords: string[];
  onWordSelect: (word: string) => void;
}

export const WordPool = ({ words, selectedWords, onWordSelect }: WordPoolProps) => {
  // Compute multiplicity counts in case duplicates exist
  const counts = words.reduce<Record<string, number>>((acc, w) => {
    acc[w] = (acc[w] || 0) + 1;
    return acc;
  }, {});
  return (
    <div className="mt-4 sm:mt-6">
      <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Your Words</h3>
      <div className="flex flex-wrap gap-2">
        {words.map((word, index) => {
          const isUsed = selectedWords.includes(word);
          return (
            <button
              key={`${word}-${index}`}
              onClick={() => !isUsed && onWordSelect(word)}
              disabled={isUsed}
              className={`px-3 py-2 sm:px-4 sm:py-2 rounded-md font-medium transition-colors text-sm sm:text-base min-h-[44px] ${
                isUsed
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700 cursor-pointer'
              }`}
              aria-label={counts[word] > 1 ? `${word}, ${counts[word]} available` : word}
            >
              {word}
              {counts[word] > 1 && (
                <span className="ml-1 sm:ml-2 text-xs bg-white/20 rounded px-1">x{counts[word]}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
