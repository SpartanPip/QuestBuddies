import { LevelData, TILE_TYPES, ENEMY_TYPES, DEFAULT_LEVEL_SIZE } from '../../../shared/types/level';
import { LevelManager } from '../managers/LevelManager';
import { GridUtils } from '../utils/GridUtils';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  message: string;
}

/**
 * Centralized service for all level validation rules
 * Handles structural integrity, gameplay requirements, and level data validation
 */
export class LevelValidationService {
  private levelManager: LevelManager;

  constructor(levelManager: LevelManager) {
    this.levelManager = levelManager;
  }

  /**
   * Validates a complete level for structural integrity and gameplay requirements
   * @param levelData - The level data to validate
   * @returns ValidationResult with isValid flag and descriptive message
   */
  validateLevel(levelData: LevelData): ValidationResult {
    // Check if level data exists
    if (!levelData) {
      return { isValid: false, message: 'No level data found' };
    }

    // Check if spawn point is set
    if (!levelData.spawn) {
      return { isValid: false, message: 'Player spawn point is required' };
    }

    // Check if there's at least 1 enemy
    if (levelData.enemies.length === 0) {
      return { isValid: false, message: 'Level must have at least 1 enemy' };
    }

    // Check if spawn point is within level bounds
    const levelHeight = levelData.tiles.length;
    const levelWidth = levelData.tiles[0]?.length || 0;

    if (levelData.spawn.x < 0 || levelData.spawn.x >= levelWidth ||
      levelData.spawn.y < 0 || levelData.spawn.y >= levelHeight) {
      return { isValid: false, message: 'Spawn point is outside level bounds' };
    }

    // Check if spawn point is on a tile (not empty)
    const spawnTile = levelData.tiles[levelData.spawn.y]?.[levelData.spawn.x];
    if (spawnTile === undefined || spawnTile === TILE_TYPES.EMPTY) {
      return { isValid: false, message: 'Spawn point must be placed on a tile' };
    }

    // Validate level has some content (not completely empty)
    const hasNonEmptyTiles = levelData.tiles.some(row =>
      row.some(tile => tile !== TILE_TYPES.EMPTY)
    );

    if (!hasNonEmptyTiles) {
      return { isValid: false, message: 'Level must have some tiles' };
    }

    // Validate enemy positions are within bounds and on tiles
    for (const enemy of levelData.enemies) {
      if (enemy.x < 0 || enemy.x >= levelWidth ||
        enemy.y < 0 || enemy.y >= levelHeight) {
        return { isValid: false, message: 'Enemy position is outside level bounds' };
      }

      const enemyTile = levelData.tiles[enemy.y]?.[enemy.x];
      if (enemyTile === undefined || enemyTile === TILE_TYPES.EMPTY) {
        return { isValid: false, message: 'Enemy must be placed on a tile' };
      }
    }

    // Use LevelManager validation for additional checks
    try {
      this.levelManager.loadLevel(levelData);
      return { isValid: true, message: 'Level is valid' };
    } catch (error) {
      return {
        isValid: false,
        message: error instanceof Error ? error.message : 'Level validation failed'
      };
    }
  }

  /**
   * Validates spawn point placement
   * @param levelData - The level data
   * @param x - X coordinate of spawn point
   * @param y - Y coordinate of spawn point
   * @returns ValidationResult
   */
  validateSpawnPlacement(levelData: LevelData, x: number, y: number): ValidationResult {
    if (!levelData) {
      return { isValid: false, message: 'No level data found' };
    }

    const levelHeight = levelData.tiles.length;
    const levelWidth = levelData.tiles[0]?.length || 0;

    // Check bounds
    if (x < 0 || x >= levelWidth || y < 0 || y >= levelHeight) {
      return { isValid: false, message: 'Spawn point is outside level bounds' };
    }

    // Check if position has a tile
    const tile = levelData.tiles[y]?.[x];
    if (tile === undefined || tile === TILE_TYPES.EMPTY) {
      return { isValid: false, message: 'Spawn point must be placed on a tile' };
    }

    return { isValid: true, message: 'Spawn point placement is valid' };
  }

  /**
   * Validates enemy placement
   * @param levelData - The level data
   * @param x - X coordinate of enemy
   * @param y - Y coordinate of enemy
   * @returns ValidationResult
   */
  validateEnemyPlacement(levelData: LevelData, x: number, y: number): ValidationResult {
    if (!levelData) {
      return { isValid: false, message: 'No level data found' };
    }

    const levelHeight = levelData.tiles.length;
    const levelWidth = levelData.tiles[0]?.length || 0;

    // Check bounds
    if (x < 0 || x >= levelWidth || y < 0 || y >= levelHeight) {
      return { isValid: false, message: 'Enemy position is outside level bounds' };
    }

    // Check if position has a tile
    const tile = levelData.tiles[y]?.[x];
    if (tile === undefined || tile === TILE_TYPES.EMPTY) {
      return { isValid: false, message: 'Enemy must be placed on a tile' };
    }

    return { isValid: true, message: 'Enemy placement is valid' };
  }

