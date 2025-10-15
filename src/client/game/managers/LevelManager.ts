import { LevelData, Position, EnemySpawn, TILE_TYPES, DEFAULT_LEVEL_SIZE } from '../../../shared/types/level';
import { ApiUtils } from '../utils/ApiUtils';

export class LevelManager {
  private currentLevel: LevelData | null = null;
  private isDirty: boolean = false;

  constructor() {
    this.currentLevel = null;
  }

  /**
   * Creates a new empty level with default settings
   */
  createNewLevel(name: string = 'Untitled Level', author: string = 'Anonymous'): LevelData {
    const newLevel: LevelData = {
      tiles: this.createEmptyTileGrid(DEFAULT_LEVEL_SIZE, DEFAULT_LEVEL_SIZE),
      enemies: [],
      spawn: { x: 5, y: 5 }, // Default spawn position
      metadata: {
        name,
        author,
        created: Date.now()
      }
    };

    this.currentLevel = newLevel;
    this.isDirty = false;
    return newLevel;
  }

  /**
   * Loads level data and validates its structure
   */
  loadLevel(levelData: any): LevelData {
    const validatedLevel = this.validateLevelData(levelData);
    this.currentLevel = validatedLevel;
    this.isDirty = false;
    return validatedLevel;
  }

  /**
   * Gets the current level data
   */
  getCurrentLevel(): LevelData | null {
    return this.currentLevel;
  }

  /**
   * Updates the current level and marks it as dirty
   */
  updateLevel(levelData: Partial<LevelData>): void {
    if (!this.currentLevel) {
      throw new Error('No level loaded to update');
    }

    this.currentLevel = { ...this.currentLevel, ...levelData };
    this.isDirty = true;
  }

  /**
   * Serializes the current level to JSON string
   */
  serializeLevel(): string {
    if (!this.currentLevel) {
      throw new Error('No level to serialize');
    }

    return JSON.stringify(this.currentLevel, null, 2);
  }

