import { LevelData } from '../../shared/types/level';
import { redis } from '@devvit/web/server';

export class LevelHandler {
  private static validateLevelData(levelData: LevelData): { valid: boolean; error?: string } {
    if (!levelData) {
      return { valid: false, error: 'Level data is required' };
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

    // Validate enemies have valid positions
    for (const enemy of levelData.enemies) {
      if (typeof enemy.x !== 'number' || typeof enemy.y !== 'number' || typeof enemy.type !== 'number') {
        return { valid: false, error: 'All enemies must have valid x, y, and type properties' };
      }
    }

    return { valid: true };
  }

  static async saveLevelData(postId: string, levelData: LevelData): Promise<{ success: boolean; message: string }> {
    try {
      const validation = this.validateLevelData(levelData);
      if (!validation.valid) {
        return { success: false, message: validation.error || 'Invalid level data' };
      }

      // Add timestamp to metadata
      levelData.metadata.created = Date.now();

      // Store level data in Redis with postId as key
      const levelKey = `level:${postId}`;
      await redis.set(levelKey, JSON.stringify(levelData));

      return { success: true, message: 'Level saved successfully' };
    } catch (error) {
      console.error('Error saving level data:', error);
      return { success: false, message: 'Failed to save level data' };
    }
  }

  static async loadLevelData(postId: string): Promise<{ levelData: LevelData | null; success: boolean; message: string }> {
    try {
      const levelKey = `level:${postId}`;
      const levelDataString = await redis.get(levelKey);

      if (!levelDataString) {
        return { 
          levelData: null, 
          success: false, 
          message: 'No level data found for this post' 
        };
      }

      const levelData = JSON.parse(levelDataString) as LevelData;
      
      const validation = this.validateLevelData(levelData);
      if (!validation.valid) {
        return { 
          levelData: null, 
          success: false, 
          message: `Corrupted level data: ${validation.error}` 
        };
      }

      return { 
        levelData, 
        success: true, 
        message: 'Level loaded successfully' 
      };
    } catch (error) {
      console.error('Error loading level data:', error);
      return { 
        levelData: null, 
        success: false, 
        message: 'Failed to load level data' 
      };
    }
  }
}