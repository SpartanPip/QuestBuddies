import { LevelData } from '../../shared/types/level';
import { redis } from '@devvit/web/server';
import { randomUUID } from 'crypto';

export class LevelHandler {
  /**
   * Generates a UUID v4 (for Node.js server environment)
   */
  private static generateUUID(): string {
    // Use crypto.randomUUID() from Node.js crypto module
    return randomUUID();
  }

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

    if (!levelData.metadata) {
      return { valid: false, error: 'Level must have metadata' };
    }
    
    // Auto-generate UUID if name is missing or default
    if (!levelData.metadata.name || 
        levelData.metadata.name.trim() === '' ||
        levelData.metadata.name === 'New Level' ||
        levelData.metadata.name === 'Untitled Level') {
      // Generate UUID - using a simple UUID v4 implementation for Node.js
      levelData.metadata.name = this.generateUUID();
    }
    
    // Ensure author has a default value
    if (!levelData.metadata.author || levelData.metadata.author.trim() === '') {
      levelData.metadata.author = 'Anonymous';
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
    console.log('💾 [LevelHandler] Starting saveLevelData for postId:', postId);
    
    try {
      const validation = this.validateLevelData(levelData);
      if (!validation.valid) {
        console.error('❌ [LevelHandler] Validation failed:', validation.error);
        return { success: false, message: validation.error || 'Invalid level data' };
      }
      console.log('✅ [LevelHandler] Level data validated successfully');

      // Add timestamp to metadata
      levelData.metadata.created = Date.now();

      // Store level data in Redis with postId as key
      const levelKey = `level:${postId}`;
      console.log('🔑 [LevelHandler] Redis key:', levelKey);
      console.log('📦 [LevelHandler] Level data size:', JSON.stringify(levelData).length, 'bytes');
      
      await redis.set(levelKey, JSON.stringify(levelData));
      console.log('✅ [LevelHandler] Level data saved to Redis successfully');

      // Verify the save by reading it back
      const savedData = await redis.get(levelKey);
      if (savedData) {
        console.log('✅ [LevelHandler] Verified: Data exists in Redis');
      } else {
        console.warn('⚠️ [LevelHandler] Warning: Data not found in Redis after save');
      }

      return { success: true, message: 'Level saved successfully' };
    } catch (error) {
      console.error('❌ [LevelHandler] Error saving level data:', error);
      if (error instanceof Error) {
        console.error('❌ [LevelHandler] Error details:', {
          message: error.message,
          stack: error.stack
        });
      }
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