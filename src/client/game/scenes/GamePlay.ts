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

export class GamePlay extends Scene {
  private camera: Phaser.Cameras.Scene2D.Camera;
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
  private loadingText: Phaser.GameObjects.Text | null = null;
  private gameState: 'playing' | 'gameOver' | 'victory' = 'playing';
  private gameStateText: Phaser.GameObjects.Text | null = null;
  private restartButton: Phaser.GameObjects.Text | null = null;
  private menuButton: Phaser.GameObjects.Text | null = null;
  private isTestMode: boolean = false;
  private backToBuilderButton: Phaser.GameObjects.Text | null = null;
  private customization: CustomizationData;

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

    // Enable physics
    this.physics.world.setBounds(0, 0, 0, 0); // Will be set when level loads

    // Create player health bar
    this.playerHealthBar = new PlayerHealthBar(this);

    if (this.levelData) {
      this.setupLevel();
    } else {
      this.loadLevelFromReddit();
    }

    // Add back to builder button if in test mode
    if (this.isTestMode) {
      this.createBackToBuilderButton();
    }
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
    if (this.player && this.playerHealthBar) {
      this.playerHealthBar.updateHealth(this.player.getHealth(), this.player.getMaxHealth());
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
    this.showLoadingIndicator('Loading level...');

    try {
      // Check network connectivity first
      const networkStatus = await ApiUtils.getNetworkStatus();
      if (!networkStatus.online) {
        this.hideLoadingIndicator();
        this.showErrorMessage(`Network Error: ${networkStatus.message}. Using fallback level.`);
        
        // Load fallback level after a short delay
        this.time.delayedCall(2000, () => {
          const fallbackLevel = ApiUtils.createFallbackLevel();
          this.levelData = fallbackLevel;
          this.setupLevel();
          this.showLevelInfo(fallbackLevel);
        });
        return;
      }

      // Attempt to load level from Reddit post
      const levelData = await this.levelManager.loadLevelWithFallback();
      
      this.levelData = levelData;
      this.hideLoadingIndicator();
      this.setupLevel();
      
      // Show level info briefly
      this.showLevelInfo(levelData);
    } catch (error) {
      console.error('Failed to load level:', error);
      this.hideLoadingIndicator();
      this.showErrorMessage('Failed to load level. Please try again.');
    }
  }

  private showLoadingIndicator(message: string): void {
    // Create loading overlay
    const overlayStyle = ColorTheme.getOverlayStyle(0.8);
    const overlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      overlayStyle.color,
      overlayStyle.alpha
    ).setOrigin(0.5).setScrollFactor(0).setDepth(3000);

    // Loading text
    this.loadingText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 30,
      message,
      {
        ...ColorTheme.getTextStyle('medium'),
        fontStyle: 'bold'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(3001);

    // Loading spinner/progress bar
    const progressBar = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 20,
      200,
      8,
      ColorTheme.SECONDARY_DARK
    ).setOrigin(0.5).setScrollFactor(0).setDepth(3001);

    const progressFill = this.add.rectangle(
      this.cameras.main.centerX - 100,
      this.cameras.main.centerY + 20,
      0,
      8,
      ColorTheme.SUCCESS
    ).setOrigin(0, 0.5).setScrollFactor(0).setDepth(3002);

    // Animate progress bar
    this.tweens.add({
      targets: progressFill,
      width: 200,
      duration: 2000,
      ease: 'Power2',
      repeat: -1,
      yoyo: true
    });

