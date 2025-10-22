import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import { LevelData, TILE_TYPES, ENEMY_TYPES, GRID_SIZE, DEFAULT_LEVEL_SIZE } from '../../../shared/types/level';
import { GridUtils } from '../utils/GridUtils';
import { LevelManager } from '../managers/LevelManager';
import { StorageUtils, CustomizationData } from '../utils/StorageUtils';
import { ColorTheme } from '../utils/ColorTheme';
import { OptionElementData } from '../ui/OptionElement';
import { LevelValidationHelper } from '../utils/LevelValidationHelper';

export class LevelBuilder extends Scene {
  private camera: Phaser.Cameras.Scene2D.Camera;
  private uiCamera: Phaser.Cameras.Scene2D.Camera;
  private levelData: LevelData;
  
  // Layer system - proper depth-based layering
  private backgroundLayer: Phaser.GameObjects.Container;  // Layer 1: Grid lines only (depth 0-99)
  private tileLayer: Phaser.GameObjects.Container;        // Layer 2: Interactive tiles (depth 100-199)
  private entityLayer: Phaser.GameObjects.Container;      // Layer 3: Enemies/spawn (depth 200-299)
  
  // Layer depth constants
  private static readonly LAYER_DEPTHS = {
    BACKGROUND: 0,    // Grid lines
    TILES: 100,       // Interactive tiles
    ENTITIES: 200     // Enemies and spawn points
  };
  
  private selectedTileType: number = TILE_TYPES.WALL;
  // private isDragging: boolean = false; // Removed - no longer needed with individual click handlers
  private placementMode: 'tile' | 'enemy' | 'spawn' = 'tile';
  private selectedEnemyType: number = ENEMY_TYPES.BASIC;
  private selectedTileSprite: string = 'tile-dirt1';
  private isDialogOpen: boolean = false;

  // Camera state persistence
  private cameraState: {
    zoom: number;
    scrollX: number;
    scrollY: number;
  } | null = null;




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
  private validationHelper: LevelValidationHelper;
  private autosaveTimer: number | null = null;
  private customization: CustomizationData;

  constructor() {
    super('LevelBuilder');
    this.levelManager = new LevelManager();
    this.validationHelper = new LevelValidationHelper(this.levelManager);
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

      console.log('📷 Restoring camera state if available');
      this.restoreCameraState();

      console.log('💾 Setting up autosave');
      this.setupAutosave();

      // Test tile rendering - add a test tile to verify sprites are working
      this.addTestTile();

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
          console.warn('⚠️ Backup data validation failed, creating new level:', validationError);
          this.levelData = this.levelManager.createNewLevel('New Level', 'Player');
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

  private setupGrid(): void {
    // Create the three-layer system
    this.backgroundLayer = this.add.container(0, 0);
    this.backgroundLayer.setDepth(LevelBuilder.LAYER_DEPTHS.BACKGROUND);
    
    this.tileLayer = this.add.container(0, 0);
    this.tileLayer.setDepth(LevelBuilder.LAYER_DEPTHS.TILES);
    
    this.entityLayer = this.add.container(0, 0);
    this.entityLayer.setDepth(LevelBuilder.LAYER_DEPTHS.ENTITIES);
    
    // Ensure layers are only rendered by main camera (not UI camera)
    this.uiCamera.ignore(this.backgroundLayer);
    this.uiCamera.ignore(this.tileLayer);
    this.uiCamera.ignore(this.entityLayer);
    
    // Draw grid on background layer
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
    // Create grid graphics on the background layer
    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, 0x555555, 0.5);

    const levelPixelWidth = DEFAULT_LEVEL_SIZE * GRID_SIZE;
    const levelPixelHeight = DEFAULT_LEVEL_SIZE * GRID_SIZE;

    // Draw vertical lines
    for (let x = 0; x <= levelPixelWidth; x += GRID_SIZE) {
      gridGraphics.moveTo(x, 0);
      gridGraphics.lineTo(x, levelPixelHeight);
    }

    // Draw horizontal lines
    for (let y = 0; y <= levelPixelHeight; y += GRID_SIZE) {
      gridGraphics.moveTo(0, y);
      gridGraphics.lineTo(levelPixelWidth, y);
    }

    gridGraphics.strokePath();
    
    // Add grid to background layer
    this.backgroundLayer.add(gridGraphics);
  }

