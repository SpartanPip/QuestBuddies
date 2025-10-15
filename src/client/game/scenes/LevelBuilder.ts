import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import { LevelData, TILE_TYPES, ENEMY_TYPES, GRID_SIZE, DEFAULT_LEVEL_SIZE } from '../../../shared/types/level';
import { GridUtils } from '../utils/GridUtils';
import { LevelManager } from '../managers/LevelManager';
import { StorageUtils, CustomizationData } from '../utils/StorageUtils';
import { ColorTheme } from '../utils/ColorTheme';

export class LevelBuilder extends Scene {
  private camera: Phaser.Cameras.Scene2D.Camera;
  private levelData: LevelData;
  private gridGraphics: Phaser.GameObjects.Graphics;
  private selectedTileType: number = TILE_TYPES.WALL;
  private isDragging: boolean = false;
  private placementMode: 'tile' | 'enemy' | 'spawn' = 'tile';
  private selectedEnemyType: number = 0;
  private levelManager: LevelManager;
  private autosaveTimer: number | null = null;
  private customization: CustomizationData;

  constructor() {
    super('LevelBuilder');
    this.levelManager = new LevelManager();
  }

  create() {
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(ColorTheme.BACKGROUND_DARK);

    this.initializeLevelData();
    this.setupGrid();
    this.setupInput();
    this.setupUI();
    this.setupAutosave();
  }

  private initializeLevelData(): void {
    // Check for backup first
    const backup = StorageUtils.loadFromLocalStorage();
    if (backup && this.shouldLoadBackup()) {
      this.levelData = this.levelManager.loadLevel(backup);
    } else {
      this.levelData = this.levelManager.createNewLevel('New Level', 'Player');
    }
  }

  private shouldLoadBackup(): boolean {
    // Simple confirmation - in a real app you might show a modal
    return confirm('Found a backup level. Would you like to restore it?');
  }

  private setupGrid(): void {
    this.gridGraphics = this.add.graphics();
    this.drawGrid();
    this.renderExistingLevel();
  }

  private renderExistingLevel(): void {
    if (!this.levelData) return;
    
    // Render existing tiles
    for (let y = 0; y < this.levelData.tiles.length; y++) {
      const row = this.levelData.tiles[y];
      if (!row) continue;
      for (let x = 0; x < row.length; x++) {
        if (row[x] !== TILE_TYPES.EMPTY) {
          this.renderTileAt(x, y);
        }
      }
    }
    
    // Render existing enemies
    this.levelData.enemies.forEach(enemy => {
      this.renderEnemyAt(enemy.x, enemy.y, enemy.type);
    });
    
    // Render spawn point
    if (this.levelData.spawn) {
      this.renderSpawnAt(this.levelData.spawn.x, this.levelData.spawn.y);
    }
  }

  private drawGrid(): void {
    this.gridGraphics.clear();
    this.gridGraphics.lineStyle(1, 0x555555, 0.5);

    const levelPixelWidth = DEFAULT_LEVEL_SIZE * GRID_SIZE;
    const levelPixelHeight = DEFAULT_LEVEL_SIZE * GRID_SIZE;

    // Draw vertical lines
    for (let x = 0; x <= levelPixelWidth; x += GRID_SIZE) {
      this.gridGraphics.moveTo(x, 0);
      this.gridGraphics.lineTo(x, levelPixelHeight);
    }

    // Draw horizontal lines
    for (let y = 0; y <= levelPixelHeight; y += GRID_SIZE) {
      this.gridGraphics.moveTo(0, y);
      this.gridGraphics.lineTo(levelPixelWidth, y);
    }

    this.gridGraphics.strokePath();
  }

  private setupInput(): void {
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);

