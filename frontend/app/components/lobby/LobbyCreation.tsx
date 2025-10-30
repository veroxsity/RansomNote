import { useState } from 'react';
import { useGame } from '../../hooks/useGame';

export const LobbyCreation = () => {
  const [nickname, setNickname] = useState('');
  const [lobbyCode, setLobbyCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const { createLobby, joinLobby, error, isLoading } = useGame();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isJoining) {
      joinLobby(lobbyCode.toUpperCase(), nickname);
    } else {
      createLobby(nickname);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-4 sm:mt-10 p-4 sm:p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center">
        {isJoining ? 'Join a Game' : 'Create New Game'}
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">
            Nickname
          </label>
          <input
            type="text"
            id="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
            minLength={2}
            maxLength={15}
            className="mt-1 block w-full p-3 sm:p-2 border rounded-md text-base"
            placeholder="Enter your nickname"
          />
        </div>

        {isJoining && (
          <div>
            <label htmlFor="lobbyCode" className="block text-sm font-medium text-gray-700 mb-1">
              Lobby Code
            </label>
            <input
              type="text"
              id="lobbyCode"
              value={lobbyCode}
              onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
              required
              minLength={6}
              maxLength={6}
              className="mt-1 block w-full p-3 sm:p-2 border rounded-md uppercase text-base"
              placeholder="Enter lobby code"
            />
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-2">
          <button
            type="button"
            onClick={() => setIsJoining(!isJoining)}
            className="w-full sm:w-auto px-4 py-3 sm:py-2 text-base sm:text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 active:bg-gray-300"
          >
            {isJoining ? 'Create Instead' : 'Join Instead'}
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-3 sm:py-2 text-base sm:text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : isJoining ? 'Join Game' : 'Create Game'}
          </button>
        </div>
      </form>
    </div>
  );
};