  /**
   * Deserializes JSON string to level data with validation
   */
  deserializeLevel(jsonString: string): LevelData {
    try {
      const parsed = JSON.parse(jsonString);
      return this.validateLevelData(parsed);
    } catch (error) {
      throw new Error(`Failed to deserialize level: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validates level data structure and content
   */
  private validateLevelData(data: any): LevelData {
    if (!data || typeof data !== 'object') {
      throw new Error('Level data must be an object');
    }

    // Validate tiles array
    if (!Array.isArray(data.tiles)) {
      throw new Error('Level tiles must be a 2D array');
    }

    if (data.tiles.length === 0) {
      throw new Error('Level must have at least one row of tiles');
    }

    const rowLength = data.tiles[0].length;
    if (rowLength === 0) {
      throw new Error('Level must have at least one column of tiles');
    }

    // Validate all rows have same length and contain valid tile types
    for (let i = 0; i < data.tiles.length; i++) {
      if (!Array.isArray(data.tiles[i]) || data.tiles[i].length !== rowLength) {
        throw new Error(`Row ${i} has invalid length. All rows must have ${rowLength} tiles`);
      }

      for (let j = 0; j < data.tiles[i].length; j++) {
        const tile = data.tiles[i][j];
        if (!Number.isInteger(tile) || tile < 0) {
          throw new Error(`Invalid tile type at position (${i}, ${j}): ${tile}`);
        }
      }
    }

    // Validate enemies array
    if (!Array.isArray(data.enemies)) {
      throw new Error('Level enemies must be an array');
    }

    for (let i = 0; i < data.enemies.length; i++) {
      const enemy = data.enemies[i];
      if (!this.isValidEnemySpawn(enemy)) {
        throw new Error(`Invalid enemy data at index ${i}`);
      }
    }

    // Validate spawn point
    if (!this.isValidPosition(data.spawn)) {
      throw new Error('Invalid spawn point position');
    }

    // Validate metadata
    if (!data.metadata || typeof data.metadata !== 'object') {
      throw new Error('Level metadata is required');
    }

    if (typeof data.metadata.name !== 'string' || data.metadata.name.trim().length === 0) {
      throw new Error('Level name is required and must be a non-empty string');
    }

    if (typeof data.metadata.author !== 'string') {
      throw new Error('Level author must be a string');
    }

    if (!Number.isInteger(data.metadata.created) || data.metadata.created <= 0) {
      throw new Error('Level created timestamp must be a positive integer');
    }

    return data as LevelData;
  }

  /**
   * Validates if a position object is valid
   */
  private isValidPosition(pos: any): pos is Position {
    return pos && 
           typeof pos === 'object' && 
           Number.isInteger(pos.x) && 
           Number.isInteger(pos.y) && 
           pos.x >= 0 && 
           pos.y >= 0;
  }

  /**
   * Validates if an enemy spawn object is valid
   */
  private isValidEnemySpawn(enemy: any): enemy is EnemySpawn {
    return enemy && 
           typeof enemy === 'object' &&
           Number.isInteger(enemy.x) && 
           Number.isInteger(enemy.y) && 
           enemy.x >= 0 && 
           enemy.y >= 0 &&
           Number.isInteger(enemy.type) && 
           enemy.type >= 0;
  }

  /**
   * Creates an empty tile grid filled with EMPTY tiles
   */
  private createEmptyTileGrid(width: number, height: number): number[][] {
    const grid: number[][] = [];
    for (let y = 0; y < height; y++) {
      const row: number[] = [];
      for (let x = 0; x < width; x++) {
        row.push(TILE_TYPES.EMPTY);
      }
      grid.push(row);
    }
    return grid;
  }

  /**
   * Checks if the current level has unsaved changes
   */
  isDirtyLevel(): boolean {
    return this.isDirty;
  }

  /**
   * Marks the current level as saved (not dirty)
   */
  markAsSaved(): void {
    this.isDirty = false;
  }

  /**
   * Gets level dimensions
   */
  getLevelDimensions(): { width: number; height: number } | null {
    if (!this.currentLevel || !this.currentLevel.tiles.length) {
      return null;
    }

    return {
      width: this.currentLevel.tiles[0]?.length || 0,
      height: this.currentLevel.tiles.length
    };
  }

  /**
   * Saves the current level to Reddit and creates a new post
   */
  async saveLevelToReddit(): Promise<{ success: boolean; message: string; postId?: string }> {
    if (!this.currentLevel) {
      return { success: false, message: 'No level to save' };
    }

    const result = await ApiUtils.saveLevelToReddit(this.currentLevel);
    
    if (result.success) {
      this.markAsSaved();
    }
    
    return result;
  }

  /**
   * Loads level data from the current Reddit post
   */
  async loadLevelFromReddit(): Promise<{ success: boolean; message: string; levelData?: LevelData }> {
    const result = await ApiUtils.loadLevelFromReddit();
    
    if (result.success && result.levelData) {
      try {
        // Validate the loaded level data
        const validatedLevel = this.validateLevelData(result.levelData);
        this.currentLevel = validatedLevel;
        this.isDirty = false;
        
        return {
          success: true,
          message: 'Level loaded successfully',
          levelData: validatedLevel
        };
      } catch (error) {
        console.error('Level validation failed:', error);
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Level validation failed'
        };
      }
    }
    
    return result;
  }

  /**
   * Loads level with fallback handling
   */
  async loadLevelWithFallback(): Promise<LevelData> {
    const result = await this.loadLevelFromReddit();
    
    if (result.success && result.levelData) {
      return result.levelData;
    }
    
    // If loading fails, create and return fallback level
    console.warn('Failed to load level from Reddit, using fallback:', result.message);
    const fallbackLevel = ApiUtils.createFallbackLevel();
    this.currentLevel = fallbackLevel;
    this.isDirty = false;
    
    return fallbackLevel;
  }
}