  private setupInput(): void {
    // Add global click handler for empty areas (tile placement)
    this.input.on('pointerdown', this.onGlobalPointerDown, this);

    // Enhanced camera controls for navigating large levels
    this.setupCameraControls();
  }

  private onGlobalPointerDown(pointer: Phaser.Input.Pointer): void {
    console.log('🖱️ Global pointer down:', { x: pointer.x, y: pointer.y, worldX: pointer.worldX, worldY: pointer.worldY });
    
    // Don't handle clicks if dialog is open
    if (this.isDialogOpen) {
      console.log('❌ Blocked: Dialog is open');
      return;
    }

    // Check if we're clicking on UI elements first
    const hitObjects = this.input.hitTestPointer(pointer);
    const isClickingUIButton = hitObjects.some(obj => {
      if (obj.name && obj.name.includes('button')) return true;
      if (obj.parentContainer) {
        const containerName = obj.parentContainer.name;
        return containerName === 'header' || containerName === 'footer';
      }
      return false;
    });

    if (isClickingUIButton || this.isPointerInUIArea(pointer)) {
      console.log('❌ Blocked: Clicking on UI element');
      return;
    }

    // Handle placement based on current mode
    console.log('✅ Processing placement for mode:', this.placementMode);
    this.handlePlacement(pointer.worldX, pointer.worldY);
  }

