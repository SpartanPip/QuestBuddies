import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import { LevelData, TILE_TYPES, ENEMY_TYPES, GRID_SIZE, DEFAULT_LEVEL_SIZE } from '../../../shared/types/level';
import { GridUtils } from '../utils/GridUtils';
import { LevelManager } from '../managers/LevelManager';
import { StorageUtils, CustomizationData } from '../utils/StorageUtils';
import { ColorTheme } from '../utils/ColorTheme';
import { OptionElementData } from '../ui/OptionElement';

export class LevelBuilder extends Scene {
  private camera: Phaser.Cameras.Scene2D.Camera;
  private uiCamera: Phaser.Cameras.Scene2D.Camera;
  private levelData: LevelData;
  private gridGraphics: Phaser.GameObjects.Graphics;
  private selectedTileType: number = TILE_TYPES.WALL;
  private isDragging: boolean = false;
  private placementMode: 'tile' | 'enemy' | 'spawn' = 'tile';
  private selectedEnemyType: number = ENEMY_TYPES.BASIC;
  private selectedTileSprite: string = 'tile-dirt1';
  private isDialogOpen: boolean = false;




  // Tile options data
  private static readonly TILE_OPTIONS = [
    // Dirt tiles
    { sprite: 'tile-dirt1', label: 'Dirt Ground 1' },
    { sprite: 'tile-dirt2', label: 'Dirt Ground 2' },
    { sprite: 'tile-dirt3', label: 'Dirt Ground 3' },
    { sprite: 'tile-dirt4', label: 'Dirt Ground 4' },
    { sprite: 'tile-dirt5', label: 'Dirt Ground 5' },
    { sprite: 'tile-dirt6', label: 'Dirt Ground 6' },
    { sprite: 'tile-dirt7', label: 'Dirt Ground 7' },
    { sprite: 'tile-dirt8', label: 'Dirt Ground 8' },
    { sprite: 'tile-dirt9', label: 'Dirt Ground 9' },
    // Grass tiles
    { sprite: 'tile-grass1', label: 'Grass Ground 1' },
    { sprite: 'tile-grass2', label: 'Grass Ground 2' },
    { sprite: 'tile-grass3', label: 'Grass Ground 3' },
    { sprite: 'tile-grass4', label: 'Grass Ground 4' },
    { sprite: 'tile-grass5', label: 'Grass Ground 5' },
    { sprite: 'tile-grass6', label: 'Grass Ground 6' },
    { sprite: 'tile-grass7', label: 'Grass Ground 7' },
    { sprite: 'tile-grass8', label: 'Grass Ground 8' },
    { sprite: 'tile-grass9', label: 'Grass Ground 9' }
  ];

  // Enemy options data
  private static readonly ENEMY_OPTIONS = [
    { type: ENEMY_TYPES.BASIC, label: 'Bug 1', color: 0xFF6666, sprite: 'enemy-bug1', scale: 0.3, tint: 0xff0000 },
    { type: ENEMY_TYPES.FAST, label: 'Bug 2', color: 0x66FF66, sprite: 'enemy-bug2', scale: 0.25, tint: 0xff6600 },
    { type: ENEMY_TYPES.HEAVY, label: 'Bug 3', color: 0x6666FF, sprite: 'enemy-bug3', scale: 0.35, tint: 0x660066 }
  ];
  private levelManager: LevelManager;
  private autosaveTimer: number | null = null;
  private customization: CustomizationData;

  constructor() {
    super('LevelBuilder');
    this.levelManager = new LevelManager();
  }

  create() {
    try {
      console.log('🎮 LevelBuilder: Starting scene creation');

      this.camera = this.cameras.main;
      this.camera.setBackgroundColor(ColorTheme.BACKGROUND_DARK);

      // Create UI camera for elements that should not be affected by zoom/pan
      this.uiCamera = this.cameras.add(0, 0, this.camera.width, this.camera.height);
      this.uiCamera.setZoom(1.0);           // Never zoom

      // Ensure customization is loaded if not already set
      if (!this.customization) {
        console.log('🎨 Loading customization data');
        this.customization = StorageUtils.loadCustomization();
      }

      console.log('📊 Initializing level data');
      this.initializeLevelData();

      console.log('🎯 Setting up grid');
      this.setupGrid();

      console.log('🖱️ Setting up input');
      this.setupInput();

      console.log('🎨 Setting up UI');
      this.setupUI();

      console.log('📷 Configuring camera rendering');
      this.configureCameraRendering();

      console.log('💾 Setting up autosave');
      this.setupAutosave();

      console.log('✅ LevelBuilder: Scene creation complete');
    } catch (error) {
      console.error('❌ LevelBuilder: Error during scene creation:', error);
      // Try to show an error message to the user
      this.showMessage('Failed to load level builder. Please try again.', 0xAA4444, 5000);
    }
  }

