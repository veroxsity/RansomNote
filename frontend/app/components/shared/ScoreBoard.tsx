"use client";

import { Player } from "../../../../shared/types/game";

interface Props {
  players: Player[];
  className?: string;
}

export const ScoreBoard = ({ players, className }: Props) => {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return (
    <div className={className ?? ""}>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Scores</h3>
      <ul className="space-y-1">
        {sorted.map((p, i) => (
          <li key={p.id} className="flex items-center justify-between text-sm bg-gray-50 rounded px-2 py-1">
            <span className="truncate">
              {i + 1}. {p.nickname}
            </span>
            <span className="font-semibold">{p.score}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