  private setupCameraControls(): void {
    const cameraSpeed = 8;
    const levelPixelWidth = DEFAULT_LEVEL_SIZE * GRID_SIZE;
    const levelPixelHeight = DEFAULT_LEVEL_SIZE * GRID_SIZE;

    // Set camera bounds to prevent scrolling beyond level
    this.camera.setBounds(0, 0, levelPixelWidth, levelPixelHeight);

    console.log('📷 Camera setup:', {
      bounds: { x: 0, y: 0, width: levelPixelWidth, height: levelPixelHeight },
      cameraSize: { width: this.camera.width, height: this.camera.height },
      initialPosition: { x: this.camera.scrollX, y: this.camera.scrollY },
      initialZoom: this.camera.zoom
    });

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
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
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
    this.camera.ignore(this.children.list.filter(child => (child as Phaser.GameObjects.GameObject & { depth: number }).depth >= 1000));
    
    // UI camera renders UI elements (depth 1000+)
    this.uiCamera.ignore(this.children.list.filter(child => (child as Phaser.GameObjects.GameObject & { depth: number }).depth < 1000));
    
    console.log('📷 Camera rendering configured:');
    console.log('  - Main camera: renders depths 0-999');
    console.log('  - UI camera: renders depths 1000+');
    console.log('  - Layer depths: Background(0), Tiles(100), Entities(200)');
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

    // Calculate available space and button dimensions
    const availableWidth = this.uiCamera.width - 40; // 20px margin on each side
    const buttonHeight = 40;
    const buttonSpacing = 10;
    const backButtonWidth = 50; // Smaller for just arrow
    const modeButtonWidth = Math.floor((availableWidth - backButtonWidth - buttonSpacing) / 3); // Distribute remaining space among 3 mode buttons

    // Back button (positioned on the left)
    const backButton = this.add.rectangle(-availableWidth / 2 + backButtonWidth / 2 + 20, 0, backButtonWidth, buttonHeight, ColorTheme.BUTTON_SECONDARY)
      .setInteractive()
      .setStrokeStyle(2, ColorTheme.BORDER_PRIMARY)
      .setName('header_back_button');

    const backLabel = this.add.text(-availableWidth / 2 + backButtonWidth / 2 + 20, 0, '←', {
      ...ColorTheme.getTextStyle('small'),
      fontSize: '18px',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    backButton.on('pointerdown', () => {
      // Save current state before returning to main menu
      this.saveCurrentState();
      this.scene.start('MainMenu');
    });

    backButton.on('pointerover', () => backButton.setStrokeStyle(3, ColorTheme.SUCCESS));
    backButton.on('pointerout', () => backButton.setStrokeStyle(2, ColorTheme.BORDER_PRIMARY));

    // Mode selection buttons
    const modes = [
      { mode: 'tile', color: 0x4444AA, label: 'Tiles' },
      { mode: 'enemy', color: 0xAA4444, label: 'Enemies' },
      { mode: 'spawn', color: 0x44AA44, label: 'Spawn' }
    ];

    modes.forEach((modeData, index) => {
      const x = -availableWidth / 2 + backButtonWidth + buttonSpacing + (index * (modeButtonWidth + buttonSpacing)) + modeButtonWidth / 2;

      const button = this.add.rectangle(x, 0, modeButtonWidth, buttonHeight, modeData.color)
        .setInteractive()
        .setStrokeStyle(2, ColorTheme.BORDER_PRIMARY)
        .setName(`header_${modeData.mode}_button`);

      const label = this.add.text(x, 0, modeData.label, {
        ...ColorTheme.getTextStyle('small'),
        fontSize: '12px'
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

    // Add back button to header
    header.add([backButton, backLabel]);



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
      if (child && 'setDepth' in child) {
        (child as Phaser.GameObjects.GameObject & { setDepth: (depth: number) => void }).setDepth(1002);
      }
    });

    this.updateModeSelection();
  }

  private disableSceneInput(): void {
    console.log('🚫 DISABLING scene input events');
    // Reset any ongoing operations
    this.disableCameraZoom();
  }

  private enableSceneInput(): void {
    console.log('✅ ENABLING scene input events');
    this.enableCameraZoom();
  }

  private disableCameraZoom(): void {
    // Remove camera zoom wheel event
    this.input.off('wheel');
  }

  private enableCameraZoom(): void {
    // Re-add camera zoom wheel event - only affects world camera, UI camera stays fixed
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
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



  // Old input handling methods removed - now using individual object click handlers

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

  // onPointerUp method removed - no longer needed with individual click handlers

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
    
    console.log(`🎯 Placing tile at world position (${worldX}, ${worldY}) -> grid (${gridPos.x}, ${gridPos.y})`);
    console.log(`🎨 Selected tile sprite: ${this.selectedTileSprite}`);
    console.log(`🎯 Placement mode: ${this.placementMode}`);

    if (GridUtils.isValidGridPosition(gridPos.x, gridPos.y, DEFAULT_LEVEL_SIZE, DEFAULT_LEVEL_SIZE)) {
      const row = this.levelData.tiles[gridPos.y];
      const spriteRow = this.levelData.tileSprites[gridPos.y];
      if (row && spriteRow) {
        const currentTileType = row[gridPos.x];
        
        // Check if there's already a tile at this position
        if (currentTileType !== undefined && currentTileType !== TILE_TYPES.EMPTY) {
          // Check if there are any entities (enemies or spawn) at this position
          const hasEnemy = this.levelData.enemies.some(enemy => enemy.x === gridPos.x && enemy.y === gridPos.y);
          const hasSpawn = this.levelData.spawn && this.levelData.spawn.x === gridPos.x && this.levelData.spawn.y === gridPos.y;
          
          if (hasEnemy || hasSpawn) {
            // Don't remove tile if there are entities on top
            console.log(`⚠️ Cannot remove tile at (${gridPos.x}, ${gridPos.y}) - entities present`);
            this.showMessage('Cannot remove tile with entities on top', 0xAA4444, 2000);
            return;
          } else {
            // Remove the existing tile (toggle off)
            console.log(`🗑️ Removing tile at (${gridPos.x}, ${gridPos.y})`);
            row[gridPos.x] = TILE_TYPES.EMPTY;
            spriteRow[gridPos.x] = null;
            this.renderTileAt(gridPos.x, gridPos.y);
            this.updateLevelManager();
            return;
          }
        } else {
          // Place new tile (toggle on)
          console.log(`✅ Placing new tile at (${gridPos.x}, ${gridPos.y})`);
          row[gridPos.x] = 1; // Generic "tile exists" marker
          spriteRow[gridPos.x] = this.selectedTileSprite; // Store the selected sprite
          
          console.log(`✅ Tile data updated:`, {
            tileType: row[gridPos.x],
            tileSprite: spriteRow[gridPos.x],
            gridPos: { x: gridPos.x, y: gridPos.y }
          });
          
          this.renderTileAt(gridPos.x, gridPos.y);
          this.updateLevelManager();
        }
      } else {
        console.error(`❌ Invalid row or spriteRow at grid position (${gridPos.x}, ${gridPos.y})`);
      }
    } else {
      console.warn(`⚠️ Invalid grid position (${gridPos.x}, ${gridPos.y})`);
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

    // Remove existing tile at this position from the tile layer
    const existingTile = this.tileLayer.getByName(tileKey);
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

  private createTileSprite(_tileType: number, x: number, y: number, gridX: number, gridY: number, storedSprite?: string | null): Phaser.GameObjects.Image | null {
    // Use stored sprite if available, otherwise use the selected tile sprite
    const spriteKey = storedSprite || this.selectedTileSprite;

    if (!spriteKey) {
      console.warn('No sprite key available for tile');
      return null;
    }

    const tileSprite = this.add.image(x + GRID_SIZE / 2, y + GRID_SIZE / 2, spriteKey);
    tileSprite.setDisplaySize(GRID_SIZE, GRID_SIZE);
    
    // Make tile interactive and clickable
    tileSprite.setInteractive();
    
    // Store grid position in userData for easy access
    tileSprite.setData('gridX', gridX);
    tileSprite.setData('gridY', gridY);
    tileSprite.setData('tileType', _tileType);
    tileSprite.setData('spriteKey', spriteKey);
    
    // Add click handler for tile interaction
    tileSprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handleTileClick(pointer, gridX, gridY, tileSprite);
    });
    
    // Add hover effects
    tileSprite.on('pointerover', () => {
      if (!this.isDialogOpen) {
        tileSprite.setAlpha(0.8);
      }
    });
    
    tileSprite.on('pointerout', () => {
      tileSprite.setAlpha(1.0);
    });
    
    // Add tile to the tile layer
    this.tileLayer.add(tileSprite);

    return tileSprite;
  }

  /**
   * Handles tile click events with proper priority checking
   */
  private handleTileClick(pointer: Phaser.Input.Pointer, gridX: number, gridY: number, _tileSprite: Phaser.GameObjects.Image): void {
    console.log('🎯 Tile clicked:', { gridX, gridY, placementMode: this.placementMode });
    
    // Don't handle clicks if dialog is open
    if (this.isDialogOpen) {
      console.log('❌ Blocked: Dialog is open');
      return;
    }

    // Check if we're clicking on UI elements first
    const hitObjects = this.input.hitTestPointer(pointer);
    const isClickingUIButton = hitObjects.some(obj => {
      if (obj.name && obj.name.includes('button')) return true;
      if (obj.parentContainer) {
        const containerName = obj.parentContainer.name;
        return containerName === 'header' || containerName === 'footer';
      }
      return false;
    });

    if (isClickingUIButton || this.isPointerInUIArea(pointer)) {
      console.log('❌ Blocked: Clicking on UI element');
      return;
    }

    // Only handle tile-specific placement in tile mode
    // For enemy/spawn mode, let the global handler deal with it
    if (this.placementMode === 'tile') {
      this.handlePlacement(pointer.worldX, pointer.worldY);
    }
  }

  /**
   * Handles entity click events (enemies and spawn points) with highest priority
   */
  private handleEntityClick(pointer: Phaser.Input.Pointer, gridX: number, gridY: number, entityType: 'enemy' | 'spawn', _entitySprite: Phaser.GameObjects.Image): void {
    console.log('🎯 Entity clicked:', { gridX, gridY, entityType, placementMode: this.placementMode });
    
    // Don't handle clicks if dialog is open
    if (this.isDialogOpen) {
      console.log('❌ Blocked: Dialog is open');
      return;
    }

    // Check if we're clicking on UI elements first
    const hitObjects = this.input.hitTestPointer(pointer);
    const isClickingUIButton = hitObjects.some(obj => {
      if (obj.name && obj.name.includes('button')) return true;
      if (obj.parentContainer) {
        const containerName = obj.parentContainer.name;
        return containerName === 'header' || containerName === 'footer';
      }
      return false;
    });

    if (isClickingUIButton || this.isPointerInUIArea(pointer)) {
      console.log('❌ Blocked: Clicking on UI element');
      return;
    }

    // Always remove entities when clicked, regardless of placement mode
    if (entityType === 'enemy') {
      // Remove enemy and leave tile intact
      this.removeEnemyAt(gridX, gridY);
    } else if (entityType === 'spawn') {
      // Remove spawn point and leave tile intact
      this.removeSpawnAt(gridX, gridY);
    }
  }

  /**
   * Removes enemy at the specified grid position
   */
  private removeEnemyAt(gridX: number, gridY: number): void {
    const existingEnemyIndex = this.levelData.enemies.findIndex(
      enemy => enemy.x === gridX && enemy.y === gridY
    );

    if (existingEnemyIndex >= 0) {
      // Remove existing enemy
      this.levelData.enemies.splice(existingEnemyIndex, 1);
      this.removeEnemyVisual(gridX, gridY);
      this.showMessage('Enemy removed', 0xAAAA44, 1500);
      this.updateLevelManager();
    }
  }

  /**
   * Removes spawn point at the specified grid position
   */
  private removeSpawnAt(gridX: number, gridY: number): void {
    if (this.levelData.spawn && this.levelData.spawn.x === gridX && this.levelData.spawn.y === gridY) {
      // Remove spawn point
      this.levelData.spawn = null;
      this.removeSpawnVisual();
      this.showMessage('Spawn point removed', 0xAAAA44, 1500);
      this.updateLevelManager();
    }
  }

  /**
   * Toggles enemy at the specified grid position
   */
  private toggleEnemyAt(gridX: number, gridY: number): void {
    const existingEnemyIndex = this.levelData.enemies.findIndex(
      enemy => enemy.x === gridX && enemy.y === gridY
    );

    if (existingEnemyIndex >= 0) {
      // Remove existing enemy
      this.levelData.enemies.splice(existingEnemyIndex, 1);
      this.removeEnemyVisual(gridX, gridY);
      this.showMessage('Enemy removed', 0xAAAA44, 1500);
    } else {
      // Add new enemy
      this.levelData.enemies.push({
        x: gridX,
        y: gridY,
        type: this.selectedEnemyType
      });
      this.renderEnemyAt(gridX, gridY, this.selectedEnemyType);
      this.showMessage('Enemy added', 0x44AA44, 1500);
    }
    this.updateLevelManager();
  }

  /**
   * Moves spawn point to the specified grid position
   */
  private moveSpawnTo(gridX: number, gridY: number): void {
    // Remove previous spawn point visual
    this.removeSpawnVisual();

    // Update spawn position
    this.levelData.spawn = { x: gridX, y: gridY };
    this.renderSpawnAt(gridX, gridY);
    this.updateLevelManager();
    this.showMessage('Spawn point moved', 0x44AA44, 1500);
  }

  private placeEnemy(worldX: number, worldY: number): void {
    if (!this.levelData) return;

    const gridPos = GridUtils.worldToGrid(worldX, worldY);
    console.log('🎯 Placing enemy at world position:', { worldX, worldY, gridPos });
    console.log('🔢 Grid calculation details:', {
      worldX, worldY,
      gridX: Math.floor(worldX / GRID_SIZE),
      gridY: Math.floor(worldY / GRID_SIZE),
      calculatedGridPos: gridPos
    });

    if (GridUtils.isValidGridPosition(gridPos.x, gridPos.y, DEFAULT_LEVEL_SIZE, DEFAULT_LEVEL_SIZE)) {
      // Validate enemy placement using the helper
      const placementValidation = this.validationHelper.validateEnemyPlacement(this.levelData, gridPos.x, gridPos.y);
      console.log('✅ Enemy placement validation:', placementValidation);
      
      if (!placementValidation.isValid) {
        this.showMessage(placementValidation.message, 0xAA4444, 2000);
        return;
      }

      // Check if enemy already exists at this position
      const existingEnemyIndex = this.levelData.enemies.findIndex(
        enemy => enemy.x === gridPos.x && enemy.y === gridPos.y
      );

      console.log('🔍 Existing enemy check:', { existingEnemyIndex, enemiesCount: this.levelData.enemies.length });
      console.log('👾 Current enemies in level:', this.levelData.enemies.map(e => ({ x: e.x, y: e.y, type: e.type })));

      if (existingEnemyIndex >= 0) {
        // Remove existing enemy
        console.log('🗑️ Removing existing enemy at:', { x: gridPos.x, y: gridPos.y });
        this.levelData.enemies.splice(existingEnemyIndex, 1);
        this.removeEnemyVisual(gridPos.x, gridPos.y);
        // Re-render the tile to ensure it's visible after enemy removal
        this.renderTileAt(gridPos.x, gridPos.y);
      } else {
        // Add new enemy
        console.log('✅ Adding new enemy at:', { x: gridPos.x, y: gridPos.y, type: this.selectedEnemyType });
        this.levelData.enemies.push({
          x: gridPos.x,
          y: gridPos.y,
          type: this.selectedEnemyType
        });
        this.renderEnemyAt(gridPos.x, gridPos.y, this.selectedEnemyType);
        // Re-render the tile to ensure it's visible behind the enemy
        this.renderTileAt(gridPos.x, gridPos.y);
      }
      this.updateLevelManager();
    } else {
      console.log('❌ Invalid grid position:', gridPos);
    }
  }

  private placeSpawn(worldX: number, worldY: number): void {
    if (!this.levelData) return;

    const gridPos = GridUtils.worldToGrid(worldX, worldY);

    if (GridUtils.isValidGridPosition(gridPos.x, gridPos.y, DEFAULT_LEVEL_SIZE, DEFAULT_LEVEL_SIZE)) {
      // Validate spawn placement using the helper
      const placementValidation = this.validationHelper.validateSpawnPlacement(this.levelData, gridPos.x, gridPos.y);
      if (!placementValidation.isValid) {
        this.showMessage(placementValidation.message, 0xAA4444, 2000);
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

    console.log('🎯 Rendering enemy:', { gridX, gridY, enemyType, worldPos, enemyKey });

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

    console.log('🎨 Enemy sprite properties:', { spriteKey, scale, tint });

    const enemy = this.add.image(worldPos.x, worldPos.y, spriteKey);
    enemy.setScale(scale);
    enemy.setTint(tint);
    enemy.setName(enemyKey);
    
    console.log('👾 Enemy created:', {
      position: { x: enemy.x, y: enemy.y },
      scale: { x: enemy.scaleX, y: enemy.scaleY },
      tint: enemy.tint,
      visible: enemy.visible,
      alpha: enemy.alpha,
      depth: enemy.depth
    });
    
    // Make enemy interactive with highest priority
    enemy.setInteractive();
    
    // Store enemy data for easy access
    enemy.setData('gridX', gridX);
    enemy.setData('gridY', gridY);
    enemy.setData('enemyType', enemyType);
    enemy.setData('spriteKey', spriteKey);
    
    // Add click handler for enemy interaction (highest priority)
    enemy.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handleEntityClick(pointer, gridX, gridY, 'enemy', enemy);
    });
    
    // Add hover effects
    enemy.on('pointerover', () => {
      if (!this.isDialogOpen) {
        enemy.setAlpha(0.8);
        enemy.setScale(scale * 1.1);
      }
    });
    
    enemy.on('pointerout', () => {
      enemy.setAlpha(1.0);
      enemy.setScale(scale);
    });
    
    // Add enemy to the entity layer (highest depth)
    this.entityLayer.add(enemy);
    
    console.log('📦 Enemy added to entity layer:', {
      entityLayerDepth: this.entityLayer.depth,
      entityLayerChildrenCount: this.entityLayer.length,
      enemyDepth: enemy.depth
    });
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
    
    // Make spawn point interactive with highest priority
    spawn.setInteractive();
    
    // Store spawn data for easy access
    spawn.setData('gridX', gridX);
    spawn.setData('gridY', gridY);
    spawn.setData('entityType', 'spawn');
    spawn.setData('spriteKey', avatarSprite);
    
    // Add click handler for spawn interaction (highest priority)
    spawn.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handleEntityClick(pointer, gridX, gridY, 'spawn', spawn);
    });
    
    // Add hover effects
    spawn.on('pointerover', () => {
      if (!this.isDialogOpen) {
        spawn.setAlpha(1.0);
        spawn.setScale(0.45);
      }
    });
    
    spawn.on('pointerout', () => {
      spawn.setAlpha(0.8);
      spawn.setScale(0.4);
    });
    
    // Add spawn point to the entity layer (highest depth)
    this.entityLayer.add(spawn);

    const spawnText = this.add.text(worldPos.x, worldPos.y + 25, 'SPAWN', {
      ...ColorTheme.getTextStyle('small'),
      fontSize: '8px',
      backgroundColor: `#${ColorTheme.SUCCESS.toString(16).padStart(6, '0')}`,
      padding: { x: 3, y: 1 }
    }).setOrigin(0.5);
    spawnText.setName(`${spawnKey}_text`);
    
    // Add spawn text to the entity layer as well
    this.entityLayer.add(spawnText);
  }

  private removeEnemyVisual(gridX: number, gridY: number): void {
    const enemyKey = `enemy_${gridX}_${gridY}`;
    const enemy = this.entityLayer.getByName(enemyKey);

    if (enemy) enemy.destroy();
  }

  private removeSpawnVisual(): void {
    const spawn = this.entityLayer.getByName('spawn_point');
    const spawnText = this.entityLayer.getByName('spawn_point_text');

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
      if (child && 'setDepth' in child) {
        (child as Phaser.GameObjects.GameObject & { setDepth: (depth: number) => void }).setDepth(1002);
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
    return this.validationHelper.validateLevel(this.levelData);
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
        void this.saveAndPost();
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

    // Validate metadata using the helper
    const metadataValidation = this.validationHelper.validateMetadata(this.levelData);
    if (!metadataValidation.isValid) {
      this.showMessage(metadataValidation.message, 0xAA4444);
      return false;
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
    this.saveCameraState();

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
      returnData: { customization: this.customization },
      cameraState: this.cameraState
    });

    console.log('🎯 Navigated to GridSelectionScene for tile selection');
  }

  private showEnemySelectionPopup(): void {
    console.log('🚀 === SHOWING ENEMY SELECTION ===');

    // Save current state before navigating away
    this.saveCurrentState();
    this.saveCameraState();

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
      returnData: { customization: this.customization },
      cameraState: this.cameraState
    });

    console.log('🎯 Navigated to GridSelectionScene for enemy selection');
  }

