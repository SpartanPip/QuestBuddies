import { Position, GRID_SIZE } from '../../../shared/types/level';

export class GridUtils {
  static snapToGrid(x: number, y: number): Position {
    return {
      x: Math.floor(x / GRID_SIZE) * GRID_SIZE,
      y: Math.floor(y / GRID_SIZE) * GRID_SIZE
    };
  }

  static worldToGrid(x: number, y: number): Position {
    return {
      x: Math.floor(x / GRID_SIZE),
      y: Math.floor(y / GRID_SIZE)
    };
  }

  static gridToWorld(gridX: number, gridY: number): Position {
    return {
      x: gridX * GRID_SIZE,
      y: gridY * GRID_SIZE
    };
  }

  static gridToWorldCenter(gridX: number, gridY: number): Position {
    return {
      x: gridX * GRID_SIZE + GRID_SIZE / 2,
      y: gridY * GRID_SIZE + GRID_SIZE / 2
    };
  }

  static isValidGridPosition(gridX: number, gridY: number, levelWidth: number, levelHeight: number): boolean {
    return gridX >= 0 && gridX < levelWidth && gridY >= 0 && gridY < levelHeight;
  }

  static getGridDistance(pos1: Position, pos2: Position): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}