  private initializeLevelData(): void {
    try {
      // Check for backup first (this includes state saved during navigation)
      const backup = StorageUtils.loadFromLocalStorage();
      if (backup) {
        console.log('🔄 Found persistent level data, restoring state');
        console.log('📊 Level data preview:', {
          name: backup.metadata?.name,
          tilesCount: backup.tiles?.length,
          enemiesCount: backup.enemies?.length,
          hasSpawn: !!backup.spawn
        });

        try {
          this.levelData = this.levelManager.loadLevel(backup);
          console.log('✅ Level data restored successfully');
        } catch (validationError) {
          console.warn('⚠️ Backup data validation failed, attempting repair:', validationError);

          // Try to repair the backup data
          const repairedData = this.repairLevelData(backup);
          if (repairedData) {
            this.levelData = this.levelManager.loadLevel(repairedData);
            console.log('🔧 Level data repaired and loaded successfully');
          } else {
            throw new Error('Could not repair backup data');
          }
        }
      } else {
        console.log('🆕 No persistent data found, creating new level');
        this.levelData = this.levelManager.createNewLevel('New Level', 'Player');
      }

      // Ensure tileSprites array exists for backward compatibility
      if (!this.levelData.tileSprites) {
        console.log('🔧 Adding missing tileSprites array for backward compatibility');
        this.levelData.tileSprites = this.levelData.tiles.map(row =>
          row.map(() => null)
        );
      }

      console.log('✅ Level data initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing level data:', error);
      // Clear corrupted backup and create new level
      StorageUtils.clearLocalStorage();
      this.levelData = this.levelManager.createNewLevel('New Level', 'Player');
      console.log('🔄 Created fallback level due to initialization error');

      // Show user-friendly message
      this.showMessage('Previous level data was corrupted. Started with a new level.', 0xAAAA44, 4000);
    }
  }

  /**
   * Attempts to repair corrupted level data
   */
  private repairLevelData(data: any): any | null {
    try {
      console.log('🔧 Attempting to repair level data...');

      // Create a base structure
      const repaired: any = {
        tiles: data.tiles || [],
        tileSprites: data.tileSprites || null,
        enemies: data.enemies || [],
        spawn: data.spawn || null,
        metadata: data.metadata || {
          name: 'Recovered Level',
          author: 'Player',
          created: Date.now()
        }
      };

      // Ensure tiles is a valid 2D array
      if (!Array.isArray(repaired.tiles) || repaired.tiles.length === 0) {
        console.log('🔧 Creating empty tile grid');
        repaired.tiles = this.createEmptyTileGrid();
      }

      // Ensure tileSprites matches tiles structure
      if (!repaired.tileSprites || !Array.isArray(repaired.tileSprites)) {
        console.log('🔧 Creating matching tileSprites grid');
        repaired.tileSprites = repaired.tiles.map((row: any[]) =>
          row.map(() => null)
        );
      }

      // Ensure enemies is an array
      if (!Array.isArray(repaired.enemies)) {
        console.log('🔧 Resetting enemies array');
        repaired.enemies = [];
      }

      // Validate spawn point - set to null if invalid
      if (repaired.spawn && (
        typeof repaired.spawn !== 'object' ||
        !Number.isInteger(repaired.spawn.x) ||
        !Number.isInteger(repaired.spawn.y) ||
        repaired.spawn.x < 0 ||
        repaired.spawn.y < 0
      )) {
        console.log('🔧 Removing invalid spawn point');
        repaired.spawn = null;
      }

      // Ensure metadata is valid
      if (!repaired.metadata || typeof repaired.metadata !== 'object') {
        repaired.metadata = {
          name: 'Recovered Level',
          author: 'Player',
          created: Date.now()
        };
      }

      console.log('🔧 Level data repair completed');
      return repaired;
    } catch (error) {
      console.error('❌ Failed to repair level data:', error);
      return null;
    }
  }