  private handleGridSelection(selectedOption: OptionElementData): void {
    console.log('✅ Handling grid selection:', selectedOption);

    const data = selectedOption.data as Record<string, unknown>; // Type assertion for the data field

    // Check if this is an enemy selection (has scale property)
    if (data.type !== undefined && data.scale !== undefined) {
      // This is an enemy selection
      this.selectedEnemyType = data.type as number;
      this.placementMode = 'enemy';
      this.updateModeSelection();
      console.log('👾 Enemy selection updated:', { type: this.selectedEnemyType });
    } else if (data.sprite && data.type !== undefined) {
      // This is a tile selection (has sprite and type, but no scale)
      this.selectedTileSprite = data.sprite as string;
      this.selectedTileType = data.type as number;
      this.placementMode = 'tile';
      this.updateModeSelection();
      console.log('🎨 Tile selection updated:', { sprite: this.selectedTileSprite, type: this.selectedTileType });
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
    // Clear all layers
    this.backgroundLayer.removeAll(true);
    this.tileLayer.removeAll(true);
    this.entityLayer.removeAll(true);
    
    // Redraw the grid on background layer
    this.drawGrid();
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

  init(data?: { customization?: CustomizationData; selectedOption?: OptionElementData; cameraState?: { zoom: number; scrollX: number; scrollY: number } }): void {
    // Store customization data for preview purposes
    // Load from storage if not provided to ensure latest customization is used
    this.customization = data?.customization || StorageUtils.loadCustomization();

    // Restore camera state if provided (when returning from GridSelectionScene)
    if (data?.cameraState) {
      this.cameraState = data.cameraState;
      console.log('📷 Camera state received in init:', this.cameraState);
    }

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

  /**
   * Saves the current camera state (zoom and position) for persistence across scene transitions
   */
  private saveCameraState(): void {
    if (this.camera) {
      this.cameraState = {
        zoom: this.camera.zoom,
        scrollX: this.camera.scrollX,
        scrollY: this.camera.scrollY
      };
      console.log('📷 Camera state saved:', this.cameraState);
    }
  }

  /**
   * Restores the camera state (zoom and position) from saved state
   */
  private restoreCameraState(): void {
    if (this.camera && this.cameraState) {
      console.log('📷 Restoring camera state:', this.cameraState);
      
      // Apply the saved camera state
      this.camera.setZoom(this.cameraState.zoom);
      this.camera.setScroll(this.cameraState.scrollX, this.cameraState.scrollY);
      
      console.log('✅ Camera state restored successfully');
      console.log('📷 Current camera state after restore:', {
        zoom: this.camera.zoom,
        scrollX: this.camera.scrollX,
        scrollY: this.camera.scrollY
      });
    } else if (this.camera) {
      console.log('📷 No saved camera state found, using default camera settings');
      console.log('📷 Default camera state:', {
        zoom: this.camera.zoom,
        scrollX: this.camera.scrollX,
        scrollY: this.camera.scrollY
      });
    }
  }

  getLevelData(): LevelData | null {
    return this.levelData ? { ...this.levelData } : null;
  }

  private addTestTile(): void {
    console.log('🧪 Adding test tile to verify sprite rendering');
    
    // Add a test tile at position (5, 5) to verify sprites are working
    const testX = 5;
    const testY = 5;
    const worldPos = GridUtils.gridToWorld(testX, testY);
    
    // Create a test tile sprite directly in the scene (not in a layer) to test if sprites work at all
    const testSprite = this.add.image(worldPos.x + GRID_SIZE / 2, worldPos.y + GRID_SIZE / 2, 'tile-dirt1');
    testSprite.setDisplaySize(GRID_SIZE, GRID_SIZE);
    testSprite.setTint(0xFF0000); // Make it red to make it obvious
    testSprite.setName('test_tile');
    
    console.log('🧪 Test tile created:', {
      position: { x: testSprite.x, y: testSprite.y },
      visible: testSprite.visible,
      alpha: testSprite.alpha,
      scale: { x: testSprite.scaleX, y: testSprite.scaleY }
    });
    
    // Also add a test tile to the tile layer
    const testTileInLayer = this.tileLayer.scene.add.image(worldPos.x + GRID_SIZE / 2, worldPos.y + GRID_SIZE / 2 + 50, 'tile-grass1');
    testTileInLayer.setDisplaySize(GRID_SIZE, GRID_SIZE);
    testTileInLayer.setTint(0x00FF00); // Make it green
    testTileInLayer.setName('test_tile_in_layer');
    this.tileLayer.add(testTileInLayer);
    
    console.log('🧪 Test tile in layer created:', {
      position: { x: testTileInLayer.x, y: testTileInLayer.y },
      visible: testTileInLayer.visible,
      alpha: testTileInLayer.alpha,
      scale: { x: testTileInLayer.scaleX, y: testTileInLayer.scaleY },
      layerChildrenCount: this.tileLayer.length
    });
  }

}