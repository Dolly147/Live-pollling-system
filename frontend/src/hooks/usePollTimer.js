/**
 * Countdown timer synced with server
 */
import { useEffect, useState } from "react";

export const usePollTimer = (initialTime) => {
  const [time, setTime] = useState(initialTime);

  useEffect(() => {
    setTime(initialTime);
  }, [initialTime]);

  useEffect(() => {
    if (time <= 0) return;

    const interval = setInterval(() => {
      setTime((t) => t - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [time]);

  return time;
};
