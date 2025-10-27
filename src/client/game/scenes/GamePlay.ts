import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import { LevelData, GRID_SIZE, Position } from '../../../shared/types/level';
import { GridUtils } from '../utils/GridUtils';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { PlayerHealthBar } from '../ui/HealthUI';
import { LevelManager } from '../managers/LevelManager';
import { ApiUtils } from '../utils/ApiUtils';
import { StorageUtils, CustomizationData } from '../utils/StorageUtils';
import { ColorTheme } from '../utils/ColorTheme';
import { GameplayUI, GameplayUICallbacks, LevelInfo } from '../ui/managers/GameplayUI';

export class GamePlay extends Scene {
  private camera: Phaser.Cameras.Scene2D.Camera;
  private uiCamera: Phaser.Cameras.Scene2D.Camera;
  private levelData: LevelData | null = null;
  private tilemapGraphics: Phaser.GameObjects.Graphics;
  private player: Player | null = null;
  private enemies: Enemy[] = [];
  private levelWidth: number = 0;
  private levelHeight: number = 0;
  private lastPlayerDamageTime: Map<string, number> = new Map();
  private playerDamageCooldown: number = 1000; // 1 second cooldown
  private playerHealthBar: PlayerHealthBar | null = null;
  private levelManager: LevelManager;
  private gameState: 'playing' | 'gameOver' | 'victory' = 'playing';
  private isTestMode: boolean = false;
  private customization: CustomizationData;
  private uiManager: GameplayUI;

  constructor() {
    super('GamePlay');
    this.levelManager = new LevelManager();
  }

  init(data: { levelData?: LevelData; isTestMode?: boolean; customization?: CustomizationData }) {
    this.levelData = data.levelData || null;
    this.isTestMode = data.isTestMode || false;
    // Store customization data for player creation
    // Load from storage if not provided to ensure latest customization is used
    this.customization = data.customization || StorageUtils.loadCustomization();
  }

  create() {
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(ColorTheme.BACKGROUND_DARK);

    // Create UI camera for elements that should not be affected by zoom/pan
    this.uiCamera = this.cameras.add(0, 0, this.camera.width, this.camera.height);
    this.uiCamera.setZoom(1.0); // Never zoom

    // Initialize physics world with temporary bounds
    if (this.physics && this.physics.world) {
      this.physics.world.setBounds(0, 0, 800, 600); // Temporary bounds
    }

    // Initialize UI manager with callbacks
    const uiCallbacks: GameplayUICallbacks = {
      onBackClick: () => {
        if (this.isTestMode) {
          this.scene.start('LevelBuilder');
        } else {
          this.scene.start('MainMenu');
        }
      },
      onRestartClick: () => {
        this.restartLevel();
      },
      onMenuClick: () => {
        if (this.isTestMode) {
          this.scene.start('LevelBuilder');
        } else {
          this.scene.start('MainMenu');
        }
      },
      onRetryClick: () => {
        void this.loadLevelFromReddit();
      }
    };

    this.uiManager = new GameplayUI(this, this.uiCamera, uiCallbacks, this.isTestMode);
    this.uiManager.createUI();

    // Configure camera rendering
    this.configureCameraRendering();

    if (this.levelData) {
      this.setupLevel();
    } else {
      void this.loadLevelFromReddit();
    }
  }


  private configureCameraRendering(): void {
    // Configure cameras to render different depth ranges to prevent duplicates
    // Main camera renders world objects (depth 0-999)
    this.camera.ignore(this.children.list.filter(child => 'depth' in child && (child as unknown as { depth: number }).depth >= 1000));
    
    // UI camera renders UI elements (depth 1000+)
    this.uiCamera.ignore(this.children.list.filter(child => 'depth' in child && (child as unknown as { depth: number }).depth < 1000));
    
    console.log('📷 Camera rendering configured:');
    console.log('  - Main camera: renders depths 0-999');
    console.log('  - UI camera: renders depths 1000+');
  }

  override update(time: number, delta: number) {
    if (this.gameState === 'playing' && this.player) {
      this.player.update(time, delta, this.enemies);
      this.updateCamera();
      this.updateEnemies(time, delta);
      this.updatePlayerHealthDisplay();
      this.checkGameState();
    }
  }

