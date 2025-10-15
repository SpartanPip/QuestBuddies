import { LevelData } from '../../../shared/types/level';
import { SaveLevelRequest, SaveLevelResponse, LoadLevelResponse } from '../../../shared/types/api';

export class ApiUtils {
  private static readonly BASE_URL = '/api';
  private static readonly RETRY_ATTEMPTS = 3;
  private static readonly RETRY_DELAY = 1000; // 1 second

  /**
   * Saves level data to Reddit post with retry logic
   */
  static async saveLevelToReddit(levelData: LevelData): Promise<{ success: boolean; message: string; postId?: string }> {
    return this.retryOperation(async () => {
      const request: SaveLevelRequest = { levelData };
      
      const response = await fetch(`${this.BASE_URL}/save-level`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown server error' }));
        throw new Error(errorData.message || `HTTP error ${response.status}`);
      }

      const data: SaveLevelResponse = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Save operation failed');
      }

      return {
        success: true,
        message: data.message,
        postId: data.postId,
      };
    }, 'saving level');
  }

  /**
   * Loads level data from current Reddit post with retry logic
   */
  static async loadLevelFromReddit(): Promise<{ success: boolean; message: string; levelData?: LevelData }> {
    return this.retryOperation(async () => {
      const response = await fetch(`${this.BASE_URL}/load-level`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown server error' }));
        throw new Error(errorData.message || `HTTP error ${response.status}`);
      }

      const data: LoadLevelResponse = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Load operation failed');
      }

      return {
        success: true,
        message: data.message,
        levelData: data.levelData,
      };
    }, 'loading level');
  }

  /**
   * Creates a fallback level when loading fails
   */
  static createFallbackLevel(): LevelData {
    return {
      tiles: Array(20).fill(null).map(() => Array(20).fill(0)),
      enemies: [
        { x: 10, y: 10, type: 0 },
        { x: 15, y: 8, type: 0 },
        { x: 8, y: 15, type: 1 }
      ],
      spawn: { x: 5, y: 5 },
      metadata: {
        name: 'Fallback Level',
        author: 'System',
        created: Date.now()
      }
    };
  }

  /**
   * Validates level data integrity
   */
  static validateLevelData(levelData: any): { valid: boolean; error?: string } {
    if (!levelData || typeof levelData !== 'object') {
      return { valid: false, error: 'Level data must be an object' };
    }

    if (!Array.isArray(levelData.tiles) || levelData.tiles.length === 0) {
      return { valid: false, error: 'Level must have tiles array' };
    }

    if (!Array.isArray(levelData.enemies)) {
      return { valid: false, error: 'Level must have enemies array' };
    }

    if (!levelData.spawn || typeof levelData.spawn.x !== 'number' || typeof levelData.spawn.y !== 'number') {
      return { valid: false, error: 'Level must have valid spawn point' };
    }

    if (!levelData.metadata || !levelData.metadata.name || !levelData.metadata.author) {
      return { valid: false, error: 'Level must have metadata with name and author' };
    }

    return { valid: true };
  }

  /**
   * Retry operation with exponential backoff
   */
  private static async retryOperation<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.RETRY_ATTEMPTS; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`Attempt ${attempt}/${this.RETRY_ATTEMPTS} failed for ${operationName}:`, lastError.message);

        // Don't retry on the last attempt
        if (attempt === this.RETRY_ATTEMPTS) {
          break;
        }

        // Wait before retrying with exponential backoff
        const delay = this.RETRY_DELAY * Math.pow(2, attempt - 1);
        await this.sleep(delay);
      }
    }

    // All attempts failed
    return {
      success: false,
      message: `Failed to ${operationName} after ${this.RETRY_ATTEMPTS} attempts: ${lastError?.message || 'Unknown error'}`,
    } as T;
  }

  /**
   * Sleep utility for retry delays
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check network connectivity
   */
  static async checkNetworkConnectivity(): Promise<boolean> {
    try {
      const response = await fetch('/ping', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get network status message
   */
  static async getNetworkStatus(): Promise<{ online: boolean; message: string }> {
    const isOnline = await this.checkNetworkConnectivity();
    return {
      online: isOnline,
      message: isOnline ? 'Connected' : 'No network connection detected'
    };
  }
}