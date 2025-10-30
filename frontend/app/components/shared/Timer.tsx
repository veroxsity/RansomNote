"use client";

import { useEffect, useRef, useState } from "react";

interface TimerProps {
  initialSeconds: number;
  onExpire?: () => void;
  className?: string;
}

export const Timer = ({ initialSeconds, onExpire, className }: TimerProps) => {
  const [seconds, setSeconds] = useState<number>(initialSeconds);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setSeconds(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (seconds <= 0) {
      if (onExpire) onExpire();
      return;
    }
    timerRef.current = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [seconds, onExpire]);

  const mm = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");

  return (
    <div className={className ?? "text-sm text-gray-600"}>
      ⏳ {mm}:{ss}
    </div>
  );
};
