import { LevelData, Position } from '../../../shared/types/level';
import { StateValidationService } from '../services';
import { StorageUtils, CustomizationData } from '../utils/StorageUtils';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';

export type GameState = 'playing' | 'gameOver' | 'victory';

export interface GameplayStateData {
  levelData: LevelData | null;
  gameState: GameState;
  player: Player | null;
  enemies: Enemy[];
  playerHealth: number;
  maxPlayerHealth: number;
  levelWidth: number;
  levelHeight: number;
  lastPlayerDamageTime: Map<string, number>;
  playerDamageCooldown: number;
  isTestMode: boolean;
  customization: CustomizationData;
}

export class GameplayState {
  private levelData: LevelData | null = null;
  private gameState: GameState = 'playing';
  private player: Player | null = null;
  private enemies: Enemy[] = [];
  private playerHealth: number = 100;
  private maxPlayerHealth: number = 100;
  private levelWidth: number = 0;
  private levelHeight: number = 0;
  private lastPlayerDamageTime: Map<string, number> = new Map();
  private playerDamageCooldown: number = 1000; // 1 second cooldown
  private isTestMode: boolean = false;
  private customization: CustomizationData;
  
  private levelManager: LevelManager;
  private stateValidationService: StateValidationService;

  constructor() {
    this.levelManager = new LevelManager();
    this.stateValidationService = new StateValidationService();
    this.customization = StorageUtils.loadCustomization();
  }

  /**
   * Initialize gameplay state with level data
   */
  initializeLevelData(levelData?: LevelData): void {
    this.levelData = levelData || null;
    
    if (this.levelData) {
      this.levelWidth = this.levelData.tiles[0]?.length || 0;
      this.levelHeight = this.levelData.tiles.length || 0;
    }
    
    // Reset game state
    this.gameState = 'playing';
    this.enemies = [];
    this.player = null;
    this.lastPlayerDamageTime.clear();
  }

  /**
   * Set test mode
   */
  setTestMode(isTestMode: boolean): void {
    this.isTestMode = isTestMode;
  }

  /**
   * Get test mode
   */
  getTestMode(): boolean {
    return this.isTestMode;
  }

  /**
   * Set customization data
   */
  setCustomization(customization: CustomizationData): void {
    this.customization = customization;
  }

  /**
   * Get customization data
   */
  getCustomization(): CustomizationData {
    return this.customization;
  }

  /**
   * Set player instance
   */
  setPlayer(player: Player | null): void {
    this.player = player;
    if (player) {
      this.playerHealth = player.getHealth();
      this.maxPlayerHealth = player.getMaxHealth();
    }
  }

  /**
   * Get player instance
   */
  getPlayer(): Player | null {
    return this.player;
  }

  /**
   * Set enemies array
   */
  setEnemies(enemies: Enemy[]): void {
    this.enemies = enemies;
  }

  /**
   * Get enemies array
   */
  getEnemies(): Enemy[] {
    return this.enemies;
  }

  /**
   * Add enemy
   */
  addEnemy(enemy: Enemy): void {
    this.enemies.push(enemy);
  }

  /**
   * Remove enemy
   */
  removeEnemy(enemy: Enemy): void {
    const index = this.enemies.indexOf(enemy);
    if (index > -1) {
      this.enemies.splice(index, 1);
    }
  }

  /**
   * Set game state
   */
  setGameState(state: GameState): void {
    this.gameState = state;
  }

  /**
   * Get game state
   */
  getGameState(): GameState {
    return this.gameState;
  }

  /**
   * Update player health
   */
  updatePlayerHealth(health: number): void {
    this.playerHealth = health;
    if (this.player) {
      this.player.setHealth(health);
    }
  }

  /**
   * Get player health
   */
  getPlayerHealth(): number {
    return this.playerHealth;
  }

  /**
   * Get max player health
   */
  getMaxPlayerHealth(): number {
    return this.maxPlayerHealth;
  }

  /**
   * Check if player can take damage (cooldown check)
   */
  canPlayerTakeDamage(enemyId: string): boolean {
    const lastDamageTime = this.lastPlayerDamageTime.get(enemyId) || 0;
    const currentTime = Date.now();
    return currentTime - lastDamageTime >= this.playerDamageCooldown;
  }

  /**
   * Record player damage time
   */
  recordPlayerDamage(enemyId: string): void {
    this.lastPlayerDamageTime.set(enemyId, Date.now());
  }