  /**
   * Creates an empty tile grid for fallback purposes
   */
  private createEmptyTileGrid(): number[][] {
    const grid: number[][] = [];
    for (let y = 0; y < DEFAULT_LEVEL_SIZE; y++) {
      const row: number[] = [];
      for (let x = 0; x < DEFAULT_LEVEL_SIZE; x++) {
        row.push(0); // TILE_TYPES.EMPTY
      }
      grid.push(row);
    }
    return grid;
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

    // Mouse wheel zoom (optional enhancement) - only affects world camera, UI camera stays fixed
    this.input.on('wheel', (_pointer: any, _gameObjects: any, _deltaX: number, deltaY: number) => {
      const zoomFactor = deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Phaser.Math.Clamp(this.camera.zoom * zoomFactor, 0.5, 2);
      this.camera.setZoom(newZoom);
      // UI camera remains unaffected at zoom 1.0
    });
  }

  private setupUI(): void {
    this.createHeader();
    this.createSaveToolbar();
  }

  private configureCameraRendering(): void {
    // Configure cameras to render different depth ranges to prevent duplicates
    // Main camera renders world objects (depth 0-999)
    this.camera.ignore(this.children.list.filter(child => (child as any).depth >= 1000));
    
    // UI camera renders UI elements (depth 1000+)
    this.uiCamera.ignore(this.children.list.filter(child => (child as any).depth < 1000));
    
    console.log('📷 Camera rendering configured:');
    console.log('  - Main camera: renders depths 0-999');
    console.log('  - UI camera: renders depths 1000+');
  }

  private createHeader(): void {
    // Create header background using screen coordinates (not world coordinates)
    const headerHeight = 60;
    const headerBackground = this.add.rectangle(
      this.uiCamera.width / 2,
      headerHeight / 2,
      this.uiCamera.width,
      headerHeight,
      ColorTheme.BACKGROUND_OVERLAY,
      0.9
    );
    headerBackground.setStrokeStyle(2, ColorTheme.BORDER_PRIMARY);
    headerBackground.setScrollFactor(0, 0);
    headerBackground.setDepth(1000);
    headerBackground.setName('header_background');

    // Create header container centered at top using screen coordinates
    const header = this.add.container(this.uiCamera.width / 2, headerHeight / 2);
    header.setName('header');

    // Mode selection buttons
    const modes = [
      { mode: 'tile', color: 0x4444AA, label: 'Tiles' },
      { mode: 'enemy', color: 0xAA4444, label: 'Enemies' },
      { mode: 'spawn', color: 0x44AA44, label: 'Spawn' }
    ];

    modes.forEach((modeData, index) => {
      const x = (index - 1) * 100; // Center the buttons: -100, 0, 100

      const button = this.add.rectangle(x, 0, 90, 40, modeData.color)
        .setInteractive()
        .setStrokeStyle(2, ColorTheme.BORDER_PRIMARY)
        .setName(`header_${modeData.mode}_button`);

      const label = this.add.text(x, 0, modeData.label, {
        ...ColorTheme.getTextStyle('small'),
        fontSize: '14px'
      }).setOrigin(0.5);

      button.on('pointerdown', () => {
        if (modeData.mode === 'tile') {
          this.showTileSelectionPopup();
        } else if (modeData.mode === 'enemy') {
          this.showEnemySelectionPopup();
        } else {
          this.placementMode = modeData.mode as 'tile' | 'enemy' | 'spawn';
          this.updateModeSelection();
        }
      });

      button.on('pointerover', () => button.setStrokeStyle(3, ColorTheme.SUCCESS));
      button.on('pointerout', () => {
        const isSelected = this.placementMode === modeData.mode;
        button.setStrokeStyle(isSelected ? 3 : 2, isSelected ? ColorTheme.SUCCESS : ColorTheme.BORDER_PRIMARY);
      });

      header.add([button, label]);
    });



    // Instructions text positioned below header using screen coordinates
    const instructions = this.add.text(20, headerHeight + 20, 'WASD: Move Camera\nClick: Place Tiles\nScroll: Zoom', {
      ...ColorTheme.getTextStyle('small', 'secondary'),
      fontSize: '12px'
    });
    instructions.setScrollFactor(0, 0);
    instructions.setDepth(1001);
    instructions.setName('instructions');

    header.setScrollFactor(0, 0);
    header.setDepth(1001);

    // Ensure all buttons in header have higher depth
    header.list.forEach(child => {
      if ('setDepth' in child) {
        (child as any).setDepth(1002);
      }
    });

    this.updateModeSelection();
  }

  private disableSceneInput(): void {
    console.log('🚫 DISABLING scene input events');
    // Remove scene-level pointer event listeners
    this.input.off('pointerdown', this.onPointerDown, this);
    this.input.off('pointermove', this.onPointerMove, this);
    this.input.off('pointerup', this.onPointerUp, this);

    // Also reset dragging state to prevent any ongoing drag operations
    this.isDragging = false;
    this.disableCameraZoom();
  }

