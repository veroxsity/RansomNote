import { Player } from '../../../../shared/types/game';

interface Props {
  players: Player[];
  judgeIndex: number | null;
}

export const PlayerList = ({ players, judgeIndex }: Props) => {
  return (
    <div className="mt-4 sm:mt-6">
      <h2 className="text-base sm:text-lg font-medium mb-2 sm:mb-3">Players</h2>
      <ul className="space-y-2">
        {players.map((player, index) => (
          <li
            key={player.id}
            className={`flex items-center justify-between p-3 rounded-md ${
              judgeIndex === index ? 'bg-yellow-100' : 'bg-gray-100'
            }`}
          >
            <div className="flex items-center min-w-0 flex-1">
              {judgeIndex === index && (
                <span className="text-yellow-600 mr-2 text-lg sm:text-base">👑</span>
              )}
              <span className="font-medium truncate text-sm sm:text-base">{player.nickname}</span>
              {player.status === 'DISCONNECTED' && (
                <span className="ml-2 text-xs sm:text-sm text-gray-500 flex-shrink-0">(Disconnected)</span>
              )}
              {player.status === 'READY' && (
                <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 flex-shrink-0">
                  Ready
                </span>
              )}
            </div>
            <span className="text-base sm:text-lg font-semibold ml-2 flex-shrink-0">{player.score}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};