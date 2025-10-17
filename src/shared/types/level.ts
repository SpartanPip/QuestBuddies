export interface Position {
  x: number;
  y: number;
}

export interface EnemySpawn {
  x: number;
  y: number;
  type: number;
}

export interface LevelData {
  tiles: number[][];
  tileSprites: (string | null)[][]; // Store sprite information for each tile, null for empty tiles
  enemies: EnemySpawn[];
  spawn: Position | null; // Spawn point can be null if not set
  metadata: {
    name: string;
    author: string;
    created: number;
  };
}

export interface GameEntity {
  id: string;
  position: Position;
  health: number;
  maxHealth: number;
}

export interface PlayerEntity extends GameEntity {
  weapon: WeaponEntity;
}

export interface EnemyEntity extends GameEntity {
  type: number;
  targetPosition: Position;
}

export interface WeaponEntity {
  damage: number;
  range: number;
  angle: number;
  rotationSpeed: number;
}

export const TILE_TYPES = {
  EMPTY: 0,
  WALL: 1,
  FLOOR: 2,
  DECORATION: 3
} as const;

export const ENEMY_TYPES = {
  BASIC: 0,
  FAST: 1,
  HEAVY: 2
} as const;

export const GRID_SIZE = 32;
export const DEFAULT_LEVEL_SIZE = 50;