  /**
   * Validates tile placement
   * @param levelData - The level data
   * @param x - X coordinate of tile
   * @param y - Y coordinate of tile
   * @returns ValidationResult
   */
  validateTilePlacement(levelData: LevelData, x: number, y: number): ValidationResult {
    if (!levelData) {
      return { isValid: false, message: 'No level data found' };
    }

    const levelHeight = levelData.tiles.length;
    const levelWidth = levelData.tiles[0]?.length || 0;

    // Check bounds
    if (x < 0 || x >= levelWidth || y < 0 || y >= levelHeight) {
      return { isValid: false, message: 'Tile position is outside level bounds' };
    }

    return { isValid: true, message: 'Tile placement is valid' };
  }

  /**
   * Validates level metadata
   * @param levelData - The level data
   * @returns ValidationResult
   */
  validateMetadata(levelData: LevelData): ValidationResult {
    if (!levelData) {
      return { isValid: false, message: 'No level data found' };
    }

    if (!levelData.metadata) {
      return { isValid: false, message: 'Level metadata is missing' };
    }

    if (!levelData.metadata.name || levelData.metadata.name.trim() === '') {
      return { isValid: false, message: 'Level name is required' };
    }

    if (!levelData.metadata.author || levelData.metadata.author.trim() === '') {
      return { isValid: false, message: 'Author name is required' };
    }

    return { isValid: true, message: 'Metadata is valid' };
  }

  /**
   * Validates that a level has minimum required content for gameplay
   * @param levelData - The level data
   * @returns ValidationResult
   */
  validateMinimumContent(levelData: LevelData): ValidationResult {
    if (!levelData) {
      return { isValid: false, message: 'No level data found' };
    }

    // Check for tiles
    const hasNonEmptyTiles = levelData.tiles.some(row =>
      row.some(tile => tile !== TILE_TYPES.EMPTY)
    );

    if (!hasNonEmptyTiles) {
      return { isValid: false, message: 'Level must have some tiles' };
    }

    // Check for enemies
    if (levelData.enemies.length === 0) {
      return { isValid: false, message: 'Level must have at least 1 enemy' };
    }

    // Check for spawn point
    if (!levelData.spawn) {
      return { isValid: false, message: 'Level must have a spawn point' };
    }

    return { isValid: true, message: 'Level has minimum required content' };
  }

  /**
   * Validates grid position bounds
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param levelWidth - Level width
   * @param levelHeight - Level height
   * @returns ValidationResult
   */
  validateGridPosition(x: number, y: number, levelWidth: number = DEFAULT_LEVEL_SIZE, levelHeight: number = DEFAULT_LEVEL_SIZE): ValidationResult {
    if (!GridUtils.isValidGridPosition(x, y, levelWidth, levelHeight)) {
      return { isValid: false, message: 'Position is outside level bounds' };
    }

    return { isValid: true, message: 'Position is valid' };
  }

  /**
   * Validates enemy type
   * @param enemyType - The enemy type to validate
   * @returns ValidationResult
   */
  validateEnemyType(enemyType: number): ValidationResult {
    if (!Object.values(ENEMY_TYPES).includes(enemyType)) {
      return { isValid: false, message: 'Invalid enemy type' };
    }

    return { isValid: true, message: 'Enemy type is valid' };
  }

  /**
   * Validates tile type
   * @param tileType - The tile type to validate
   * @returns ValidationResult
   */
  validateTileType(tileType: number): ValidationResult {
    if (!Object.values(TILE_TYPES).includes(tileType)) {
      return { isValid: false, message: 'Invalid tile type' };
    }

    return { isValid: true, message: 'Tile type is valid' };
  }

  /**
   * Validates level data structure integrity
   * @param levelData - The level data to validate
   * @returns ValidationResult
   */
  validateDataStructure(levelData: unknown): ValidationResult {
    if (!levelData || typeof levelData !== 'object') {
      return { isValid: false, message: 'Level data must be an object' };
    }

    const data = levelData as Record<string, unknown>;

    if (!Array.isArray(data.tiles) || data.tiles.length === 0) {
      return { isValid: false, message: 'Level must have tiles array' };
    }

    if (!Array.isArray(data.enemies)) {
      return { isValid: false, message: 'Level must have enemies array' };
    }

    const spawn = data.spawn as Record<string, unknown>;
    if (!spawn || typeof spawn.x !== 'number' || typeof spawn.y !== 'number') {
      return { isValid: false, message: 'Level must have valid spawn point' };
    }

    const metadata = data.metadata as Record<string, unknown>;
    if (!metadata || typeof metadata.name !== 'string' || typeof metadata.author !== 'string') {
      return { isValid: false, message: 'Level must have metadata with name and author' };
    }

    return { isValid: true, message: 'Data structure is valid' };
  }
}