    // Enhanced camera controls for navigating large levels
    this.setupCameraControls();
  }

  private setupCameraControls(): void {
    const cameraSpeed = 8;
    const levelPixelWidth = DEFAULT_LEVEL_SIZE * GRID_SIZE;
    const levelPixelHeight = DEFAULT_LEVEL_SIZE * GRID_SIZE;

    // Set camera bounds to prevent scrolling beyond level
    this.camera.setBounds(0, 0, levelPixelWidth, levelPixelHeight);

    if (this.input.keyboard) {
      // Smooth camera movement with bounds checking

      this.input.keyboard.on('keydown', (event: KeyboardEvent) => {
        switch (event.code) {
          case 'KeyW':
          case 'ArrowUp':
            this.camera.scrollY = Math.max(0, this.camera.scrollY - cameraSpeed);
            break;
          case 'KeyS':
          case 'ArrowDown':
            this.camera.scrollY = Math.min(levelPixelHeight - this.camera.height, this.camera.scrollY + cameraSpeed);
            break;
          case 'KeyA':
          case 'ArrowLeft':
            this.camera.scrollX = Math.max(0, this.camera.scrollX - cameraSpeed);
            break;
          case 'KeyD':
          case 'ArrowRight':
            this.camera.scrollX = Math.min(levelPixelWidth - this.camera.width, this.camera.scrollX + cameraSpeed);
            break;
        }
      });
    }

    // Mouse wheel zoom (optional enhancement)
    this.input.on('wheel', (_pointer: any, _gameObjects: any, _deltaX: number, deltaY: number) => {
      const zoomFactor = deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Phaser.Math.Clamp(this.camera.zoom * zoomFactor, 0.5, 2);
      this.camera.setZoom(newZoom);
    });
  }

  private setupUI(): void {
    this.createTileToolbar();
    this.createPlacementModeToolbar();
    this.createSaveToolbar();
  }

  private createTileToolbar(): void {
    const toolbar = this.add.container(10, 10);
    toolbar.setName('toolbar');
    
    // Tile type buttons with visual indicators
    const tileButtons = [
      { type: TILE_TYPES.EMPTY, color: 0x333333, label: 'Empty' },
      { type: TILE_TYPES.WALL, color: 0x666666, label: 'Wall' },
      { type: TILE_TYPES.FLOOR, color: 0x888888, label: 'Floor' },
      { type: TILE_TYPES.DECORATION, color: 0xAAAAAAA, label: 'Decor' }
    ];

    tileButtons.forEach((buttonData, index) => {
      const x = index * 80;
      
      // Button background
      const button = this.add.rectangle(x, 0, 70, 50, buttonData.color)
        .setInteractive()
        .setStrokeStyle(2, ColorTheme.BORDER_PRIMARY);
      
      // Button label
      const label = this.add.text(x, 25, buttonData.label, {
        ...ColorTheme.getTextStyle('small'),
        fontSize: '12px'
      }).setOrigin(0.5);

      // Click handler
      button.on('pointerdown', () => {
        this.selectedTileType = buttonData.type;
        this.updateToolbarSelection();
      });

      // Hover effects
      button.on('pointerover', () => button.setStrokeStyle(3, ColorTheme.SUCCESS));
      button.on('pointerout', () => {
        const isSelected = this.selectedTileType === buttonData.type;
        button.setStrokeStyle(isSelected ? 3 : 2, isSelected ? ColorTheme.SUCCESS : ColorTheme.BORDER_PRIMARY);
      });

      toolbar.add([button, label]);
    });

    // Instructions text
    const instructions = this.add.text(10, 70, 'WASD: Move Camera | Mouse: Place Tiles | Scroll: Zoom', {
      ...ColorTheme.getTextStyle('small', 'secondary'),
      fontSize: '14px'
    });

    toolbar.add(instructions);
    toolbar.setScrollFactor(0);
    
    // Initial selection highlight
    this.updateToolbarSelection();
  }

  private createPlacementModeToolbar(): void {
    const modeToolbar = this.add.container(10, 120);
    modeToolbar.setName('modeToolbar');
    
    // Mode selection buttons
    const modes = [
      { mode: 'tile', color: 0x4444AA, label: 'Tiles' },
      { mode: 'enemy', color: 0xAA4444, label: 'Enemies' },
      { mode: 'spawn', color: 0x44AA44, label: 'Spawn' }
    ];

    modes.forEach((modeData, index) => {
      const x = index * 90;
      
      const button = this.add.rectangle(x, 0, 80, 40, modeData.color)
        .setInteractive()
        .setStrokeStyle(2, ColorTheme.BORDER_PRIMARY);
      
      const label = this.add.text(x, 0, modeData.label, {
        ...ColorTheme.getTextStyle('small'),
        fontSize: '12px'
      }).setOrigin(0.5);

      button.on('pointerdown', () => {
        this.placementMode = modeData.mode as 'tile' | 'enemy' | 'spawn';
        this.updateModeSelection();
      });

      button.on('pointerover', () => button.setStrokeStyle(3, ColorTheme.SUCCESS));
      button.on('pointerout', () => {
        const isSelected = this.placementMode === modeData.mode;
        button.setStrokeStyle(isSelected ? 3 : 2, isSelected ? ColorTheme.SUCCESS : ColorTheme.BORDER_PRIMARY);
      });

      modeToolbar.add([button, label]);
    });

    // Enemy type selector (only visible in enemy mode)
    const enemyTypeToolbar = this.add.container(10, 170);
    enemyTypeToolbar.setName('enemyTypeToolbar');
    
    const enemyTypes = [
      { type: ENEMY_TYPES.BASIC, color: 0xFF6666, label: 'Basic' },
      { type: ENEMY_TYPES.FAST, color: 0x66FF66, label: 'Fast' },
      { type: ENEMY_TYPES.HEAVY, color: 0x6666FF, label: 'Heavy' }
    ];

    enemyTypes.forEach((enemyData, index) => {
      const x = index * 70;
      
      const button = this.add.rectangle(x, 0, 60, 30, enemyData.color)
        .setInteractive()
        .setStrokeStyle(1, ColorTheme.BORDER_PRIMARY);
      
      const label = this.add.text(x, 0, enemyData.label, {
        ...ColorTheme.getTextStyle('small'),
        fontSize: '10px'
      }).setOrigin(0.5);

      button.on('pointerdown', () => {
        this.selectedEnemyType = enemyData.type;
        this.updateEnemyTypeSelection();
      });

      enemyTypeToolbar.add([button, label]);
    });

    modeToolbar.setScrollFactor(0);
    enemyTypeToolbar.setScrollFactor(0);
    
    this.updateModeSelection();
    this.updateEnemyTypeSelection();
  }

  private updateToolbarSelection(): void {
    // Update visual feedback for selected tile type
    const toolbar = this.children.getByName('toolbar') as Phaser.GameObjects.Container;
    if (toolbar && toolbar.list) {
      toolbar.list.forEach((child, index) => {
        if (child instanceof Phaser.GameObjects.Rectangle && index < 4) {
          const isSelected = index === this.selectedTileType;
          child.setStrokeStyle(isSelected ? 3 : 2, isSelected ? ColorTheme.SUCCESS : ColorTheme.BORDER_PRIMARY);
        }
      });
    }
  }

  private updateModeSelection(): void {
    const modeToolbar = this.children.getByName('modeToolbar') as Phaser.GameObjects.Container;
    const enemyTypeToolbar = this.children.getByName('enemyTypeToolbar') as Phaser.GameObjects.Container;
    
    if (modeToolbar && modeToolbar.list) {
      const modes = ['tile', 'enemy', 'spawn'];
      modeToolbar.list.forEach((child, index) => {
        if (child instanceof Phaser.GameObjects.Rectangle && index < 3) {
          const isSelected = modes[index] === this.placementMode;
          child.setStrokeStyle(isSelected ? 3 : 2, isSelected ? ColorTheme.SUCCESS : ColorTheme.BORDER_PRIMARY);
        }
      });
    }

    // Show/hide enemy type selector based on mode
    if (enemyTypeToolbar) {
      enemyTypeToolbar.setVisible(this.placementMode === 'enemy');
    }
  }

  private updateEnemyTypeSelection(): void {
    const enemyTypeToolbar = this.children.getByName('enemyTypeToolbar') as Phaser.GameObjects.Container;
    if (enemyTypeToolbar && enemyTypeToolbar.list) {
      enemyTypeToolbar.list.forEach((child, index) => {
        if (child instanceof Phaser.GameObjects.Rectangle && index < 3) {
          const isSelected = index === this.selectedEnemyType;
          child.setStrokeStyle(isSelected ? 2 : 1, isSelected ? ColorTheme.SUCCESS : ColorTheme.BORDER_PRIMARY);
        }
      });
    }
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    this.isDragging = true;
    this.handlePlacement(pointer.worldX, pointer.worldY);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.isDragging && this.placementMode === 'tile') {
      this.handlePlacement(pointer.worldX, pointer.worldY);
    }
  }

  private onPointerUp(): void {
    this.isDragging = false;
  }

  private handlePlacement(worldX: number, worldY: number): void {
    switch (this.placementMode) {
      case 'tile':
        this.placeTile(worldX, worldY);
        break;
      case 'enemy':
        this.placeEnemy(worldX, worldY);
        break;
      case 'spawn':
        this.placeSpawn(worldX, worldY);
        break;
    }
  }

  private placeTile(worldX: number, worldY: number): void {
    if (!this.levelData) return;
    
    const gridPos = GridUtils.worldToGrid(worldX, worldY);
    
    if (GridUtils.isValidGridPosition(gridPos.x, gridPos.y, DEFAULT_LEVEL_SIZE, DEFAULT_LEVEL_SIZE)) {
      const row = this.levelData.tiles[gridPos.y];
      if (row && row[gridPos.x] !== this.selectedTileType) {
        row[gridPos.x] = this.selectedTileType;
        this.renderTileAt(gridPos.x, gridPos.y);
        this.updateLevelManager();
      }
    }
  }

  private renderTileAt(gridX: number, gridY: number): void {
    if (!this.levelData) return;
    
    const worldPos = GridUtils.gridToWorld(gridX, gridY);
    const row = this.levelData.tiles[gridY];
    if (!row) return;
    
    const tileType = row[gridX];
    const tileKey = `tile_${gridX}_${gridY}`;
    
    // Remove existing tile at this position
    const existingTile = this.children.getByName(tileKey);
    if (existingTile) {
      existingTile.destroy();
    }

    // Add new tile if not empty
    if (tileType !== undefined && tileType !== TILE_TYPES.EMPTY) {
      const tileSprite = this.createTileSprite(tileType, worldPos.x, worldPos.y, gridX, gridY);
      if (tileSprite) {
        tileSprite.setName(tileKey);
      }
    }
  }

  private createTileSprite(tileType: number, x: number, y: number, gridX: number, gridY: number): Phaser.GameObjects.Image | null {
    let spriteKey: string;
    
    switch (tileType) {
      case TILE_TYPES.WALL: // WALL - use dirt tiles
        spriteKey = `tile-dirt${((gridX + gridY) % 9) + 1}`; // Deterministic pattern
        break;
      case TILE_TYPES.FLOOR: // FLOOR - use grass tiles
        spriteKey = `tile-grass${((gridX + gridY) % 9) + 1}`; // Deterministic pattern
        break;
      case TILE_TYPES.DECORATION: // DECORATION - use alternating dirt/grass
        spriteKey = (gridX + gridY) % 2 === 0 ? 
          `tile-dirt${((gridX + gridY) % 9) + 1}` : 
          `tile-grass${((gridX + gridY) % 9) + 1}`;
        break;
      default:
        return null;
    }
    
    const tileSprite = this.add.image(x + GRID_SIZE/2, y + GRID_SIZE/2, spriteKey);
    tileSprite.setDisplaySize(GRID_SIZE, GRID_SIZE);
    
    // Add visual distinction for different tile types in builder
    if (tileType === TILE_TYPES.DECORATION) {
      tileSprite.setTint(0xCCCCCC); // Slightly lighter tint for decoration tiles
    }
    
    return tileSprite;
  }

  private placeEnemy(worldX: number, worldY: number): void {
    if (!this.levelData) return;
    
    const gridPos = GridUtils.worldToGrid(worldX, worldY);
    
    if (GridUtils.isValidGridPosition(gridPos.x, gridPos.y, DEFAULT_LEVEL_SIZE, DEFAULT_LEVEL_SIZE)) {
      // Check if enemy already exists at this position
      const existingEnemyIndex = this.levelData.enemies.findIndex(
        enemy => enemy.x === gridPos.x && enemy.y === gridPos.y
      );
      
      if (existingEnemyIndex >= 0) {
        // Remove existing enemy
        this.levelData.enemies.splice(existingEnemyIndex, 1);
        this.removeEnemyVisual(gridPos.x, gridPos.y);
      } else {
        // Add new enemy
        this.levelData.enemies.push({
          x: gridPos.x,
          y: gridPos.y,
          type: this.selectedEnemyType
        });
        this.renderEnemyAt(gridPos.x, gridPos.y, this.selectedEnemyType);
      }
      this.updateLevelManager();
    }
  }

  private placeSpawn(worldX: number, worldY: number): void {
    if (!this.levelData) return;
    
    const gridPos = GridUtils.worldToGrid(worldX, worldY);
    
    if (GridUtils.isValidGridPosition(gridPos.x, gridPos.y, DEFAULT_LEVEL_SIZE, DEFAULT_LEVEL_SIZE)) {
      // Remove previous spawn point visual
      this.removeSpawnVisual();
      
      // Update spawn position (only one spawn point allowed)
      this.levelData.spawn = { x: gridPos.x, y: gridPos.y };
      this.renderSpawnAt(gridPos.x, gridPos.y);
      this.updateLevelManager();
    }
  }

  private renderEnemyAt(gridX: number, gridY: number, enemyType: number): void {
    const worldPos = GridUtils.gridToWorldCenter(gridX, gridY);
    const enemyKey = `enemy_${gridX}_${gridY}`;
    
    // Enemy sprite and properties based on type
    let spriteKey: string;
    let scale: number;
    let tint: number;
    
    switch (enemyType) {
      case ENEMY_TYPES.FAST:
        spriteKey = 'enemy-bug2';
        scale = 0.25;
        tint = 0xff6600;
        break;
      case ENEMY_TYPES.HEAVY:
        spriteKey = 'enemy-bug3';
        scale = 0.35;
        tint = 0x660066;
        break;
      case ENEMY_TYPES.BASIC:
      default:
        spriteKey = 'enemy-bug1';
        scale = 0.3;
        tint = 0xff0000;
        break;
    }
    
    const enemy = this.add.image(worldPos.x, worldPos.y, spriteKey);
    enemy.setScale(scale);
    enemy.setTint(tint);
    enemy.setName(enemyKey);
    
    // Add type indicator
    const typeText = this.add.text(worldPos.x, worldPos.y + 20, enemyType.toString(), {
      ...ColorTheme.getTextStyle('small'),
      fontSize: '10px',
      backgroundColor: `#${ColorTheme.BACKGROUND_OVERLAY.toString(16).padStart(6, '0')}`,
      padding: { x: 2, y: 1 }
    }).setOrigin(0.5);
    typeText.setName(`${enemyKey}_text`);
  }

  private renderSpawnAt(gridX: number, gridY: number): void {
    const worldPos = GridUtils.gridToWorldCenter(gridX, gridY);
    const spawnKey = 'spawn_point';
    
    // Use player sprite as spawn indicator based on customization
    const avatarSprite = `player-${this.customization.avatar}`;
    const spawn = this.add.image(worldPos.x, worldPos.y, avatarSprite);
    spawn.setScale(0.4);
    spawn.setTint(0x44AA44);
    spawn.setAlpha(0.8);
    spawn.setName(spawnKey);
    
    const spawnText = this.add.text(worldPos.x, worldPos.y + 25, 'SPAWN', {
      ...ColorTheme.getTextStyle('small'),
      fontSize: '8px',
      backgroundColor: `#${ColorTheme.SUCCESS.toString(16).padStart(6, '0')}`,
      padding: { x: 3, y: 1 }
    }).setOrigin(0.5);
    spawnText.setName(`${spawnKey}_text`);
  }

  private removeEnemyVisual(gridX: number, gridY: number): void {
    const enemyKey = `enemy_${gridX}_${gridY}`;
    const enemy = this.children.getByName(enemyKey);
    const enemyText = this.children.getByName(`${enemyKey}_text`);
    
    if (enemy) enemy.destroy();
    if (enemyText) enemyText.destroy();
  }

  private removeSpawnVisual(): void {
    const spawn = this.children.getByName('spawn_point');
    const spawnText = this.children.getByName('spawn_point_text');
    
    if (spawn) spawn.destroy();
    if (spawnText) spawnText.destroy();
  }

  private createSaveToolbar(): void {
    const saveToolbar = this.add.container(10, 220);
    saveToolbar.setName('saveToolbar');
    
    // Test Level button
    const testButton = this.add.rectangle(0, 0, 100, 40, ColorTheme.BUTTON_WARNING)
      .setInteractive()
      .setStrokeStyle(2, ColorTheme.BORDER_PRIMARY);
    
    const testLabel = this.add.text(0, 0, 'Test Level', {
      ...ColorTheme.getTextStyle('small'),
      fontSize: '14px'
    }).setOrigin(0.5);

    testButton.on('pointerdown', () => this.testLevel());
    testButton.on('pointerover', () => testButton.setStrokeStyle(3, ColorTheme.SUCCESS));
    testButton.on('pointerout', () => testButton.setStrokeStyle(2, ColorTheme.BORDER_PRIMARY));

    // Save & Post button
    const saveButton = this.add.rectangle(110, 0, 120, 40, ColorTheme.BUTTON_SUCCESS)
      .setInteractive()
      .setStrokeStyle(2, ColorTheme.BORDER_PRIMARY);
    
    const saveLabel = this.add.text(110, 0, 'Save & Post', {
      ...ColorTheme.getTextStyle('small'),
      fontSize: '14px'
    }).setOrigin(0.5);

    saveButton.on('pointerdown', () => this.saveAndPost());
    saveButton.on('pointerover', () => saveButton.setStrokeStyle(3, ColorTheme.SUCCESS));
    saveButton.on('pointerout', () => saveButton.setStrokeStyle(2, ColorTheme.BORDER_PRIMARY));

    // Export JSON button
    const exportButton = this.add.rectangle(240, 0, 100, 40, ColorTheme.BUTTON_PRIMARY)
      .setInteractive()
      .setStrokeStyle(2, ColorTheme.BORDER_PRIMARY);
    
    const exportLabel = this.add.text(240, 0, 'Export JSON', {
      ...ColorTheme.getTextStyle('small'),
      fontSize: '14px'
    }).setOrigin(0.5);

    exportButton.on('pointerdown', () => this.exportLevel());
    exportButton.on('pointerover', () => exportButton.setStrokeStyle(3, ColorTheme.SUCCESS));
    exportButton.on('pointerout', () => exportButton.setStrokeStyle(2, ColorTheme.BORDER_PRIMARY));

    // Clear Level button
    const clearButton = this.add.rectangle(350, 0, 100, 40, ColorTheme.ERROR)
      .setInteractive()
      .setStrokeStyle(2, ColorTheme.BORDER_PRIMARY);
    
    const clearLabel = this.add.text(350, 0, 'Clear Level', {
      ...ColorTheme.getTextStyle('small'),
      fontSize: '14px'
    }).setOrigin(0.5);

    clearButton.on('pointerdown', () => this.clearLevel());
    clearButton.on('pointerover', () => clearButton.setStrokeStyle(3, ColorTheme.SUCCESS));
    clearButton.on('pointerout', () => clearButton.setStrokeStyle(2, ColorTheme.BORDER_PRIMARY));

    saveToolbar.add([testButton, testLabel, saveButton, saveLabel, exportButton, exportLabel, clearButton, clearLabel]);
    saveToolbar.setScrollFactor(0);

    // Status text
    const statusText = this.add.text(10, 270, 'Autosave: ON | Test Level to play | Save & Post to share on Reddit', {
      ...ColorTheme.getTextStyle('small', 'secondary'),
      fontSize: '12px'
    });
    statusText.setScrollFactor(0);
  }

  private setupAutosave(): void {
    this.autosaveTimer = StorageUtils.createAutosaveTimer(() => {
      this.updateLevelManager();
      return this.levelManager.getCurrentLevel();
    });
  }

  private updateLevelManager(): void {
    if (this.levelData) {
      this.levelManager.updateLevel(this.levelData);
    }
  }

  private testLevel(): void {
    try {
      // Validate level before testing
      const validationResult = this.validateLevel();
      if (!validationResult.isValid) {
        this.showMessage(`Cannot test level: ${validationResult.message}`, 0xAA4444);
        return;
      }

      // Update level manager with current data
      this.updateLevelManager();
      
      // Show transition message
      this.showMessage('Starting level test...', 0xAA44AA);
      
      // Transition to gameplay scene with current level data
      this.time.delayedCall(500, () => {
        this.scene.start('GamePlay', { 
          levelData: this.levelData, 
          isTestMode: true, 
          customization: this.customization 
        });
      });
      
    } catch (error) {
      console.error('Failed to test level:', error);
      this.showMessage('Failed to start level test', 0xAA4444);
    }
  }

  private validateLevel(): { isValid: boolean; message: string } {
    if (!this.levelData) {
      return { isValid: false, message: 'No level data found' };
    }

    // Check if spawn point is set
    if (!this.levelData.spawn) {
      return { isValid: false, message: 'Player spawn point is required' };
    }

    // Check if spawn point is within level bounds
    const levelHeight = this.levelData.tiles.length;
    const levelWidth = this.levelData.tiles[0]?.length || 0;
    
    if (this.levelData.spawn.x < 0 || this.levelData.spawn.x >= levelWidth ||
        this.levelData.spawn.y < 0 || this.levelData.spawn.y >= levelHeight) {
      return { isValid: false, message: 'Spawn point is outside level bounds' };
    }

    // Check if spawn point is on a walkable tile (not a wall)
    const spawnTile = this.levelData.tiles[this.levelData.spawn.y]?.[this.levelData.spawn.x];
    if (spawnTile === TILE_TYPES.WALL) {
      return { isValid: false, message: 'Spawn point cannot be on a wall tile' };
    }

    // Validate level has some content (not completely empty)
    const hasNonEmptyTiles = this.levelData.tiles.some(row => 
      row.some(tile => tile !== TILE_TYPES.EMPTY)
    );
    
    if (!hasNonEmptyTiles && this.levelData.enemies.length === 0) {
      return { isValid: false, message: 'Level must have some tiles or enemies' };
    }

    // Validate enemy positions are within bounds and not on walls
    for (const enemy of this.levelData.enemies) {
      if (enemy.x < 0 || enemy.x >= levelWidth ||
          enemy.y < 0 || enemy.y >= levelHeight) {
        return { isValid: false, message: 'Enemy position is outside level bounds' };
      }
      
      const enemyTile = this.levelData.tiles[enemy.y]?.[enemy.x];
      if (enemyTile === TILE_TYPES.WALL) {
        return { isValid: false, message: 'Enemy cannot be placed on a wall tile' };
      }
    }

    // Use LevelManager validation for additional checks
    try {
      this.levelManager.loadLevel(this.levelData);
      return { isValid: true, message: 'Level is valid' };
    } catch (error) {
      return { 
        isValid: false, 
        message: error instanceof Error ? error.message : 'Level validation failed' 
      };
    }
  }

  private async saveAndPost(): Promise<void> {
    let progressContainer: Phaser.GameObjects.Container | null = null;
    
    try {
      // Step 1: Validate level
      progressContainer = this.showProgressMessage('Validating level...', 10);
      
      const validationResult = this.validateLevel();
      if (!validationResult.isValid) {
        if (progressContainer) progressContainer.destroy();
        this.showMessage(`Cannot save level: ${validationResult.message}`, 0xAA4444, 5000);
        return;
      }

      // Step 2: Get metadata
      this.updateProgressMessage(progressContainer, 'Checking level metadata...', 25);
      
      if (!this.promptForLevelMetadata()) {
        if (progressContainer) progressContainer.destroy();
        return; // User cancelled
      }
      
      // Step 3: Prepare data
      this.updateProgressMessage(progressContainer, 'Preparing level data...', 40);
      this.updateLevelManager();
      
      // Step 4: Create backup
      this.updateProgressMessage(progressContainer, 'Creating backup...', 55);
      StorageUtils.saveToLocalStorage(this.levelData);
      
      // Step 5: Upload to Reddit
      this.updateProgressMessage(progressContainer, 'Uploading to Reddit...', 70);
      
      const result = await this.levelManager.saveLevelToReddit();
      
      // Step 6: Process result
      this.updateProgressMessage(progressContainer, 'Finalizing...', 90);
      
      if (result.success) {
        // Mark as saved
        this.levelManager.markAsSaved();
        
        this.updateProgressMessage(progressContainer, 'Success!', 100);
        
        // Show success feedback
        setTimeout(() => {
          if (progressContainer) progressContainer.destroy();
          const message = result.postId 
            ? `Level saved! Post ID: ${result.postId}` 
            : 'Level saved successfully!';
          this.showMessage(message, 0x44AA44, 4000);
        }, 500);
        
        // Clear local backup since it's now saved to Reddit
        StorageUtils.clearLocalStorage();
      } else {
        if (progressContainer) progressContainer.destroy();
        this.showMessage(`Save failed: ${result.message}`, 0xAA4444, 5000);
      }
      
    } catch (error) {
      console.error('Failed to save level:', error);
      if (progressContainer) progressContainer.destroy();
      
      // Show detailed error message with retry option
      this.showRetryableError('Failed to save level', error instanceof Error ? error.message : 'Unknown error', () => {
        this.saveAndPost();
      });
    }
  }

  private showRetryableError(title: string, details: string, retryCallback: () => void): void {
    // Create error overlay
    const overlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.8
    ).setOrigin(0.5).setScrollFactor(0).setDepth(3000);

    // Error container
    const errorContainer = this.add.container(this.cameras.main.centerX, this.cameras.main.centerY);
    errorContainer.setScrollFactor(0).setDepth(3001);

    // Error background
    const background = this.add.rectangle(0, 0, 400, 200, ColorTheme.ERROR, 0.9);
    background.setStrokeStyle(3, ColorTheme.ERROR);

    // Error title
    const titleText = this.add.text(0, -60, title, {
      ...ColorTheme.getTextStyle('medium'),
      fontSize: '20px',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Error details
    const detailsText = this.add.text(0, -20, details, {
      ...ColorTheme.getTextStyle('small'),
      fontSize: '14px',
      wordWrap: { width: 350 },
      align: 'center'
    }).setOrigin(0.5);

    // Retry button
    const retryButton = this.add.text(-60, 40, 'Retry', {
      ...ColorTheme.getTextStyle('small'),
      fontSize: '16px',
      backgroundColor: `#${ColorTheme.BUTTON_SECONDARY.toString(16).padStart(6, '0')}`,
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();

    // Cancel button
    const cancelButton = this.add.text(60, 40, 'Cancel', {
      ...ColorTheme.getTextStyle('small'),
      fontSize: '16px',
      backgroundColor: `#${ColorTheme.BUTTON_SECONDARY_HOVER.toString(16).padStart(6, '0')}`,
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();

    errorContainer.add([background, titleText, detailsText, retryButton, cancelButton]);

    // Button interactions
    retryButton.on('pointerdown', () => {
      overlay.destroy();
      errorContainer.destroy();
      retryCallback();
    });

    cancelButton.on('pointerdown', () => {
      overlay.destroy();
      errorContainer.destroy();
    });

    // Hover effects
    retryButton.on('pointerover', () => retryButton.setStyle({ 
      backgroundColor: `#${ColorTheme.BUTTON_SECONDARY_HOVER.toString(16).padStart(6, '0')}` 
    }));
    retryButton.on('pointerout', () => retryButton.setStyle({ 
      backgroundColor: `#${ColorTheme.BUTTON_SECONDARY.toString(16).padStart(6, '0')}` 
    }));
    cancelButton.on('pointerover', () => cancelButton.setStyle({ 
      backgroundColor: `#${ColorTheme.SECONDARY_LIGHT.toString(16).padStart(6, '0')}` 
    }));
    cancelButton.on('pointerout', () => cancelButton.setStyle({ 
      backgroundColor: `#${ColorTheme.BUTTON_SECONDARY_HOVER.toString(16).padStart(6, '0')}` 
    }));
  }

  private promptForLevelMetadata(): boolean {
    // Check if metadata needs updating
    const currentName = this.levelData.metadata.name;
    const currentAuthor = this.levelData.metadata.author;
    
    if (currentName === 'New Level' || !currentName.trim()) {
      const levelName = prompt('Enter level name:', currentName);
      if (!levelName || !levelName.trim()) {
        this.showMessage('Level name is required', 0xAA4444);
        return false;
      }
      this.levelData.metadata.name = levelName.trim();
    }
    
    if (currentAuthor === 'Player' || !currentAuthor.trim()) {
      const authorName = prompt('Enter your name:', currentAuthor);
      if (!authorName || !authorName.trim()) {
        this.showMessage('Author name is required', 0xAA4444);
        return false;
      }
      this.levelData.metadata.author = authorName.trim();
    }
    
    return true;
  }

  private exportLevel(): void {
    const progressContainer = this.showProgressMessage('Preparing export...', 20);
    
    try {
      this.updateProgressMessage(progressContainer, 'Validating level data...', 40);
      this.updateLevelManager();
      
      this.updateProgressMessage(progressContainer, 'Generating JSON file...', 70);
      StorageUtils.downloadLevelAsFile(this.levelData);
      
      this.updateProgressMessage(progressContainer, 'Export complete!', 100);
      
      setTimeout(() => {
        progressContainer.destroy();
        this.showMessage('Level exported as JSON file', 0x4444AA);
      }, 500);
    } catch (error) {
      console.error('Failed to export level:', error);
      progressContainer.destroy();
      this.showMessage(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 0xAA4444, 5000);
    }
  }

  private clearLevel(): void {
    // Show confirmation dialog
    this.showConfirmationDialog(
      'Clear Level',
      'Are you sure you want to clear the entire level?\nThis action cannot be undone.',
      () => {
        // User confirmed - clear the level
        const progressContainer = this.showProgressMessage('Clearing level...', 25);
        
        try {
          this.updateProgressMessage(progressContainer, 'Removing all tiles and entities...', 50);
          this.levelData = this.levelManager.createNewLevel('New Level', 'Player');
          
          this.updateProgressMessage(progressContainer, 'Updating display...', 75);
          this.clearAllVisuals();
          this.renderExistingLevel();
          
          this.updateProgressMessage(progressContainer, 'Clearing backup...', 90);
          StorageUtils.clearLocalStorage();
          
          this.updateProgressMessage(progressContainer, 'Complete!', 100);
          
          setTimeout(() => {
            progressContainer.destroy();
            this.showMessage('Level cleared successfully', 0xAAAA44);
          }, 500);
        } catch (error) {
          console.error('Failed to clear level:', error);
          progressContainer.destroy();
          this.showMessage('Failed to clear level', 0xAA4444);
        }
      }
    );
  }

  private showConfirmationDialog(title: string, message: string, onConfirm: () => void): void {
    // Create overlay
    const overlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.7
    ).setOrigin(0.5).setScrollFactor(0).setDepth(3000);

    // Dialog container
    const dialogContainer = this.add.container(this.cameras.main.centerX, this.cameras.main.centerY);
    dialogContainer.setScrollFactor(0).setDepth(3001);

    // Dialog background
    const background = this.add.rectangle(0, 0, 400, 180, ColorTheme.SECONDARY_DARK, 0.95);
    background.setStrokeStyle(3, ColorTheme.BORDER_SECONDARY);

    // Title
    const titleText = this.add.text(0, -50, title, {
      ...ColorTheme.getTextStyle('medium'),
      fontSize: '20px',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Message
    const messageText = this.add.text(0, -10, message, {
      ...ColorTheme.getTextStyle('small'),
      fontSize: '14px',
      wordWrap: { width: 350 },
      align: 'center'
    }).setOrigin(0.5);

    // Confirm button
    const confirmButton = this.add.text(-60, 40, 'Confirm', {
      ...ColorTheme.getTextStyle('small'),
      fontSize: '16px',
      backgroundColor: `#${ColorTheme.ERROR.toString(16).padStart(6, '0')}`,
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();

    // Cancel button
    const cancelButton = this.add.text(60, 40, 'Cancel', {
      ...ColorTheme.getTextStyle('small'),
      fontSize: '16px',
      backgroundColor: `#${ColorTheme.BUTTON_SECONDARY_HOVER.toString(16).padStart(6, '0')}`,
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();

    dialogContainer.add([background, titleText, messageText, confirmButton, cancelButton]);

    // Button interactions
    confirmButton.on('pointerdown', () => {
      overlay.destroy();
      dialogContainer.destroy();
      onConfirm();
    });

    cancelButton.on('pointerdown', () => {
      overlay.destroy();
      dialogContainer.destroy();
    });

    // Hover effects
    confirmButton.on('pointerover', () => confirmButton.setStyle({ 
      backgroundColor: `#${(ColorTheme.ERROR | 0x222222).toString(16).padStart(6, '0')}` 
    }));
    confirmButton.on('pointerout', () => confirmButton.setStyle({ 
      backgroundColor: `#${ColorTheme.ERROR.toString(16).padStart(6, '0')}` 
    }));
    cancelButton.on('pointerover', () => cancelButton.setStyle({ 
      backgroundColor: `#${ColorTheme.SECONDARY_LIGHT.toString(16).padStart(6, '0')}` 
    }));
    cancelButton.on('pointerout', () => cancelButton.setStyle({ 
      backgroundColor: `#${ColorTheme.BUTTON_SECONDARY_HOVER.toString(16).padStart(6, '0')}` 
    }));
  }

  private clearAllVisuals(): void {
    // Remove all tile visuals
    this.children.list.forEach(child => {
      if (child.name && (
        child.name.startsWith('tile_') || 
        child.name.startsWith('enemy_') || 
        child.name.startsWith('spawn_')
      )) {
        child.destroy();
      }
    });
  }

  private showMessage(text: string, color: number, duration: number = 3000): void {
    // Create message container
    const messageContainer = this.add.container(this.cameras.main.centerX, 100);
    messageContainer.setScrollFactor(0).setDepth(2000);

    // Message background
    const background = this.add.rectangle(0, 0, 0, 50, color, 0.9);
    background.setStrokeStyle(2, ColorTheme.BORDER_PRIMARY);

    // Message text
    const messageText = this.add.text(0, 0, text, {
      fontSize: '16px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      wordWrap: { width: 400 },
      align: 'center'
    }).setOrigin(0.5);

    // Adjust background size to fit text
    background.setSize(messageText.width + 20, 50);

    messageContainer.add([background, messageText]);

    // Slide in animation
    messageContainer.setY(50);
    this.tweens.add({
      targets: messageContainer,
      y: 100,
      duration: 300,
      ease: 'Back.easeOut'
    });

    // Auto-remove message after specified duration
    this.time.delayedCall(duration, () => {
      if (messageContainer && messageContainer.active) {
        this.tweens.add({
          targets: messageContainer,
          y: 50,
          alpha: 0,
          duration: 300,
          ease: 'Power2.easeIn',
          onComplete: () => messageContainer.destroy()
        });
      }
    });
  }

  private showProgressMessage(text: string, progress: number = 0): Phaser.GameObjects.Container {
    // Create progress message container
    const container = this.add.container(this.cameras.main.centerX, 150);
    container.setScrollFactor(0).setDepth(2000);

    // Background
    const background = this.add.rectangle(0, 0, 300, 80, ColorTheme.BACKGROUND_OVERLAY, 0.9);
    background.setStrokeStyle(2, ColorTheme.BUTTON_PRIMARY);

    // Message text
    const messageText = this.add.text(0, -15, text, {
      fontSize: '16px',
      color: '#FFFFFF',
      align: 'center'
    }).setOrigin(0.5);

    // Progress bar background
    const progressBg = this.add.rectangle(0, 15, 200, 8, 0x333333);
    
    // Progress bar fill
    const progressFill = this.add.rectangle(-100, 15, progress * 2, 8, 0x4444AA);
    progressFill.setOrigin(0, 0.5);

    container.add([background, messageText, progressBg, progressFill]);
    container.setData('progressFill', progressFill);
    container.setData('messageText', messageText);

    return container;
  }

  private updateProgressMessage(container: Phaser.GameObjects.Container, text: string, progress: number): void {
    const progressFill = container.getData('progressFill') as Phaser.GameObjects.Rectangle;
    const messageText = container.getData('messageText') as Phaser.GameObjects.Text;
    
    if (progressFill && messageText) {
      messageText.setText(text);
      this.tweens.add({
        targets: progressFill,
        width: progress * 2,
        duration: 200,
        ease: 'Power2'
      });
    }
  }

  init(data?: { customization?: CustomizationData }): void {
    // Store customization data for preview purposes
    // Load from storage if not provided to ensure latest customization is used
    this.customization = data?.customization || StorageUtils.loadCustomization();
    
    // Cleanup previous instance if any
    if (this.autosaveTimer) {
      StorageUtils.clearAutosaveTimer(this.autosaveTimer);
      this.autosaveTimer = null;
    }
  }

  destroy(): void {
    if (this.autosaveTimer) {
      StorageUtils.clearAutosaveTimer(this.autosaveTimer);
      this.autosaveTimer = null;
    }
  }

  getLevelData(): LevelData | null {
    return this.levelData ? { ...this.levelData } : null;
  }
}