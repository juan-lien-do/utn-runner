import GameScene from "@/components/game/GameScene"
import CameraPanel from "@/components/vision/CameraPanel"
import { HandControlProvider } from "@/components/vision/HandControlContext"
import ConsoleCleanerProvider from "@/components/ConsoleCleanerProvider"

export default function Home() {
  return (
    <ConsoleCleanerProvider>
      <HandControlProvider>
        <div className="w-full h-screen bg-black flex flex-col">
        {/* Game section - 2/3 of screen */}
        <div className="w-full h-2/3 relative">
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white z-10 text-center">
            <h1 className="text-3xl font-bold drop-shadow-lg">Subway Surfers Clone</h1>
            <p className="text-sm opacity-75 mt-1">← → Arrows: Change lanes | ↑ Jump | ESC: Pause</p>
          </div>
          <GameScene />
        </div>

        {/* Camera section - 1/3 of screen */}
        <div className="w-full h-1/3 p-4 bg-gray-950">
          <CameraPanel />
        </div>
      </div>
    </HandControlProvider>
    </ConsoleCleanerProvider>
  )
}
