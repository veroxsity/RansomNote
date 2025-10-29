import { useState } from 'react';
import { useGame } from '../hooks/useGame';

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
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-center">
        {isJoining ? 'Join a Game' : 'Create New Game'}
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="nickname" className="block text-sm font-medium text-gray-700">
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
            className="mt-1 block w-full p-2 border rounded-md"
            placeholder="Enter your nickname"
          />
        </div>

        {isJoining && (
          <div>
            <label htmlFor="lobbyCode" className="block text-sm font-medium text-gray-700">
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
              className="mt-1 block w-full p-2 border rounded-md uppercase"
              placeholder="Enter lobby code"
            />
          </div>
        )}

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => setIsJoining(!isJoining)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            {isJoining ? 'Create Instead' : 'Join Instead'}
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : isJoining ? 'Join Game' : 'Create Game'}
          </button>
        </div>
      </form>
    </div>
  );
};