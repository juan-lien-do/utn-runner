// Game Time Manager - Centralized time system for consistent game timing

class GameTimeManager {
  private static instance: GameTimeManager;
  
  // Game time accumulates with deltaTime, not real time
  private gameTime: number = 0;
  private lastRealTime: number = 0;
  private isPaused: boolean = false;
  private pauseStartTime: number = 0;
  
  // For debugging and monitoring
  private frameCount: number = 0;
  private fpsHistory: number[] = [];
  private currentFPS: number = 60;

  private constructor() {
    this.lastRealTime = performance.now();
  }

  static getInstance(): GameTimeManager {
    if (!GameTimeManager.instance) {
      GameTimeManager.instance = new GameTimeManager();
    }
    return GameTimeManager.instance;
  }

  /**
   * Update game time with deltaTime from the main game loop
   * Call this once per frame from useFrame
   */
  updateTime(deltaTime: number): void {
    if (this.isPaused) return;
    
    this.gameTime += deltaTime;
    this.frameCount++;
    
    // Update FPS tracking for debugging
    const now = performance.now();
    if (now - this.lastRealTime > 1000) { // Every second
      this.currentFPS = this.frameCount;
      this.fpsHistory.push(this.currentFPS);
      if (this.fpsHistory.length > 10) this.fpsHistory.shift();
      
      this.frameCount = 0;
      this.lastRealTime = now;
      
      // Log if FPS is significantly low
      if (this.currentFPS < 30) {
        console.log(`[GameTime] Low FPS detected: ${this.currentFPS}, gameTime scale: ${(deltaTime / (1/60)).toFixed(2)}x`);
      }
    }
  }

  /**
   * Get current game time (accumulated deltaTime)
   */
  getGameTime(): number {
    return this.gameTime;
  }

  /**
   * Check if enough game time has passed since lastTime
   */
  hasTimeElapsed(lastTime: number, interval: number): boolean {
    return this.gameTime - lastTime >= interval;
  }

  /**
   * Get time for next event based on interval
   */
  getNextEventTime(interval: number): number {
    return this.gameTime + interval;
  }

  /**
   * Pause/unpause game time
   */
  setPaused(paused: boolean): void {
    if (paused && !this.isPaused) {
      this.pauseStartTime = this.gameTime;
    }
    this.isPaused = paused;
  }

  isPausedState(): boolean {
    return this.isPaused;
  }

  /**
   * Reset game time (for restart)
   */
  reset(): void {
    this.gameTime = 0;
    this.frameCount = 0;
    this.fpsHistory = [];
    this.currentFPS = 60;
    this.isPaused = false;
    this.pauseStartTime = 0;
    this.lastRealTime = performance.now();
    console.log('[GameTime] Game time reset');
  }

  /**
   * Get current FPS for debugging
   */
  getCurrentFPS(): number {
    return this.currentFPS;
  }

  /**
   * Get average FPS over last 10 seconds
   */
  getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return 60;
    return this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
  }

  /**
   * Calculate progress of a timed event (0 to 1)
   */
  getEventProgress(startTime: number, duration: number): number {
    const elapsed = this.gameTime - startTime;
    return Math.min(Math.max(elapsed / duration, 0), 1);
  }

  /**
   * Check if a timed event is complete
   */
  isEventComplete(startTime: number, duration: number): boolean {
    return this.gameTime - startTime >= duration;
  }
}

// Export singleton instance
export const gameTimeManager = GameTimeManager.getInstance();