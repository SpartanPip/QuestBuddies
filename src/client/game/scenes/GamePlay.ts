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
  private backgroundZone: Phaser.GameObjects.Zone | null = null;
  private backgroundZoneHitCallback: ((hitArea: Phaser.Geom.Rectangle, x: number, y: number) => boolean) | null = null;

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
        console.log('🎮 [GamePlay] onBackClick callback called');
        
        // Disable scene input to stop all further input processing
        // This makes the hitAreaCallback return false even if called during cleanup
        // Do this before modifying the zone to prevent race conditions
        this.input.enabled = false;
        
        // Now safely disable the background zone
        if (this.backgroundZone && this.backgroundZone.input) {
          this.backgroundZone.input.enabled = false;
          this.backgroundZone.removeAllListeners();
        }
        
        // Defer scene transition to next frame to ensure current input processing completes
        // This allows Phaser to finish the current hitTestPointer cycle
        this.time.delayedCall(0, () => {
        console.log('🎮 [GamePlay] Starting MainMenu scene');
        this.scene.start('MainMenu');
        });
      },
      onRetryClick: () => {
        console.log('🎮 [GamePlay] onRetryClick callback called');
        void this.loadLevelFromReddit();
      }
    };

    this.uiManager = new GameplayUI(this, this.uiCamera, uiCallbacks, this.isTestMode);
    this.uiManager.createUI();

    // Configure camera rendering
    this.configureCameraRendering();
    
    // Setup click-to-move for player
    this.setupClickToMove();
    
    console.log('📷 Camera rendering configured');

    if (this.levelData) {
      this.setupLevel();
    } else {
      void this.loadLevelFromReddit();
    }
  }


  private configureCameraRendering(): void {
    // Configure UI camera to match main camera position
    // This ensures UI elements with scrollFactor(0) display correctly
    this.uiCamera.setScroll(this.camera.scrollX, this.camera.scrollY);
  }
  
  private setupClickToMove(): void {
    // Create an invisible background that captures clicks for player movement
    // This allows UI buttons (which have higher depth) to handle clicks first
    this.backgroundZone = this.add.zone(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height
    );
    
    // Set interactive with Rectangle hitArea and proper callback function
    // Zones require explicit hitArea with callback - they don't use default bounds automatically
    const hitArea = new Phaser.Geom.Rectangle(
      -this.cameras.main.width / 2,
      -this.cameras.main.height / 2,
      this.cameras.main.width,
      this.cameras.main.height
    );
    
    // Store callback reference so we can ensure it's always valid
    this.backgroundZoneHitCallback = (hitArea: Phaser.Geom.Rectangle, x: number, y: number) => {
      // If input is disabled or zone is being cleaned up, always return false
      if (!this.input.enabled || this.gameState !== 'playing') {
        return false;
      }
      return Phaser.Geom.Rectangle.Contains(hitArea, x, y);
    };
    
    this.backgroundZone.setInteractive(hitArea, this.backgroundZoneHitCallback);
    this.backgroundZone.setDepth(0); // Lowest depth so UI can be on top
    this.backgroundZone.setOrigin(0.5, 0.5);
    
    this.backgroundZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      console.log('🎮 [GamePlay] Background zone clicked');
      
      // Only move if game is playing
      if (this.gameState !== 'playing' || !this.player) {
        return;
      }
      
      // Convert pointer position to world coordinates
      const worldX = this.camera.scrollX + pointer.worldX;
      const worldY = this.camera.scrollY + pointer.worldY;
      
      console.log('🎮 [GamePlay] Moving player to:', worldX, worldY);
      
      // Set the target position for the player
      this.player.setTargetPosition(worldX, worldY);
    });
  }

  override update(time: number, delta: number) {
    if (this.gameState === 'playing' && this.player) {
      this.player.update(time, delta, this.enemies);
      this.updateCamera();
      this.updateEnemies(time, delta);
      // Player health bar now updates itself as part of the player entity
      // this.updatePlayerHealthDisplay();
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

    // Calculate target camera position (centered on player)
    const targetX = playerPos.x - screenWidth / 2;
    const targetY = playerPos.y - screenHeight / 2;

    // Smooth camera movement using lerp
    const lerpFactor = 0.1;
    const currentX = this.camera.scrollX;
    const currentY = this.camera.scrollY;
    
    const newX = Phaser.Math.Linear(currentX, targetX, lerpFactor);
    const newY = Phaser.Math.Linear(currentY, targetY, lerpFactor);
    
    // Update main camera
    this.camera.setScroll(newX, newY);
    
    // Update UI camera to match (so UI elements with scrollFactor don't duplicate)
    this.uiCamera.setScroll(newX, newY);
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
    if (!this.levelData || !this.levelData.spawn) {
      return;
    }

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
      const worldWidth = this.levelWidth * GRID_SIZE;
      const worldHeight = this.levelHeight * GRID_SIZE;
      this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    }
    
    // Initial camera setup
    this.setupInitialCamera();
  }

  private setupInitialCamera(): void {
    if (!this.player) return;

    // Start camera centered on player
    const playerPos = this.player.getPosition();
    this.camera.centerOn(playerPos.x, playerPos.y);
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
    console.log('🎮 [GamePlay] showGameOver called');
    console.log('🎮 [GamePlay] UI Manager:', this.uiManager);
    
    // Display game over UI
    this.uiManager.showGameOver();
    
    // Wait 2 seconds before returning to menu
    this.time.delayedCall(2000, () => {
      console.log('🎮 [GamePlay] Returning to menu after game over');
      
      // Safely disable background zone pointer events first
      if (this.backgroundZone && this.backgroundZone.input) {
        this.backgroundZone.input.enabled = false;
        this.backgroundZone.removeAllListeners();
      }
      
      // Disable scene input to stop all further input processing
      this.input.enabled = false;
      
      // Defer scene transition to next frame
      this.time.delayedCall(0, () => {
      if (this.isTestMode) {
        this.scene.start('LevelBuilder');
      } else {
        this.scene.start('MainMenu');
      }
      });
    });
  }

  private showVictory(): void {
    console.log('🎮 [GamePlay] showVictory called');
    console.log('🎮 [GamePlay] UI Manager:', this.uiManager);
    
    // Display victory UI
    this.uiManager.showVictory();
    
    // Wait 2 seconds before returning to menu
    this.time.delayedCall(2000, () => {
      console.log('🎮 [GamePlay] Returning to menu after victory');
      
      // Safely disable background zone pointer events first
      if (this.backgroundZone && this.backgroundZone.input) {
        this.backgroundZone.input.enabled = false;
        this.backgroundZone.removeAllListeners();
      }
      
      // Disable scene input to stop all further input processing
      this.input.enabled = false;
      
      // Defer scene transition to next frame
      this.time.delayedCall(0, () => {
      if (this.isTestMode) {
        this.scene.start('LevelBuilder');
      } else {
        this.scene.start('MainMenu');
      }
      });
    });
  }


  shutdown(): void {
    // Safely clean up background zone during shutdown
    // Disable input first, then clean up to prevent callback errors
    if (this.backgroundZone) {
      if (this.backgroundZone.input) {
        this.backgroundZone.input.enabled = false;
      }
      this.backgroundZone.removeAllListeners();
      this.backgroundZone.removeInteractive();
      this.backgroundZone.destroy();
      this.backgroundZone = null;
    }
    
    // Clear callback reference
    this.backgroundZoneHitCallback = null;
    
    if (this.playerHealthBar) {
      this.playerHealthBar.destroy();
      this.playerHealthBar = null;
    }
    
    // Clean up UI through UI manager
    this.uiManager.destroy();
  }
}