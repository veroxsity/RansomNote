'use client';

interface SubmissionAreaProps {
  words: string[];
  onRemove: (index: number) => void;
  onSubmit: () => void;
}

export const SubmissionArea = ({ words, onRemove, onSubmit }: SubmissionAreaProps) => {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3">Your Answer</h3>
      <div className="min-h-[100px] bg-gray-50 border-2 border-dashed border-gray-300 rounded-md p-4 mb-4">
        {words.length === 0 ? (
          <p className="text-gray-400 text-center">Select words to build your answer</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {words.map((word, index) => (
              <button
                key={index}
                onClick={() => onRemove(index)}
                className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-red-500 transition-colors"
                title="Click to remove"
              >
                {word}
              </button>
            ))}
          </div>
        )}
      </div>
      
      <button
        onClick={onSubmit}
        disabled={words.length === 0}
        className="w-full bg-green-600 text-white px-4 py-3 rounded-md font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        Submit Answer
      </button>
    </div>
  );
};