  private enableSceneInput(): void {
    console.log('✅ ENABLING scene input events');
    // Re-add scene-level pointer event listeners
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.enableCameraZoom();
  }

  private disableCameraZoom(): void {
    // Remove camera zoom wheel event
    this.input.off('wheel');
  }

  private enableCameraZoom(): void {
    // Re-add camera zoom wheel event - only affects world camera, UI camera stays fixed
    this.input.on('wheel', (_pointer: any, _gameObjects: any, _deltaX: number, deltaY: number) => {
      const zoomFactor = deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Phaser.Math.Clamp(this.camera.zoom * zoomFactor, 0.5, 2);
      this.camera.setZoom(newZoom);
      // UI camera remains unaffected at zoom 1.0
    });
  }


  private updateModeSelection(): void {
    const header = this.children.getByName('header') as Phaser.GameObjects.Container;

    if (header && header.list) {
      const modes = ['tile', 'enemy', 'spawn'];
      header.list.forEach((child, index) => {
        if (child instanceof Phaser.GameObjects.Rectangle && index < 6) { // 6 because we have button + label pairs
          const modeIndex = Math.floor(index / 2); // Each mode has button + label
          if (index % 2 === 0) { // Only update buttons (even indices)
            const isSelected = modes[modeIndex] === this.placementMode;
            child.setStrokeStyle(isSelected ? 3 : 2, isSelected ? ColorTheme.SUCCESS : ColorTheme.BORDER_PRIMARY);
          }
        }
      });
    }
  }



  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    console.log('=== POINTER DOWN DEBUG ===');
    console.log('Pointer position:', { x: pointer.x, y: pointer.y, worldX: pointer.worldX, worldY: pointer.worldY });
    console.log('Dialog open:', this.isDialogOpen);

    // Don't place tiles if a dialog is open
    if (this.isDialogOpen) {
      console.log('❌ Blocked: Dialog is open');
      return;
    }

    // Check if we're clicking on an interactive UI element first
    const hitObjects = this.input.hitTestPointer(pointer);
    console.log('Hit objects count:', hitObjects.length);
    console.log('Hit objects:', hitObjects.map(obj => ({
      name: obj.name,
      type: obj.type,
      parentContainer: obj.parentContainer?.name,
      interactive: obj.input?.enabled
    })));

    const isClickingUIButton = hitObjects.some(obj => {
      // Check if it's a named button
      if (obj.name && obj.name.includes('button')) {
        console.log('✅ Found UI button by name:', obj.name);
        return true;
      }
      // Check if it's in a UI container
      if (obj.parentContainer) {
        const containerName = obj.parentContainer.name;
        const isUIContainer = containerName === 'header' || containerName === 'footer';
        if (isUIContainer) {
          console.log('✅ Found UI element in container:', containerName);
        }
        return isUIContainer;
      }
      return false;
    });

    console.log('Is clicking UI button:', isClickingUIButton);

    // Check UI area
    const inUIArea = this.isPointerInUIArea(pointer);
    console.log('In UI area:', inUIArea);

    // Don't place tiles if clicking on UI buttons or UI areas
    if (isClickingUIButton || inUIArea) {
      console.log('❌ Blocked: Clicking on UI element');
      return;
    }

