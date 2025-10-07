"use client"

import { GAME_CONFIG } from "./config"

interface UIOverlayProps {
  score: number
  isGameOver: boolean
  isPaused: boolean
  finalScore: number
  onRestart: () => void
}

export default function UIOverlay({ score, isGameOver, isPaused, finalScore, onRestart }: UIOverlayProps) {
  return (
    <>
      {/* Score display */}
      {!isGameOver && (
        <div className="absolute top-4 right-4 bg-black/70 text-white px-4 py-2 rounded-lg">
          <div className="text-xl font-bold">Score: {Math.floor(score)}</div>
          <div className="text-sm opacity-75">Speed: {GAME_CONFIG.playerSpeed.toFixed(2)}</div>
          <div className="text-sm opacity-75">Jump: {GAME_CONFIG.jump.duration.toFixed(2)}s</div>
          <div className="text-sm opacity-75">Spawn: {GAME_CONFIG.obstacles.spawnInterval.toFixed(2)}s</div>
        </div>
      )}

      {/* Pause overlay */}
      {isPaused && !isGameOver && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
          <div className="bg-white p-8 rounded-lg text-center">
            <h2 className="text-2xl font-bold mb-2">PAUSED</h2>
            <p className="text-gray-600">Press ESC to continue</p>
          </div>
        </div>
      )}

      {/* Game over overlay */}
      {isGameOver && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
          <div className="bg-white p-8 rounded-lg text-center max-w-md">
            <h2 className="text-3xl font-bold mb-4 text-red-600">GAME OVER</h2>
            <p className="text-lg mb-2">You crashed into an obstacle!</p>
            <p className="text-xl font-semibold mb-6">Final Score: {Math.floor(finalScore)}</p>
            <button
              onClick={onRestart}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </>
  )
}