  /**
   * Damage player
   */
  damagePlayer(enemyId: string, damage: number): boolean {
    if (!this.canPlayerTakeDamage(enemyId)) {
      return false;
    }

    this.playerHealth = Math.max(0, this.playerHealth - damage);
    this.recordPlayerDamage(enemyId);
    
    if (this.player) {
      this.player.setHealth(this.playerHealth);
    }

    // Check if player is dead
    if (this.playerHealth <= 0) {
      this.gameState = 'gameOver';
    }

    return true;
  }

  /**
   * Heal player
   */
  healPlayer(healAmount: number): void {
    this.playerHealth = Math.min(this.maxPlayerHealth, this.playerHealth + healAmount);
    if (this.player) {
      this.player.setHealth(this.playerHealth);
    }
  }

  /**
   * Check if all enemies are defeated
   */
  checkVictoryCondition(): boolean {
    return this.enemies.length === 0 && this.levelData !== null;
  }

  /**
   * Check if player is defeated
   */
  checkDefeatCondition(): boolean {
    return this.playerHealth <= 0;
  }

  /**
   * Update game state based on current conditions
   */
  updateGameState(): void {
    if (this.gameState === 'playing') {
      if (this.checkDefeatCondition()) {
        this.gameState = 'gameOver';
      } else if (this.checkVictoryCondition()) {
        this.gameState = 'victory';
      }
    }
  }

  /**
   * Get level data
   */
  getLevelData(): LevelData | null {
    return this.levelData;
  }

  /**
   * Set level data
   */
  setLevelData(levelData: LevelData | null): void {
    this.levelData = levelData;
    if (levelData) {
      this.levelWidth = levelData.tiles[0]?.length || 0;
      this.levelHeight = levelData.tiles.length || 0;
    }
  }

  /**
   * Get level dimensions
   */
  getLevelDimensions(): { width: number; height: number } {
    return { width: this.levelWidth, height: this.levelHeight };
  }

  /**
   * Reset game state to initial state
   */
  resetGameState(): void {
    this.gameState = 'playing';
    this.playerHealth = this.maxPlayerHealth;
    this.lastPlayerDamageTime.clear();
    this.enemies = [];
    this.player = null;
  }

  /**
   * Get state validation service instance
   */
  getStateValidationService(): StateValidationService {
    return this.stateValidationService;
  }

  /**
   * Get complete state data
   */
  getStateData(): GameplayStateData {
    return {
      levelData: this.levelData,
      gameState: this.gameState,
      player: this.player,
      enemies: this.enemies,
      playerHealth: this.playerHealth,
      maxPlayerHealth: this.maxPlayerHealth,
      levelWidth: this.levelWidth,
      levelHeight: this.levelHeight,
      lastPlayerDamageTime: this.lastPlayerDamageTime,
      playerDamageCooldown: this.playerDamageCooldown,
      isTestMode: this.isTestMode,
      customization: this.customization
    };
  }

  /**
   * Restore state from data
   */
  restoreStateData(data: Partial<GameplayStateData>): void {
    if (data.levelData !== undefined) {
      this.levelData = data.levelData;
    }
    if (data.gameState) {
      this.gameState = data.gameState;
    }
    if (data.player !== undefined) {
      this.player = data.player;
    }
    if (data.enemies) {
      this.enemies = data.enemies;
    }
    if (data.playerHealth !== undefined) {
      this.playerHealth = data.playerHealth;
    }
    if (data.maxPlayerHealth !== undefined) {
      this.maxPlayerHealth = data.maxPlayerHealth;
    }
    if (data.levelWidth !== undefined) {
      this.levelWidth = data.levelWidth;
    }
    if (data.levelHeight !== undefined) {
      this.levelHeight = data.levelHeight;
    }
    if (data.lastPlayerDamageTime) {
      this.lastPlayerDamageTime = data.lastPlayerDamageTime;
    }
    if (data.playerDamageCooldown !== undefined) {
      this.playerDamageCooldown = data.playerDamageCooldown;
    }
    if (data.isTestMode !== undefined) {
      this.isTestMode = data.isTestMode;
    }
    if (data.customization) {
      this.customization = data.customization;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.enemies = [];
    this.player = null;
    this.lastPlayerDamageTime.clear();
  }
}
