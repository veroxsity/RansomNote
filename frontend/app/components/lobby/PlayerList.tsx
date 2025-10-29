import { Player } from '../../../../shared/types/game';

interface Props {
  players: Player[];
  judgeIndex: number | null;
}

export const PlayerList = ({ players, judgeIndex }: Props) => {
  return (
    <div className="mt-6">
      <h2 className="text-lg font-medium mb-3">Players</h2>
      <ul className="space-y-2">
        {players.map((player, index) => (
          <li
            key={player.id}
            className={`flex items-center justify-between p-3 rounded-md ${
              judgeIndex === index ? 'bg-yellow-100' : 'bg-gray-100'
            }`}
          >
            <div className="flex items-center">
              {judgeIndex === index && (
                <span className="text-yellow-600 mr-2">👑</span>
              )}
              <span className="font-medium">{player.nickname}</span>
              {player.status === 'DISCONNECTED' && (
                <span className="ml-2 text-sm text-gray-500">(Disconnected)</span>
              )}
            </div>
            <span className="text-lg font-semibold">{player.score}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};