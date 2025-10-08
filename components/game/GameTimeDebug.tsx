import React, { useState, useEffect } from 'react';
import { gameTimeManager } from './GameTimeManager';

interface GameTimeDebugProps {
  visible?: boolean;
}

export const GameTimeDebug: React.FC<GameTimeDebugProps> = ({ visible = false }) => {
  const [debugInfo, setDebugInfo] = useState({
    gameTime: 0,
    fps: 60,
    avgFPS: 60,
    isPaused: false
  });

  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      setDebugInfo({
        gameTime: gameTimeManager.getGameTime(),
        fps: gameTimeManager.getCurrentFPS(),
        avgFPS: gameTimeManager.getAverageFPS(),
        isPaused: gameTimeManager.isPausedState()
      });
    }, 100);

    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="absolute top-4 right-4 bg-black/80 text-white p-3 rounded-lg text-sm font-mono z-50">
      <div className="text-green-400 font-bold mb-2">Game Time Debug</div>
      <div>Game Time: {debugInfo.gameTime.toFixed(2)}s</div>
      <div>Current FPS: {debugInfo.fps}</div>
      <div>Avg FPS: {debugInfo.avgFPS.toFixed(1)}</div>
      <div>Status: {debugInfo.isPaused ? 'PAUSED' : 'RUNNING'}</div>
      <div className="text-yellow-400 text-xs mt-2">
        {debugInfo.fps < 30 && !debugInfo.isPaused && 'SLOW MOTION MODE'}
      </div>
    </div>
  );
};