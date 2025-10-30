'use client';

interface WordPoolProps {
  words: string[];
  selectedWords: string[];
  onWordSelect: (word: string) => void;
}

export const WordPool = ({ words, selectedWords, onWordSelect }: WordPoolProps) => {
  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-3">Your Words</h3>
      <div className="flex flex-wrap gap-2">
        {words.map((word, index) => {
          const isUsed = selectedWords.includes(word);
          return (
            <button
              key={`${word}-${index}`}
              onClick={() => !isUsed && onWordSelect(word)}
              disabled={isUsed}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                isUsed
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer'
              }`}
            >
              {word}
            </button>
          );
        })}
      </div>
    </div>
  );
};