  private updateEnemies(time: number, delta: number): void {
    if (!this.player) return;
    
    // Update all enemies
    this.enemies.forEach(enemy => {
      if (enemy.active) {
        enemy.update(time, delta, this.player!, this.enemies);
      }
    });
    
    // Check for player-enemy collisions
    this.checkPlayerEnemyCollisions();
    
    // Remove destroyed enemies from array
    this.enemies = this.enemies.filter(enemy => enemy.active);
  }

  private updatePlayerHealthDisplay(): void {
    if (this.player && this.uiManager) {
      this.uiManager.updatePlayerHealth(this.player.getHealth(), this.player.getMaxHealth());
    }
  }

  private checkPlayerEnemyCollisions(): void {
    if (!this.player || !this.player.isAlive()) return;
    
    const playerPos = this.player.getPosition();
    const collisionRadius = 20; // Distance at which collision occurs
    
    this.enemies.forEach(enemy => {
      if (!enemy.active || !enemy.isAlive()) return;
      
      const distance = Phaser.Math.Distance.Between(
        playerPos.x, playerPos.y,
        enemy.x, enemy.y
      );
      
      if (distance <= collisionRadius) {
        this.handlePlayerEnemyCollision(enemy);
      }
    });
  }

  private handlePlayerEnemyCollision(enemy: Enemy): void {
    if (!this.player) return;
    
    const enemyId = enemy.getData('enemyId');
    const currentTime = Date.now();
    const lastDamage = this.lastPlayerDamageTime.get(enemyId) || 0;
    
    // Check damage cooldown
    if (currentTime - lastDamage >= this.playerDamageCooldown) {
      // Deal damage to player
      const enemyDamage = this.getEnemyDamage(enemy.getEnemyType());
      this.player.takeDamage(enemyDamage);
      
      // Update last damage time
      this.lastPlayerDamageTime.set(enemyId, currentTime);
      
      // Create collision effect
      this.createCollisionEffect(this.player.x, this.player.y);
      
      // Push enemy away slightly to prevent continuous collision
      this.pushEnemyAway(enemy, this.player.getPosition());
    }
  }

  private getEnemyDamage(enemyType: number): number {
    switch (enemyType) {
      case 1: // FAST
        return 8;
      case 2: // HEAVY
        return 15;
      case 0: // BASIC
      default:
        return 10;
    }
  }

