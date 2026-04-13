import { useState, useEffect } from 'react';

export default function CurrentTimeDisplay() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const formattedDate = currentTime.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  return (
    <div className="text-slate-400 text-sm font-medium flex flex-col items-end">
      <span>{formattedDate}</span>
      <span className="text-xl font-bold text-white">{formattedTime}</span>
    </div>
  );
}