    // Store references for cleanup
    this.loadingText.setData('overlay', overlay);
    this.loadingText.setData('progressBar', progressBar);
    this.loadingText.setData('progressFill', progressFill);
  }

  private hideLoadingIndicator(): void {
    if (this.loadingText) {
      // Clean up all loading UI elements
      const overlay = this.loadingText.getData('overlay');
      const progressBar = this.loadingText.getData('progressBar');
      const progressFill = this.loadingText.getData('progressFill');

      if (overlay) overlay.destroy();
      if (progressBar) progressBar.destroy();
      if (progressFill) progressFill.destroy();
      
      this.loadingText.destroy();
      this.loadingText = null;
    }
  }

  private createBackToBuilderButton(): void {
    this.backToBuilderButton = this.add.text(
      this.cameras.main.width - 20,
      20,
      'Back to Builder',
      {
        ...ColorTheme.getTextStyle('small'),
        backgroundColor: `#${ColorTheme.BUTTON_WARNING.toString(16).padStart(6, '0')}`,
        padding: { x: 10, y: 5 }
      }
    ).setOrigin(1, 0).setScrollFactor(0).setDepth(1000).setInteractive();

    this.backToBuilderButton.on('pointerdown', () => {
      this.scene.start('LevelBuilder');
    });

    this.backToBuilderButton.on('pointerover', () => {
      this.backToBuilderButton!.setStyle({ 
        backgroundColor: `#${ColorTheme.BUTTON_WARNING_HOVER.toString(16).padStart(6, '0')}` 
      });
    });

    this.backToBuilderButton.on('pointerout', () => {
      this.backToBuilderButton!.setStyle({ 
        backgroundColor: `#${ColorTheme.BUTTON_WARNING.toString(16).padStart(6, '0')}` 
      });
    });
  }

  private showLevelInfo(levelData: LevelData): void {
    const infoText = this.add.text(
      20,
      20,
      `Level: ${levelData.metadata.name}\nBy: ${levelData.metadata.author}`,
      {
        ...ColorTheme.getTextStyle('small'),
        backgroundColor: `rgba(${(ColorTheme.BACKGROUND_OVERLAY >> 16) & 255}, ${(ColorTheme.BACKGROUND_OVERLAY >> 8) & 255}, ${ColorTheme.BACKGROUND_OVERLAY & 255}, 0.7)`,
        padding: { x: 10, y: 5 }
      }
    ).setDepth(1000);

    // Auto-hide after 3 seconds
    this.time.delayedCall(3000, () => {
      if (infoText && infoText.active) {
        this.tweens.add({
          targets: infoText,
          alpha: 0,
          duration: 500,
          onComplete: () => infoText.destroy()
        });
      }
    });
  }

  private showErrorMessage(message: string): void {
    // Create error overlay
    const overlayStyle = ColorTheme.getOverlayStyle(0.8);
    const overlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      overlayStyle.color,
      overlayStyle.alpha
    ).setOrigin(0.5).setScrollFactor(0).setDepth(3000);

    // Error icon (X)
    const errorIcon = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 60,
      '✖',
      {
        fontSize: '48px',
        color: `#${ColorTheme.ERROR.toString(16).padStart(6, '0')}`
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(3001);

    // Error message
    const errorText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 10,
      message,
      {
        fontSize: '18px',
        color: ColorTheme.TEXT_PRIMARY,
        backgroundColor: `#${ColorTheme.ERROR.toString(16).padStart(6, '0')}`,
        padding: { x: 20, y: 10 },
        wordWrap: { width: 400 },
        align: 'center'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(3001);

    // Retry button
    const retryButton = this.add.text(
      this.cameras.main.centerX - 60,
      this.cameras.main.centerY + 50,
      'Retry',
      {
        ...ColorTheme.getTextStyle('small'),
        backgroundColor: `#${ColorTheme.BUTTON_SECONDARY.toString(16).padStart(6, '0')}`,
        padding: { x: 15, y: 8 }
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(3001).setInteractive();

    // Menu button
    const menuButton = this.add.text(
      this.cameras.main.centerX + 60,
      this.cameras.main.centerY + 50,
      this.isTestMode ? 'Back to Builder' : 'Menu',
      {
        ...ColorTheme.getTextStyle('small'),
        backgroundColor: `#${ColorTheme.BUTTON_SECONDARY.toString(16).padStart(6, '0')}`,
        padding: { x: 15, y: 8 }
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(3001).setInteractive();

    // Button interactions
    retryButton.on('pointerdown', () => {
      overlay.destroy();
      errorIcon.destroy();
      errorText.destroy();
      retryButton.destroy();
      menuButton.destroy();
      this.loadLevelFromReddit();
    });

    menuButton.on('pointerdown', () => {
      if (this.isTestMode) {
        this.scene.start('LevelBuilder');
      } else {
        this.scene.start('MainMenu');
      }
    });

    // Hover effects
    retryButton.on('pointerover', () => retryButton.setStyle({ 
      backgroundColor: `#${ColorTheme.BUTTON_SECONDARY_HOVER.toString(16).padStart(6, '0')}` 
    }));
    retryButton.on('pointerout', () => retryButton.setStyle({ 
      backgroundColor: `#${ColorTheme.BUTTON_SECONDARY.toString(16).padStart(6, '0')}` 
    }));
    menuButton.on('pointerover', () => menuButton.setStyle({ 
      backgroundColor: `#${ColorTheme.BUTTON_SECONDARY_HOVER.toString(16).padStart(6, '0')}` 
    }));
    menuButton.on('pointerout', () => menuButton.setStyle({ 
      backgroundColor: `#${ColorTheme.BUTTON_SECONDARY.toString(16).padStart(6, '0')}` 
    }));
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
    if (!this.levelData) return;

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
    this.physics.world.setBounds(0, 0, this.levelWidth * GRID_SIZE, this.levelHeight * GRID_SIZE);
    
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
    // Create semi-transparent overlay
    const overlayStyle = ColorTheme.getOverlayStyle(0.7);
    this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      overlayStyle.color,
      overlayStyle.alpha
    ).setScrollFactor(0).setDepth(2000);

    // Game over text
    this.gameStateText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 50,
      'GAME OVER',
      {
        ...ColorTheme.getTextStyle('xlarge'),
        color: `#${ColorTheme.ERROR.toString(16).padStart(6, '0')}`,
        fontStyle: 'bold'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

    // Restart button
    this.restartButton = this.add.text(
      this.cameras.main.centerX - 80,
      this.cameras.main.centerY + 50,
      'Restart',
      {
        ...ColorTheme.getTextStyle('medium'),
        backgroundColor: `#${ColorTheme.BUTTON_SECONDARY.toString(16).padStart(6, '0')}`,
        padding: { x: 20, y: 10 }
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2001).setInteractive();

    this.restartButton.on('pointerdown', () => {
      this.restartLevel();
    });

    // Menu/Back button
    const menuButtonText = this.isTestMode ? 'Back to Builder' : 'Menu';
    this.menuButton = this.add.text(
      this.cameras.main.centerX + 80,
      this.cameras.main.centerY + 50,
      menuButtonText,
      {
        fontSize: '24px',
        color: '#ffffff',
        backgroundColor: '#333333',
        padding: { x: 20, y: 10 }
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2001).setInteractive();

    this.menuButton.on('pointerdown', () => {
      if (this.isTestMode) {
        this.scene.start('LevelBuilder');
      } else {
        this.scene.start('MainMenu');
      }
    });
  }

  private showVictory(): void {
    // Create semi-transparent overlay
    const overlayStyle = ColorTheme.getOverlayStyle(0.7);
    this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      overlayStyle.color,
      overlayStyle.alpha
    ).setScrollFactor(0).setDepth(2000);

    // Victory text
    this.gameStateText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 50,
      'VICTORY!',
      {
        ...ColorTheme.getTextStyle('xlarge'),
        color: `#${ColorTheme.SUCCESS.toString(16).padStart(6, '0')}`,
        fontStyle: 'bold'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

    // Victory message
    this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 10,
      'All enemies defeated!',
      {
        ...ColorTheme.getTextStyle('medium')
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

    // Restart button
    this.restartButton = this.add.text(
      this.cameras.main.centerX - 80,
      this.cameras.main.centerY + 50,
      'Play Again',
      {
        ...ColorTheme.getTextStyle('medium'),
        backgroundColor: `#${ColorTheme.BUTTON_SECONDARY.toString(16).padStart(6, '0')}`,
        padding: { x: 20, y: 10 }
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2001).setInteractive();

    this.restartButton.on('pointerdown', () => {
      this.restartLevel();
    });

    // Menu/Back button
    const menuButtonText = this.isTestMode ? 'Back to Builder' : 'Menu';
    this.menuButton = this.add.text(
      this.cameras.main.centerX + 80,
      this.cameras.main.centerY + 50,
      menuButtonText,
      {
        fontSize: '24px',
        color: '#ffffff',
        backgroundColor: '#333333',
        padding: { x: 20, y: 10 }
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2001).setInteractive();

    this.menuButton.on('pointerdown', () => {
      if (this.isTestMode) {
        this.scene.start('LevelBuilder');
      } else {
        this.scene.start('MainMenu');
      }
    });
  }

  private restartLevel(): void {
    // Reset game state
    this.gameState = 'playing';
    
    // Clear game state UI
    if (this.gameStateText) {
      this.gameStateText.destroy();
      this.gameStateText = null;
    }
    if (this.restartButton) {
      this.restartButton.destroy();
      this.restartButton = null;
    }
    if (this.menuButton) {
      this.menuButton.destroy();
      this.menuButton = null;
    }

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
    
    // Clean up game state UI
    if (this.gameStateText) {
      this.gameStateText.destroy();
      this.gameStateText = null;
    }
    if (this.restartButton) {
      this.restartButton.destroy();
      this.restartButton = null;
    }
    if (this.menuButton) {
      this.menuButton.destroy();
      this.menuButton = null;
    }
    if (this.backToBuilderButton) {
      this.backToBuilderButton.destroy();
      this.backToBuilderButton = null;
    }
  }
}