  private createCollisionEffect(x: number, y: number): void {
    // Create a red flash effect at collision point
    const effect = this.add.arc(x, y, 15, 0, 360, false, ColorTheme.ERROR, 0.6);
    
    this.tweens.add({
      targets: effect,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        effect.destroy();
      }
    });
  }

  private pushEnemyAway(enemy: Enemy, playerPos: Position): void {
    const enemyPos = enemy.getPosition();
    const distance = Phaser.Math.Distance.Between(
      playerPos.x, playerPos.y,
      enemyPos.x, enemyPos.y
    );
    
    if (distance === 0) return;
    
    // Calculate push direction (away from player)
    const pushForce = 100;
    const directionX = (enemyPos.x - playerPos.x) / distance;
    const directionY = (enemyPos.y - playerPos.y) / distance;
    
    // Apply temporary velocity to push enemy away
    const body = enemy.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(
      directionX * pushForce,
      directionY * pushForce
    );
    
    // Reset velocity after a short time
    this.time.delayedCall(200, () => {
      if (enemy.active) {
        body.setVelocity(0, 0);
      }
    });
  }

  private updateCamera(): void {
    if (!this.player) return;

    const playerPos = this.player.getPosition();
    const screenWidth = this.cameras.main.width;
    const screenHeight = this.cameras.main.height;
    
    // Calculate world bounds in pixels
    const worldWidth = this.levelWidth * GRID_SIZE;
    const worldHeight = this.levelHeight * GRID_SIZE;

    // Only follow if the level is larger than the screen
    if (worldWidth > screenWidth || worldHeight > screenHeight) {
      // Calculate target camera position (centered on player)
      let targetX = playerPos.x - screenWidth / 2;
      let targetY = playerPos.y - screenHeight / 2;

      // Apply boundary constraints
      if (worldWidth > screenWidth) {
        targetX = Phaser.Math.Clamp(targetX, 0, worldWidth - screenWidth);
      } else {
        targetX = (worldWidth - screenWidth) / 2; // Center horizontally
      }

      if (worldHeight > screenHeight) {
        targetY = Phaser.Math.Clamp(targetY, 0, worldHeight - screenHeight);
      } else {
        targetY = (worldHeight - screenHeight) / 2; // Center vertically
      }

      // Smooth camera movement using lerp
      const lerpFactor = 0.1;
      const currentX = this.camera.scrollX;
      const currentY = this.camera.scrollY;
      
      const newX = Phaser.Math.Linear(currentX, targetX, lerpFactor);
      const newY = Phaser.Math.Linear(currentY, targetY, lerpFactor);
      
      this.camera.setScroll(newX, newY);
    } else {
      // If level is smaller than screen, center the camera
      this.camera.setScroll(
        (worldWidth - screenWidth) / 2,
        (worldHeight - screenHeight) / 2
      );
    }
  }

  private setupLevel(): void {
    if (!this.levelData) return;

    // Reset game state
    this.gameState = 'playing';

    // Initialize all gameplay systems in proper order
    this.renderTilemap();
    this.setupPlayer();
    this.setupEnemies();
    
    // Initialize combat and AI systems are handled by entity updates
    console.log('Level setup complete - all gameplay systems initialized');
  }

  private async loadLevelFromReddit(): Promise<void> {
    // Show loading indicator
    this.uiManager.showLoadingIndicator('Loading level...');

    try {
      // Check network connectivity first
      const networkStatus = await ApiUtils.getNetworkStatus();
      if (!networkStatus.online) {
        this.uiManager.hideLoadingIndicator();
        this.uiManager.showErrorMessage(`Network Error: ${networkStatus.message}. Using fallback level.`);
        
        // Load fallback level after a short delay
        this.time.delayedCall(2000, () => {
          const fallbackLevel = ApiUtils.createFallbackLevel();
          this.levelData = fallbackLevel;
          this.setupLevel();
          const levelInfo: LevelInfo = {
            name: fallbackLevel.metadata.name,
            author: fallbackLevel.metadata.author
          };
          this.uiManager.showLevelInfo(levelInfo);
        });
        return;
      }

      // Attempt to load level from Reddit post
      const levelData = await this.levelManager.loadLevelWithFallback();
      
      this.levelData = levelData;
      this.uiManager.hideLoadingIndicator();
      this.setupLevel();
      
      // Show level info briefly
      const levelInfo: LevelInfo = {
        name: levelData.metadata.name,
        author: levelData.metadata.author
      };
      this.uiManager.showLevelInfo(levelInfo);
    } catch (error) {
      console.error('Failed to load level:', error);
      this.uiManager.hideLoadingIndicator();
      this.uiManager.showErrorMessage('Failed to load level. Please try again.');
    }
  }


  private renderTilemap(): void {
    if (!this.levelData) return;

    // Create a container for all tiles
    const tilemapContainer = this.add.container(0, 0);
    
    for (let y = 0; y < this.levelData.tiles.length; y++) {
      for (let x = 0; x < this.levelData.tiles[y]!.length; x++) {
        const tileType = this.levelData.tiles[y]![x];
        if (tileType !== undefined && tileType !== 0) {
          const worldPos = GridUtils.gridToWorld(x, y);
          const tileSprite = this.createTileSprite(tileType, worldPos.x, worldPos.y);
          if (tileSprite) {
            tilemapContainer.add(tileSprite);
          }
        }
      }
    }
  }

  private createTileSprite(tileType: number, x: number, y: number): Phaser.GameObjects.Image | null {
    let spriteKey: string;
    
    switch (tileType) {
      case 1: // WALL - use dirt tiles
        spriteKey = `tile-dirt${Math.floor(Math.random() * 9) + 1}`;
        break;
      case 2: // FLOOR - use grass tiles
        spriteKey = `tile-grass${Math.floor(Math.random() * 9) + 1}`;
        break;
      case 3: // DECORATION - use alternating dirt/grass
        spriteKey = (x + y) % 2 === 0 ? 
          `tile-dirt${Math.floor(Math.random() * 9) + 1}` : 
          `tile-grass${Math.floor(Math.random() * 9) + 1}`;
        break;
      default:
        return null;
    }
    
    const tileSprite = this.add.image(x + GRID_SIZE/2, y + GRID_SIZE/2, spriteKey);
    tileSprite.setDisplaySize(GRID_SIZE, GRID_SIZE);
    return tileSprite;
  }

  private setupPlayer(): void {
    if (!this.levelData || !this.levelData.spawn) return;

    const spawnWorldPos = GridUtils.gridToWorldCenter(
      this.levelData.spawn.x, 
      this.levelData.spawn.y
    );

    // Store level dimensions
    this.levelWidth = this.levelData.tiles[0]?.length ?? 20;
    this.levelHeight = this.levelData.tiles.length ?? 20;

    // Create player instance with customization data
    this.player = new Player(this, spawnWorldPos.x, spawnWorldPos.y, this.customization);
    
    // Set physics world bounds based on level size
    if (this.physics && this.physics.world) {
      this.physics.world.setBounds(0, 0, this.levelWidth * GRID_SIZE, this.levelHeight * GRID_SIZE);
    }
    
    // Set camera bounds to match world bounds
    this.camera.setBounds(0, 0, this.levelWidth * GRID_SIZE, this.levelHeight * GRID_SIZE);
    
    // Initial camera setup
    this.setupInitialCamera();
  }

  private setupInitialCamera(): void {
    if (!this.player) return;

    const screenWidth = this.camera.width;
    const screenHeight = this.camera.height;
    const worldWidth = this.levelWidth * GRID_SIZE;
    const worldHeight = this.levelHeight * GRID_SIZE;

    // If level is smaller than screen, center it
    if (worldWidth <= screenWidth && worldHeight <= screenHeight) {
      this.camera.setScroll(
        (worldWidth - screenWidth) / 2,
        (worldHeight - screenHeight) / 2
      );
    } else {
      // Start camera centered on player
      const playerPos = this.player.getPosition();
      this.camera.centerOn(playerPos.x, playerPos.y);
    }
  }

  private setupEnemies(): void {
    if (!this.levelData) return;

    // Clear existing enemies
    this.enemies.forEach(enemy => enemy.destroy());
    this.enemies = [];
    this.lastPlayerDamageTime.clear();

    // Spawn enemies at positions defined in level data
    this.levelData.enemies.forEach((enemySpawn, index) => {
      const worldPos = GridUtils.gridToWorldCenter(enemySpawn.x, enemySpawn.y);
      const enemy = new Enemy(this, worldPos.x, worldPos.y, enemySpawn.type);
      
      // Set unique enemy ID for damage cooldown tracking
      enemy.setData('enemyId', `enemy_${index}_${Date.now()}`);
      
      this.enemies.push(enemy);
    });

    console.log(`Spawned ${this.enemies.length} enemies from level data`);
  }

  loadLevel(levelData: LevelData): void {
    this.levelData = levelData;
    
    // Clear existing level
    if (this.tilemapGraphics) {
      this.tilemapGraphics.destroy();
    }
    
    // Remove existing entities
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }
    
    // Clear enemies array
    this.enemies.forEach(enemy => enemy.destroy());
    this.enemies = [];

    this.setupLevel();
  }

  private checkGameState(): void {
    if (!this.player || this.gameState !== 'playing') return;

    // Check for game over condition (player health <= 0)
    if (!this.player.isAlive()) {
      this.gameState = 'gameOver';
      this.showGameOver();
      return;
    }

    // Check for victory condition (all enemies defeated)
    const aliveEnemies = this.enemies.filter(enemy => enemy.active && enemy.isAlive());
    if (aliveEnemies.length === 0 && this.levelData && this.levelData.enemies.length > 0) {
      this.gameState = 'victory';
      this.showVictory();
    }
  }

  private showGameOver(): void {
    this.uiManager.showGameOver();
  }

  private showVictory(): void {
    this.uiManager.showVictory();
  }

  private restartLevel(): void {
    // Reset game state
    this.gameState = 'playing';
    
    // Clear game state UI through UI manager
    this.uiManager.clearGameStateUI();

    // Reload the current level
    if (this.levelData) {
      this.loadLevel(this.levelData);
    }
  }

  shutdown(): void {
    if (this.playerHealthBar) {
      this.playerHealthBar.destroy();
      this.playerHealthBar = null;
    }
    
    // Clean up UI through UI manager
    this.uiManager.destroy();
  }
}