    console.log('✅ Proceeding with tile placement');
    this.isDragging = true;
    this.handlePlacement(pointer.worldX, pointer.worldY);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.isDragging && this.placementMode === 'tile' && !this.isDialogOpen && !this.isPointerInUIArea(pointer)) {
      this.handlePlacement(pointer.worldX, pointer.worldY);
    }
  }

  private isPointerInUIArea(pointer: Phaser.Input.Pointer): boolean {
    const headerHeight = 60;
    const footerHeight = 60;
    const footerY = this.uiCamera.height - footerHeight;

    console.log('--- UI Area Check ---');
    console.log('Header height:', headerHeight, 'Footer Y:', footerY, 'UI Camera height:', this.uiCamera.height);
    console.log('Pointer Y:', pointer.y);

    // Check if pointer is in header area
    if (pointer.y <= headerHeight) {
      console.log('✅ In header area');
      return true;
    }

    // Check if pointer is in footer area
    if (pointer.y >= footerY) {
      console.log('✅ In footer area');
      return true;
    }

    console.log('❌ Not in any UI area');
    return false;
  }

  private onPointerUp(): void {
    this.isDragging = false;
  }

  private handlePlacement(worldX: number, worldY: number): void {
    console.log('🎯 PLACING:', this.placementMode, 'at world position:', { worldX, worldY });
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
      const spriteRow = this.levelData.tileSprites[gridPos.y];
      if (row && spriteRow) {
        // Use a generic tile type (1 for placed tiles) and store sprite info separately
        row[gridPos.x] = 1; // Generic "tile exists" marker
        spriteRow[gridPos.x] = this.selectedTileSprite; // Store the selected sprite
        this.renderTileAt(gridPos.x, gridPos.y);
        this.updateLevelManager();
      }
    }
  }

  private renderTileAt(gridX: number, gridY: number): void {
    if (!this.levelData) return;

    const worldPos = GridUtils.gridToWorld(gridX, gridY);
    const row = this.levelData.tiles[gridY];
    const spriteRow = this.levelData.tileSprites[gridY];
    if (!row || !spriteRow) return;

    const tileType = row[gridX];
    const tileSprite = spriteRow[gridX];
    const tileKey = `tile_${gridX}_${gridY}`;

    // Remove existing tile at this position
    const existingTile = this.children.getByName(tileKey);
    if (existingTile) {
      existingTile.destroy();
    }

    // Add new tile if not empty
    if (tileType !== undefined && tileType !== TILE_TYPES.EMPTY) {
      const tileSpriteObj = this.createTileSprite(tileType, worldPos.x, worldPos.y, gridX, gridY, tileSprite);
      if (tileSpriteObj) {
        tileSpriteObj.setName(tileKey);
      }
    }
  }

  private createTileSprite(_tileType: number, x: number, y: number, _gridX: number, _gridY: number, storedSprite?: string | null): Phaser.GameObjects.Image | null {
    // Use stored sprite if available, otherwise use the selected tile sprite
    const spriteKey = storedSprite || this.selectedTileSprite;

    if (!spriteKey) {
      console.warn('No sprite key available for tile');
      return null;
    }

    const tileSprite = this.add.image(x + GRID_SIZE / 2, y + GRID_SIZE / 2, spriteKey);
    tileSprite.setDisplaySize(GRID_SIZE, GRID_SIZE);
    tileSprite.setDepth(0); // Tiles render behind UI elements
    
    // Ensure tile is only rendered by main camera (not UI camera)
    this.uiCamera.ignore(tileSprite);

    return tileSprite;
  }

  private placeEnemy(worldX: number, worldY: number): void {
    if (!this.levelData) return;

    const gridPos = GridUtils.worldToGrid(worldX, worldY);

    if (GridUtils.isValidGridPosition(gridPos.x, gridPos.y, DEFAULT_LEVEL_SIZE, DEFAULT_LEVEL_SIZE)) {
      // Check if there's a tile at this position (enemies can only be placed on tiles)
      const tileType = this.levelData.tiles[gridPos.y]?.[gridPos.x];
      if (tileType === undefined || tileType === TILE_TYPES.EMPTY) {
        this.showMessage('Enemies can only be placed on tiles', 0xAA4444, 2000);
        return;
      }

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
      // Check if there's a tile at this position (spawn can only be placed on tiles)
      const tileType = this.levelData.tiles[gridPos.y]?.[gridPos.x];
      if (tileType === undefined || tileType === TILE_TYPES.EMPTY) {
        this.showMessage('Spawn point can only be placed on tiles', 0xAA4444, 2000);
        return;
      }

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
    enemy.setDepth(10); // Enemies render above tiles but below UI
    
    // Ensure enemy is only rendered by main camera (not UI camera)
    this.uiCamera.ignore(enemy);
  }

  private renderSpawnAt(gridX: number, gridY: number): void {
    const worldPos = GridUtils.gridToWorldCenter(gridX, gridY);
    const spawnKey = 'spawn_point';

    // Use player sprite as spawn indicator based on customization
    // Fallback to default avatar if customization is not available
    const avatar = this.customization?.avatar || 'default';
    const avatarSprite = `player-${avatar}`;
    const spawn = this.add.image(worldPos.x, worldPos.y, avatarSprite);
    spawn.setScale(0.4);
    spawn.setTint(0x44AA44);
    spawn.setAlpha(0.8);
    spawn.setName(spawnKey);
    spawn.setDepth(10); // Spawn point renders above tiles but below UI
    
    // Ensure spawn point is only rendered by main camera (not UI camera)
    this.uiCamera.ignore(spawn);

    const spawnText = this.add.text(worldPos.x, worldPos.y + 25, 'SPAWN', {
      ...ColorTheme.getTextStyle('small'),
      fontSize: '8px',
      backgroundColor: `#${ColorTheme.SUCCESS.toString(16).padStart(6, '0')}`,
      padding: { x: 3, y: 1 }
    }).setOrigin(0.5);
    spawnText.setName(`${spawnKey}_text`);
    spawnText.setDepth(10);
    
    // Ensure spawn text is only rendered by main camera (not UI camera)
    this.uiCamera.ignore(spawnText);
  }

  private removeEnemyVisual(gridX: number, gridY: number): void {
    const enemyKey = `enemy_${gridX}_${gridY}`;
    const enemy = this.children.getByName(enemyKey);

    if (enemy) enemy.destroy();
  }

  private removeSpawnVisual(): void {
    const spawn = this.children.getByName('spawn_point');
    const spawnText = this.children.getByName('spawn_point_text');

    if (spawn) spawn.destroy();
    if (spawnText) spawnText.destroy();
  }

  private createSaveToolbar(): void {
    // Create footer background using screen coordinates (not world coordinates)
    const footerHeight = 60;
    const footerY = this.uiCamera.height - footerHeight;

    const footerBackground = this.add.rectangle(
      this.uiCamera.width / 2,
      footerY + footerHeight / 2,
      this.uiCamera.width,
      footerHeight,
      ColorTheme.BACKGROUND_OVERLAY,
      0.9
    );
    footerBackground.setStrokeStyle(2, ColorTheme.BORDER_PRIMARY);
    footerBackground.setScrollFactor(0, 0);
    footerBackground.setDepth(1000);
    footerBackground.setName('footer_background');

    // Create container centered at bottom using screen coordinates
    const footer = this.add.container(this.uiCamera.width / 2, footerY + footerHeight / 2);
    footer.setName('footer');

    // Post button
    const postButton = this.add.rectangle(-65, 0, 120, 40, ColorTheme.BUTTON_SUCCESS)
      .setInteractive()
      .setStrokeStyle(2, ColorTheme.BORDER_PRIMARY)
      .setName('footer_post_button');

    const postLabel = this.add.text(-65, 0, 'Post', {
      ...ColorTheme.getTextStyle('small'),
      fontSize: '14px'
    }).setOrigin(0.5);

    postButton.on('pointerdown', () => this.saveAndPost());
    postButton.on('pointerover', () => postButton.setStrokeStyle(3, ColorTheme.SUCCESS));
    postButton.on('pointerout', () => postButton.setStrokeStyle(2, ColorTheme.BORDER_PRIMARY));

    // Clear Level button
    const clearButton = this.add.rectangle(65, 0, 120, 40, ColorTheme.ERROR)
      .setInteractive()
      .setStrokeStyle(2, ColorTheme.BORDER_PRIMARY)
      .setName('footer_clear_button');

    const clearLabel = this.add.text(65, 0, 'Clear Level', {
      ...ColorTheme.getTextStyle('small'),
      fontSize: '14px'
    }).setOrigin(0.5);

    clearButton.on('pointerdown', () => this.clearLevel());
    clearButton.on('pointerover', () => clearButton.setStrokeStyle(3, ColorTheme.SUCCESS));
    clearButton.on('pointerout', () => clearButton.setStrokeStyle(2, ColorTheme.BORDER_PRIMARY));

    footer.add([postButton, postLabel, clearButton, clearLabel]);
    footer.setScrollFactor(0, 0);
    footer.setDepth(1001);

    // Ensure all buttons in footer have higher depth
    footer.list.forEach(child => {
      if ('setDepth' in child) {
        (child as any).setDepth(1002);
      }
    });
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

    // Check if there's at least 1 enemy
    if (this.levelData.enemies.length === 0) {
      return { isValid: false, message: 'Level must have at least 1 enemy' };
    }

    // Check if spawn point is within level bounds
    const levelHeight = this.levelData.tiles.length;
    const levelWidth = this.levelData.tiles[0]?.length || 0;

    if (this.levelData.spawn.x < 0 || this.levelData.spawn.x >= levelWidth ||
      this.levelData.spawn.y < 0 || this.levelData.spawn.y >= levelHeight) {
      return { isValid: false, message: 'Spawn point is outside level bounds' };
    }

    // Check if spawn point is on a tile (not empty)
    const spawnTile = this.levelData.tiles[this.levelData.spawn.y]?.[this.levelData.spawn.x];
    if (spawnTile === undefined || spawnTile === TILE_TYPES.EMPTY) {
      return { isValid: false, message: 'Spawn point must be placed on a tile' };
    }

    // Validate level has some content (not completely empty)
    const hasNonEmptyTiles = this.levelData.tiles.some(row =>
      row.some(tile => tile !== TILE_TYPES.EMPTY)
    );

    if (!hasNonEmptyTiles) {
      return { isValid: false, message: 'Level must have some tiles' };
    }

    // Validate enemy positions are within bounds and on tiles
    for (const enemy of this.levelData.enemies) {
      if (enemy.x < 0 || enemy.x >= levelWidth ||
        enemy.y < 0 || enemy.y >= levelHeight) {
        return { isValid: false, message: 'Enemy position is outside level bounds' };
      }

      const enemyTile = this.levelData.tiles[enemy.y]?.[enemy.x];
      if (enemyTile === undefined || enemyTile === TILE_TYPES.EMPTY) {
        return { isValid: false, message: 'Enemy must be placed on a tile' };
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

        // Keep local backup for persistence across scene transitions
        // Only clear when user explicitly clicks "Clear Level"
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
    // Create error overlay using screen coordinates
    const overlay = this.add.rectangle(
      this.uiCamera.width / 2,
      this.uiCamera.height / 2,
      this.uiCamera.width,
      this.uiCamera.height,
      0x000000,
      0.8
    ).setOrigin(0.5).setScrollFactor(0, 0).setDepth(3000);

    // Error container using screen coordinates
    const errorContainer = this.add.container(this.uiCamera.width / 2, this.uiCamera.height / 2);
    errorContainer.setScrollFactor(0, 0).setDepth(3001);

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
          this.updateLevelManager(); // Update the level manager with the new empty level

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



  private showTileSelectionPopup(): void {
    console.log('🚀 === SHOWING TILE SELECTION ===');

    // Save current state before navigating away
    this.saveCurrentState();

    // Prepare tile options
    const tileOptions: OptionElementData[] = LevelBuilder.TILE_OPTIONS.map(tile => ({
      id: tile.sprite,
      sprite: tile.sprite,
      label: tile.label,
      data: { sprite: tile.sprite, type: TILE_TYPES.WALL }
    }));

    // Navigate to GridSelectionScene
    this.scene.start('GridSelectionScene', {
      options: tileOptions,
      title: 'Select Tile Type',
      returnScene: 'LevelBuilder',
      returnData: { customization: this.customization }
    });

    console.log('🎯 Navigated to GridSelectionScene for tile selection');
  }

  private showEnemySelectionPopup(): void {
    console.log('🚀 === SHOWING ENEMY SELECTION ===');

    // Save current state before navigating away
    this.saveCurrentState();

    // Prepare enemy options
    const enemyOptions: OptionElementData[] = LevelBuilder.ENEMY_OPTIONS.map(enemy => ({
      id: enemy.type.toString(),
      sprite: enemy.sprite,
      label: enemy.label,
      data: { type: enemy.type, sprite: enemy.sprite, scale: enemy.scale, tint: enemy.tint }
    }));

    // Navigate to GridSelectionScene
    this.scene.start('GridSelectionScene', {
      options: enemyOptions,
      title: 'Select Enemy Type',
      returnScene: 'LevelBuilder',
      returnData: { customization: this.customization }
    });

    console.log('🎯 Navigated to GridSelectionScene for enemy selection');
  }

  private handleGridSelection(selectedOption: OptionElementData): void {
    console.log('✅ Handling grid selection:', selectedOption);

    const data = selectedOption.data as any; // Type assertion for the data field

    if (data.sprite && data.type !== undefined) {
      // This is a tile selection
      this.selectedTileSprite = data.sprite;
      this.selectedTileType = data.type;
      this.placementMode = 'tile';
      this.updateModeSelection();
      console.log('🎨 Tile selection updated:', { sprite: this.selectedTileSprite, type: this.selectedTileType });
    } else if (data.type !== undefined && data.scale !== undefined) {
      // This is an enemy selection
      this.selectedEnemyType = data.type;
      this.placementMode = 'enemy';
      this.updateModeSelection();
      console.log('👾 Enemy selection updated:', { type: this.selectedEnemyType });
    }
  }

  private showConfirmationDialog(title: string, message: string, onConfirm: () => void): void {
    // Set dialog flag and disable scene input events
    this.isDialogOpen = true;
    this.disableSceneInput();

    // Create overlay that blocks all clicks using screen coordinates
    const overlay = this.add.rectangle(
      this.uiCamera.width / 2,
      this.uiCamera.height / 2,
      this.uiCamera.width,
      this.uiCamera.height,
      0x000000,
      0.7
    ).setOrigin(0.5).setScrollFactor(0, 0).setDepth(3000).setInteractive();

    // Block all pointer events from passing through the overlay
    overlay.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Stop the event from propagating to objects behind the overlay
      pointer.event.stopPropagation();
    });

    overlay.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      // Stop move events from propagating as well
      pointer.event.stopPropagation();
    });

    // Dialog container using screen coordinates
    const dialogContainer = this.add.container(this.uiCamera.width / 2, this.uiCamera.height / 2);
    dialogContainer.setScrollFactor(0, 0).setDepth(3001);

    // Dialog background - make interactive to capture clicks
    const background = this.add.rectangle(0, 0, 400, 180, ColorTheme.SECONDARY_DARK, 0.95);
    background.setStrokeStyle(3, ColorTheme.BORDER_SECONDARY);
    background.setInteractive();

    // Prevent clicks on dialog background from propagating
    background.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
    });

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
    }).setOrigin(0.5).setInteractive().setName('dialog_confirm_button');

    // Cancel button
    const cancelButton = this.add.text(60, 40, 'Cancel', {
      ...ColorTheme.getTextStyle('small'),
      fontSize: '16px',
      backgroundColor: `#${ColorTheme.BUTTON_SECONDARY_HOVER.toString(16).padStart(6, '0')}`,
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive().setName('dialog_cancel_button');

    dialogContainer.add([background, titleText, messageText, confirmButton, cancelButton]);

    // Button interactions
    confirmButton.on('pointerdown', () => {
      this.isDialogOpen = false; // Reset dialog flag
      overlay.destroy();
      dialogContainer.destroy();
      onConfirm();

      // Re-enable input after a small delay to prevent the same click from placing tiles
      this.time.delayedCall(50, () => {
        this.enableSceneInput();
      });
    });

    cancelButton.on('pointerdown', () => {
      this.isDialogOpen = false; // Reset dialog flag
      overlay.destroy();
      dialogContainer.destroy();

      // Re-enable input after a small delay to prevent the same click from placing tiles
      this.time.delayedCall(50, () => {
        this.enableSceneInput();
      });
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
    // Create a copy of the children list to avoid iteration issues during destruction
    const childrenToRemove = [...this.children.list].filter(child => {
      return child.name && (
        child.name.startsWith('tile_') ||
        child.name.startsWith('enemy_') ||
        child.name.startsWith('spawn_')
      );
    });

    // Remove all game object visuals
    childrenToRemove.forEach(child => {
      child.destroy();
    });


  }

  private showMessage(text: string, color: number, duration: number = 3000): void {
    // Create message container using screen coordinates
    const messageContainer = this.add.container(this.uiCamera.width / 2, 100);
    messageContainer.setScrollFactor(0, 0).setDepth(2000);

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
    // Create progress message container using screen coordinates
    const container = this.add.container(this.uiCamera.width / 2, 150);
    container.setScrollFactor(0, 0).setDepth(2000);

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

  init(data?: { customization?: CustomizationData; selectedOption?: OptionElementData }): void {
    // Store customization data for preview purposes
    // Load from storage if not provided to ensure latest customization is used
    this.customization = data?.customization || StorageUtils.loadCustomization();

    // Handle selection from GridSelectionScene
    if (data?.selectedOption) {
      this.handleGridSelection(data.selectedOption);
    }

    // Cleanup previous instance if any
    if (this.autosaveTimer) {
      StorageUtils.clearAutosaveTimer(this.autosaveTimer);
      this.autosaveTimer = null;
    }
  }

  shutdown(): void {
    // Save current state when scene is stopped/shutdown
    this.saveCurrentState();

    if (this.autosaveTimer) {
      StorageUtils.clearAutosaveTimer(this.autosaveTimer);
      this.autosaveTimer = null;
    }
  }

  destroy(): void {
    // Save current state before destroying
    this.saveCurrentState();

    if (this.autosaveTimer) {
      StorageUtils.clearAutosaveTimer(this.autosaveTimer);
      this.autosaveTimer = null;
    }
  }

  /**
   * Saves the current level state to local storage for persistence across scene transitions
   */
  private saveCurrentState(): void {
    if (this.levelData) {
      console.log('💾 Saving current level state for persistence across scene transitions');
      console.log('📊 Saving level data:', {
        name: this.levelData.metadata?.name,
        tilesCount: this.levelData.tiles?.length,
        enemiesCount: this.levelData.enemies?.length,
        hasSpawn: !!this.levelData.spawn
      });
      StorageUtils.saveToLocalStorage(this.levelData);
      console.log('✅ Level state saved successfully');
    } else {
      console.log('⚠️ No level data to save');
    }
  }

  getLevelData(): LevelData | null {
    return this.levelData ? { ...this.levelData } : null;
  }

}