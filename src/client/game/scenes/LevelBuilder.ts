import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import { LevelData, TILE_TYPES, ENEMY_TYPES, GRID_SIZE, DEFAULT_LEVEL_SIZE } from '../../../shared/types/level';
import { GridUtils } from '../utils/GridUtils';
import { LevelManager } from '../managers/LevelManager';
import { StorageUtils, CustomizationData } from '../utils/StorageUtils';
import { ColorTheme } from '../utils/ColorTheme';
import { OptionElementData } from '../ui/OptionElement';
import { LevelValidationService } from '../services';
import { LevelBuilderUI, LevelBuilderUICallbacks, StageInfo } from '../ui/managers/LevelBuilderUI';
import { LevelBuilderInput, LevelBuilderInputCallbacks } from '../input/LevelBuilderInput';

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
  
  private setupInputManager(): void {
    console.log('🖱️ === SETUP INPUT MANAGER START ===');
    console.log('🖱️ Current stage:', this.currentStage);
    console.log('🖱️ UI manager exists:', !!this.uiManager);
    console.log('🖱️ Selected tile sprite:', this.selectedTileSprite);
    
    // Create input manager with callbacks
    const inputCallbacks: LevelBuilderInputCallbacks = {
      onTilePlacement: (worldX: number, worldY: number) => {
        console.log('🎯 ========================================');
        console.log('🎯 STEP 2: INPUT CALLBACK - onTilePlacement');
        console.log('🎯 ========================================');
        console.log('🖱️ Input callback - onTilePlacement:', { worldX, worldY });
        console.log('🎯 Current stage:', this.currentStage);
        console.log('🎯 Level data exists:', !!this.levelData);
        console.log('🎯 Calling handlePlacement...');
        this.handlePlacement(worldX, worldY);
        console.log('🎯 === HANDLE PLACEMENT CALLED ===');
      },
      onEnemyPlacement: (worldX: number, worldY: number) => {
        console.log('🖱️ Input callback - onEnemyPlacement:', { worldX, worldY });
        this.handlePlacement(worldX, worldY);
      },
      onSpawnPlacement: (worldX: number, worldY: number) => {
        console.log('🖱️ Input callback - onSpawnPlacement:', { worldX, worldY });
        this.handlePlacement(worldX, worldY);
      },
      onTileClick: (pointer: Phaser.Input.Pointer, gridX: number, gridY: number, tileSprite: Phaser.GameObjects.Image) => {
        console.log('🖱️ Input callback - onTileClick:', { gridX, gridY });
        this.handleTileClick(pointer, gridX, gridY, tileSprite);
      },
      onEntityClick: (pointer: Phaser.Input.Pointer, gridX: number, gridY: number, entityType: 'enemy' | 'spawn', entitySprite: Phaser.GameObjects.Image) => {
        console.log('🖱️ Input callback - onEntityClick:', { gridX, gridY, entityType });
        this.handleEntityClick(pointer, gridX, gridY, entityType, entitySprite);
      },
      onBackgroundClick: (pointer: Phaser.Input.Pointer) => {
        console.log('🖱️ Input callback - onBackgroundClick:', { worldX: pointer.worldX, worldY: pointer.worldY });
        this.handlePlacement(pointer.worldX, pointer.worldY);
      },
      isDialogOpen: () => {
        const isOpen = this.uiManager?.isDialogOpen() || false;
        console.log('🖱️ Input callback - isDialogOpen:', isOpen);
        return isOpen;
      },
      getCurrentStage: () => {
        console.log('🖱️ Input callback - getCurrentStage:', this.currentStage);
        return this.currentStage;
      },
      isPointerInUIArea: (pointer: Phaser.Input.Pointer) => {
        const inUIArea = this.isPointerInUIArea(pointer);
        console.log('🖱️ Input callback - isPointerInUIArea:', inUIArea);
        return inUIArea;
      }
    };

    console.log('🖱️ Creating LevelBuilderInput...');
    this.inputManager = new LevelBuilderInput(this, inputCallbacks);
    console.log('🖱️ Input manager created:', !!this.inputManager);
    
    // Enable input handling
    this.inputManager.enableInput();
    console.log('🖱️ Input enabled');
    
    console.log('🖱️ === SETUP INPUT MANAGER END ===');
  }

  private currentStage: 'tiles' | 'enemies' | 'spawn' = 'tiles';
  private selectedEnemyType: number = ENEMY_TYPES.BASIC;
  private selectedTileSprite: string = 'tile-dirt1';

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
  private levelValidationService: LevelValidationService;
  private autosaveTimer: number | null = null;
  private customization: CustomizationData;
  private uiManager: LevelBuilderUI;
  private inputManager: LevelBuilderInput;
  

  constructor() {
    super('LevelBuilder');
    this.levelManager = new LevelManager();
    this.levelValidationService = new LevelValidationService(this.levelManager);
  }

  create() {
    try {
      console.log('🎮 === LEVELBUILDER SCENE CREATION START ===');

      console.log('🎮 Step 1: Setting up cameras');
      this.camera = this.cameras.main;
      this.camera.setBackgroundColor(ColorTheme.BACKGROUND_DARK);

      // Create UI camera for elements that should not be affected by zoom/pan
      this.uiCamera = this.cameras.add(0, 0, this.camera.width, this.camera.height);
      this.uiCamera.setZoom(1.0);           // Never zoom
      console.log('🎮 Cameras setup complete');

      console.log('🎮 Step 2: Loading customization data');
      // Ensure customization is loaded if not already set
      if (!this.customization) {
        console.log('🎨 Loading customization data');
        this.customization = StorageUtils.loadCustomization();
      }
      console.log('🎨 Customization loaded:', !!this.customization);

      console.log('🎮 Step 3: Initializing level data');
      this.initializeLevelData();

      console.log('🎮 Step 4: Setting up grid');
      this.setupGrid();

      console.log('🎮 Step 5: Setting up UI');
      this.setupUI();

      console.log('🎮 Step 6: Setting up input manager');
      this.setupInputManager();

      console.log('🎮 Step 7: Configuring camera rendering');
      this.configureCameraRendering();

      console.log('🎮 Step 8: Restoring camera state if available');
      this.restoreCameraState();

      console.log('🎮 Step 9: Setting up autosave');
      this.setupAutosave();

      console.log('🎮 Step 10: Adding test tile');
      // Test tile rendering - add a test tile to verify sprites are working
      this.addTestTile();

      console.log('🎮 === LEVELBUILDER SCENE CREATION COMPLETE ===');
      console.log('🎮 Final state check:', {
        hasLevelData: !!this.levelData,
        currentStage: this.currentStage,
        selectedTileSprite: this.selectedTileSprite,
        hasUI: !!this.uiManager,
        hasInput: !!this.inputManager,
        hasBackgroundLayer: !!this.backgroundLayer,
        hasTileLayer: !!this.tileLayer,
        hasEntityLayer: !!this.entityLayer
      });
    } catch (error) {
      console.error('❌ LevelBuilder: Error during scene creation:', error);
      // Try to show an error message to the user
      this.showMessage('Failed to load level builder. Please try again.', 0xAA4444, 5000);
    }
  }

  private initializeLevelData(): void {
    console.log('📊 === INITIALIZE LEVEL DATA START ===');
    try {
      // Check for backup first (this includes state saved during navigation)
      const backup = StorageUtils.loadFromLocalStorage();
      console.log('📊 Backup data found:', !!backup);
      
      if (backup) {
        console.log('🔄 Found persistent level data, restoring state');
        console.log('📊 Level data preview:', {
          name: backup.metadata?.name,
          tilesCount: backup.tiles?.length,
          enemiesCount: backup.enemies?.length,
          hasSpawn: !!backup.spawn,
          hasTileSprites: !!backup.tileSprites
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

      console.log('📊 Level data after creation/restoration:', {
        hasLevelData: !!this.levelData,
        tilesLength: this.levelData?.tiles?.length,
        tileSpritesLength: this.levelData?.tileSprites?.length,
        firstRowLength: this.levelData?.tiles?.[0]?.length,
        firstSpriteRowLength: this.levelData?.tileSprites?.[0]?.length
      });

      // Ensure tileSprites array exists for backward compatibility
      if (!this.levelData.tileSprites) {
        console.log('🔧 Adding missing tileSprites array for backward compatibility');
        this.levelData.tileSprites = this.levelData.tiles.map(row =>
          row.map(() => null)
        );
        console.log('🔧 TileSprites array created:', {
          length: this.levelData.tileSprites.length,
          firstRowLength: this.levelData.tileSprites[0]?.length
        });
      }

      console.log('📊 Final level data structure:', {
        tiles: this.levelData.tiles?.length,
        tileSprites: this.levelData.tileSprites?.length,
        enemies: this.levelData.enemies?.length,
        spawn: !!this.levelData.spawn,
        metadata: this.levelData.metadata
      });

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
    console.log('📊 === INITIALIZE LEVEL DATA END ===');
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
    console.log('🎨 Creating grid graphics...');
    
    // Create grid graphics on the background layer
    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, 0x555555, 0.5);

    const levelPixelWidth = DEFAULT_LEVEL_SIZE * GRID_SIZE;
    const levelPixelHeight = DEFAULT_LEVEL_SIZE * GRID_SIZE;
    
    console.log('🎨 Level dimensions:', { levelPixelWidth, levelPixelHeight });

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
    
    console.log('🎨 Grid lines drawn, adding to background layer...');
    
    // Add grid to background layer
    this.backgroundLayer.add(gridGraphics);
    
    console.log('🎨 Grid added to background layer');
    console.log('🎨 Setting up interactive hit area...');
    
    // Make the background interactive for tile placement when global handler is disabled
    // CRITICAL: Graphics objects need an explicit hit area to be clickable
    gridGraphics.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, levelPixelWidth, levelPixelHeight),
      Phaser.Geom.Rectangle.Contains
    );
    
    console.log('✅ Grid is now interactive with hit area:', { 
      width: levelPixelWidth, 
      height: levelPixelHeight 
    });
    
    console.log('🎨 Setting up pointer event listeners...');
    
    gridGraphics.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      console.log('🎯 ========================================');
      console.log('🎯 STEP 1: BACKGROUND GRID CLICKED');
      console.log('🎯 ========================================');
      console.log('🎯 Pointer world position:', { worldX: pointer.worldX, worldY: pointer.worldY });
      console.log('🎯 Pointer screen position:', { x: pointer.x, y: pointer.y });
      console.log('🎯 Current stage:', this.currentStage);
      console.log('🎯 UI manager exists:', !!this.uiManager);
      console.log('🎯 Dialog open:', this.uiManager?.isDialogOpen());
      console.log('🎯 Input manager exists:', !!this.inputManager);
      console.log('🎯 Calling inputManager.handleBackgroundClick...');
      if (this.inputManager) {
        this.inputManager.handleBackgroundClick(pointer);
      } else {
        console.error('❌ Input manager is null or undefined');
      }
      console.log('🎯 === BACKGROUND GRID CLICK HANDLED ===');
      console.log('🎯 ========================================');
    });
    
    console.log('✅ Grid event listeners set up');
  }




  private setupUI(): void {
    // Initialize UI manager with callbacks
    const uiCallbacks: LevelBuilderUICallbacks = {
      onBackClick: () => {
        this.saveCurrentState();
        this.scene.start('MainMenu');
      },
      onStageButtonClick: () => {
        this.handleStageButtonClick();
      },
      onNextButtonClick: () => {
        this.handleNextButton();
      },
      onClearButtonClick: () => {
        this.clearLevel();
      }
    };

    this.uiManager = new LevelBuilderUI(this, this.uiCamera, uiCallbacks);
    this.uiManager.createUI();
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

  /**
   * Gets the color for the current stage button
   */
  private getStageColor(): number {
    switch (this.currentStage) {
      case 'tiles':
        return 0x4444AA;
      case 'enemies':
        return 0xAA4444;
      case 'spawn':
        return 0x44AA44;
      default:
        return 0x4444AA;
    }
  }

  /**
   * Gets the label for the current stage button
   */
  private getStageLabel(): string {
    switch (this.currentStage) {
      case 'tiles':
        return 'Tiles';
      case 'enemies':
        return 'Enemies';
      case 'spawn':
        return 'Spawn';
      default:
        return 'Tiles';
    }
  }

  /**
   * Gets the instructions text for the current stage
   */
  private getInstructionsText(): string {
    switch (this.currentStage) {
      case 'tiles':
        return 'WASD: Move Camera\nClick: Place/Remove Tiles\nScroll: Zoom';
      case 'enemies':
        return 'WASD: Move Camera\nClick: Place/Remove Enemies\nScroll: Zoom';
      case 'spawn':
        return 'WASD: Move Camera\nClick: Place/Remove Spawn Point\nScroll: Zoom';
      default:
        return 'WASD: Move Camera\nClick: Place/Remove Tiles\nScroll: Zoom';
    }
  }

  /**
   * Gets the color for the next button
   */
  private getNextButtonColor(): number {
    return this.currentStage === 'spawn' ? ColorTheme.BUTTON_SUCCESS : ColorTheme.BUTTON_PRIMARY;
  }

  /**
   * Gets the label for the next button
   */
  private getNextButtonLabel(): string {
    return this.currentStage === 'spawn' ? 'Post' : 'Next';
  }

  /**
   * Handles the next button click
   */
  private handleNextButton(): void {
    if (this.currentStage === 'spawn') {
      // This is the final stage, so post the level
      void this.saveAndPost();
    } else {
      // Move to next stage
      this.advanceToNextStage();
    }
  }

  /**
   * Advances to the next stage
   */
  private advanceToNextStage(): void {
    switch (this.currentStage) {
      case 'tiles':
        this.currentStage = 'enemies';
        break;
      case 'enemies':
        this.currentStage = 'spawn';
        break;
      case 'spawn':
        // This shouldn't happen as the button becomes "Post" on spawn stage
        break;
    }
    
    this.updateStageDisplay();
    this.showMessage(`Now placing ${this.getStageLabel().toLowerCase()}`, 0x44AA44, 2000);
  }

  /**
   * Handles stage button click to open selection popup
   */
  private handleStageButtonClick(): void {
    console.log('🎯 handleStageButtonClick called with currentStage:', this.currentStage);
    if (this.currentStage === 'tiles') {
      console.log('🎯 Calling showTileSelectionPopup');
      this.showTileSelectionPopup();
    } else if (this.currentStage === 'enemies') {
      console.log('🎯 Calling showEnemySelectionPopup');
      this.showEnemySelectionPopup();
    }
    // Spawn stage doesn't need selection popup
  }

  /**
   * Shows tile selection popup
   */
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

    console.log('🎯 Prepared tile options:', tileOptions.length);

    // Navigate to GridSelectionScene
    try {
      console.log('🎯 Starting GridSelectionScene...');
      this.scene.start('GridSelectionScene', {
        options: tileOptions,
        title: 'Select Tile Type',
        returnScene: 'LevelBuilder',
        returnData: { customization: this.customization },
        cameraState: this.cameraState
      });
      console.log('✅ GridSelectionScene started successfully');
    } catch (error) {
      console.error('❌ Failed to start GridSelectionScene:', error);
    }

    console.log('🎯 Navigated to GridSelectionScene for tile selection');
  }

  /**
   * Shows enemy selection popup
   */
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

  /**
   * Handles selection from GridSelectionScene
   */
  private handleGridSelection(selectedOption: OptionElementData): void {
    console.log('✅ Handling grid selection:', selectedOption);

    const data = selectedOption.data as Record<string, unknown>;

    // Check if this is an enemy selection (has scale property)
    if (data.type !== undefined && data.scale !== undefined) {
      // This is an enemy selection
      this.selectedEnemyType = data.type as number;
      console.log('👾 Enemy selection updated:', { type: this.selectedEnemyType });
    } else if (data.sprite && data.type !== undefined) {
      // This is a tile selection (has sprite and type, but no scale)
      this.selectedTileSprite = data.sprite as string;
      console.log('🎨 Tile selection updated:', { sprite: this.selectedTileSprite });
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
   * Updates the stage display (header button, instructions, footer button)
   */
  private updateStageDisplay(): void {
    const stageInfo: StageInfo = {
      currentStage: this.currentStage,
      stageColor: this.getStageColor(),
      stageLabel: this.getStageLabel(),
      instructionsText: this.getInstructionsText(),
      nextButtonColor: this.getNextButtonColor(),
      nextButtonLabel: this.getNextButtonLabel()
    };

    this.uiManager.updateStageDisplay(stageInfo);
  }

  private handlePlacement(worldX: number, worldY: number): void {
    console.log('🎯 ========================================');
    console.log('🎯 STEP 3: HANDLE PLACEMENT');
    console.log('🎯 ========================================');
    console.log('🎯 Current stage:', this.currentStage);
    console.log('🎯 World position:', { worldX, worldY });
    console.log('🎯 Level data exists:', !!this.levelData);
    console.log('🎯 Selected tile sprite:', this.selectedTileSprite);
    console.log('🎯 UI manager exists:', !!this.uiManager);
    console.log('🎯 Dialog open:', this.uiManager?.isDialogOpen());
    
    console.log('🎯 Determining stage action...');
    switch (this.currentStage) {
      case 'tiles':
        console.log('🎯 Stage is TILES - calling placeTile...');
        this.placeTile(worldX, worldY);
        console.log('🎯 placeTile call completed');
        break;
      case 'enemies':
        console.log('🎯 Stage is ENEMIES - calling placeEnemy...');
        this.placeEnemy(worldX, worldY);
        break;
      case 'spawn':
        console.log('🎯 Stage is SPAWN - calling placeSpawn...');
        this.placeSpawn(worldX, worldY);
        break;
    }
    console.log('🎯 === HANDLE PLACEMENT END ===');
    console.log('🎯 ========================================');
  }

  private placeTile(worldX: number, worldY: number): void {
    console.log('🎯 ========================================');
    console.log('🎯 STEP 4: PLACE TILE');
    console.log('🎯 ========================================');
    console.log('🎯 Level data exists:', !!this.levelData);
    
    if (!this.levelData) {
      console.error('❌ No level data available for tile placement');
      console.log('🎯 ========================================');
      return;
    }

    const gridPos = GridUtils.worldToGrid(worldX, worldY);
    
    console.log(`🎯 World position: (${worldX}, ${worldY})`);
    console.log(`🎯 Grid position: (${gridPos.x}, ${gridPos.y})`);
    console.log(`🎨 Selected tile sprite: ${this.selectedTileSprite}`);
    console.log(`🎯 Current stage: ${this.currentStage}`);
    console.log(`🎯 Level size: ${DEFAULT_LEVEL_SIZE}x${DEFAULT_LEVEL_SIZE}`);

    const isValidPosition = GridUtils.isValidGridPosition(gridPos.x, gridPos.y, DEFAULT_LEVEL_SIZE, DEFAULT_LEVEL_SIZE);
    console.log(`🎯 Grid position valid: ${isValidPosition}`);

    if (isValidPosition) {
      console.log('🎯 Grid position is VALID - continuing...');
      const row = this.levelData.tiles[gridPos.y];
      const spriteRow = this.levelData.tileSprites[gridPos.y];
      
      console.log(`🎯 Row exists: ${!!row}`);
      console.log(`🎯 SpriteRow exists: ${!!spriteRow}`);
      console.log(`🎯 Row length: ${row?.length}`);
      console.log(`🎯 SpriteRow length: ${spriteRow?.length}`);
      
      if (row && spriteRow) {
        const currentTileType = row[gridPos.x];
        const currentSprite = spriteRow[gridPos.x];
        
        console.log(`🎯 Current tile type: ${currentTileType}`);
        console.log(`🎯 Current sprite: ${currentSprite}`);
        console.log(`🎯 TILE_TYPES.EMPTY: ${TILE_TYPES.EMPTY}`);
        
        // Check if there's already a tile at this position
        if (currentTileType !== undefined && currentTileType !== TILE_TYPES.EMPTY) {
          console.log(`🎯 Tile already exists at (${gridPos.x}, ${gridPos.y})`);
          
          // Check if there are any entities (enemies or spawn) at this position
          const hasEnemy = this.levelData.enemies.some(enemy => enemy.x === gridPos.x && enemy.y === gridPos.y);
          const hasSpawn = this.levelData.spawn && this.levelData.spawn.x === gridPos.x && this.levelData.spawn.y === gridPos.y;
          
          console.log(`🎯 Has enemy at position: ${hasEnemy}`);
          console.log(`🎯 Has spawn at position: ${hasSpawn}`);
          
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
            console.log(`🗑️ Tile data after removal:`, {
              tileType: row[gridPos.x],
              tileSprite: spriteRow[gridPos.x]
            });
            this.renderTileAt(gridPos.x, gridPos.y);
            this.updateLevelManager();
            return;
          }
        } else {
          // Place new tile (toggle on)
          console.log(`✅ Placing new tile at (${gridPos.x}, ${gridPos.y})`);
          row[gridPos.x] = 1; // Generic "tile exists" marker
          spriteRow[gridPos.x] = this.selectedTileSprite; // Store the selected sprite
          
          console.log(`✅ Tile data after placement:`, {
            tileType: row[gridPos.x],
            tileSprite: spriteRow[gridPos.x],
            gridPos: { x: gridPos.x, y: gridPos.y }
          });
          
          console.log(`🎨 Calling renderTileAt for (${gridPos.x}, ${gridPos.y})`);
          this.renderTileAt(gridPos.x, gridPos.y);
          console.log(`💾 Calling updateLevelManager`);
          this.updateLevelManager();
        }
      } else {
        console.error(`❌ Invalid row or spriteRow at grid position (${gridPos.x}, ${gridPos.y})`);
        console.error(`❌ Row:`, row);
        console.error(`❌ SpriteRow:`, spriteRow);
      }
    } else {
      console.warn(`⚠️ Invalid grid position (${gridPos.x}, ${gridPos.y})`);
      console.warn(`⚠️ Valid range: 0-${DEFAULT_LEVEL_SIZE-1}`);
      console.log('🎯 ========================================');
      console.log('❌ STEP 4 FAILED: Invalid grid position');
      console.log('🎯 ========================================');
    }
    console.log('🎯 === PLACE TILE END ===');
    console.log('🎯 ========================================');
  }

  private renderTileAt(gridX: number, gridY: number): void {
    console.log('🎨 ========================================');
    console.log('🎨 STEP 5: RENDER TILE AT');
    console.log('🎨 ========================================');
    console.log('🎨 Grid position:', { gridX, gridY });
    console.log('🎨 Level data exists:', !!this.levelData);
    
    if (!this.levelData) {
      console.error('❌ No level data available for tile rendering');
      console.log('🎨 ========================================');
      console.log('❌ STEP 5 FAILED: No level data');
      console.log('🎨 ========================================');
      return;
    }

    const worldPos = GridUtils.gridToWorld(gridX, gridY);
    console.log('🎨 World position:', worldPos);
    
    const row = this.levelData.tiles[gridY];
    const spriteRow = this.levelData.tileSprites[gridY];
    
    console.log('🎨 Row exists:', !!row);
    console.log('🎨 SpriteRow exists:', !!spriteRow);
    
    if (!row || !spriteRow) {
      console.error('❌ Row or spriteRow missing at grid position:', { gridX, gridY });
      console.log('🎨 ========================================');
      console.log('❌ STEP 5 FAILED: Missing row or spriteRow');
      console.log('🎨 ========================================');
      return;
    }

    const tileType = row[gridX];
    const tileSprite = spriteRow[gridX];
    const tileKey = `tile_${gridX}_${gridY}`;

    console.log('🎨 Tile type:', tileType);
    console.log('🎨 Tile sprite:', tileSprite);
    console.log('🎨 Tile key:', tileKey);
    console.log('🎨 TILE_TYPES.EMPTY:', TILE_TYPES.EMPTY);

    // Remove existing tile at this position from the tile layer
    const existingTile = this.tileLayer.getByName(tileKey);
    console.log('🎨 Existing tile found:', !!existingTile);
    
    if (existingTile) {
      console.log('🗑️ Destroying existing tile:', tileKey);
      existingTile.destroy();
      console.log('✅ Existing tile destroyed');
    }

    // Add new tile if not empty
    if (tileType !== undefined && tileType !== TILE_TYPES.EMPTY) {
      console.log('🎨 Creating new tile sprite...');
      const tileSpriteObj = this.createTileSprite(tileType, worldPos.x, worldPos.y, gridX, gridY, tileSprite);
      
      if (tileSpriteObj) {
        console.log('✅ STEP 5 SUCCESS: Tile sprite created successfully:', {
          name: tileSpriteObj.name,
          position: { x: tileSpriteObj.x, y: tileSpriteObj.y },
          visible: tileSpriteObj.visible,
          alpha: tileSpriteObj.alpha,
          scale: { x: tileSpriteObj.scaleX, y: tileSpriteObj.scaleY }
        });
        tileSpriteObj.setName(tileKey);
        console.log('🎨 ========================================');
        console.log('✅ STEP 5 COMPLETE');
        console.log('🎨 ========================================');
      } else {
        console.error('❌ Failed to create tile sprite');
        console.log('🎨 ========================================');
        console.log('❌ STEP 5 FAILED: createTileSprite returned null');
        console.log('🎨 ========================================');
      }
    } else {
      console.log('🎨 No tile to render (empty position)');
      console.log('🎨 ========================================');
      console.log('⚠️ STEP 5: Empty position, nothing to render');
      console.log('🎨 ========================================');
    }
    console.log('🎨 === RENDER TILE AT END ===');
  }

  private createTileSprite(_tileType: number, x: number, y: number, gridX: number, gridY: number, storedSprite?: string | null): Phaser.GameObjects.Image | null {
    console.log('🎨 ========================================');
    console.log('🎨 STEP 6: CREATE TILE SPRITE');
    console.log('🎨 ========================================');
    console.log('🎨 Parameters:', { _tileType, x, y, gridX, gridY, storedSprite });
    
    // Use stored sprite if available, otherwise use the selected tile sprite
    const spriteKey = storedSprite || this.selectedTileSprite;
    console.log('🎨 Sprite key:', spriteKey);
    console.log('🎨 Selected tile sprite:', this.selectedTileSprite);

    if (!spriteKey) {
      console.error('❌ No sprite key available for tile');
      console.log('🎨 ========================================');
      console.log('❌ STEP 6 FAILED: No sprite key');
      console.log('🎨 ========================================');
      return null;
    }

    console.log('🎨 Checking if sprite exists in texture manager...');
    const textureExists = this.textures.exists(spriteKey);
    console.log('🎨 Texture exists:', textureExists);
    
    if (!textureExists) {
      console.error('❌ Sprite texture does not exist:', spriteKey);
      console.log('🎨 Available textures:', Object.keys(this.textures.list));
      console.log('🎨 ========================================');
      console.log('❌ STEP 6 FAILED: Texture does not exist');
      console.log('🎨 ========================================');
      return null;
    }
    
    console.log('✅ Texture exists for:', spriteKey);

    const finalX = x + GRID_SIZE / 2;
    const finalY = y + GRID_SIZE / 2;
    console.log('🎨 Final sprite position:', { finalX, finalY });
    console.log('🎨 GRID_SIZE:', GRID_SIZE);

    // Create tile sprite directly in the tile layer
    console.log('🎨 Creating sprite with scene.add.image...');
    const tileSprite = this.tileLayer.scene.add.image(finalX, finalY, spriteKey);
    
    console.log('🎨 Sprite created, setting display size...');
    tileSprite.setDisplaySize(GRID_SIZE, GRID_SIZE);
    console.log('✅ Display size set to', GRID_SIZE, 'x', GRID_SIZE);
    
    console.log('🎨 Making tile interactive...');
    // Make tile interactive and clickable
    tileSprite.setInteractive();
    console.log('✅ Tile is now interactive');
    
    console.log('🎨 Setting tile data...');
    // Store grid position in userData for easy access
    tileSprite.setData('gridX', gridX);
    tileSprite.setData('gridY', gridY);
    tileSprite.setData('tileType', _tileType);
    tileSprite.setData('spriteKey', spriteKey);
    console.log('✅ Tile data set');
    
    console.log('🎨 Adding click handler...');
    // Add click handler for tile interaction
    tileSprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.inputManager) {
        this.inputManager.handleTileClick(pointer, gridX, gridY, tileSprite);
      }
    });
    console.log('✅ Click handler added');
    
    console.log('🎨 Adding hover effects...');
    // Add hover effects
    tileSprite.on('pointerover', () => {
      if (!this.uiManager.isDialogOpen()) {
        tileSprite.setAlpha(0.8);
      }
    });
    
    tileSprite.on('pointerout', () => {
      tileSprite.setAlpha(1.0);
    });
    console.log('✅ Hover effects added');
    
    console.log('🎨 Adding tile to tile layer...');
    console.log('🎨 Tile layer depth:', this.tileLayer.depth);
    console.log('🎨 Tile layer children count before add:', this.tileLayer.length);
    
    // Add tile to the tile layer
    this.tileLayer.add(tileSprite);
    
    console.log('✅ Tile added to layer');
    console.log('🎨 Tile layer children count after add:', this.tileLayer.length);
    console.log('🎨 Final sprite properties:', {
      name: tileSprite.name,
      position: { x: tileSprite.x, y: tileSprite.y },
      visible: tileSprite.visible,
      alpha: tileSprite.alpha,
      scale: { x: tileSprite.scaleX, y: tileSprite.scaleY },
      depth: tileSprite.depth,
      texture: tileSprite.texture.key
    });

    console.log('🎨 ========================================');
    console.log('✅ STEP 6 COMPLETE: Tile sprite created and added to layer');
    console.log('🎨 ========================================');
    return tileSprite;
  }

  /**
   * Handles tile click events with proper priority checking
   */
  private handleTileClick(pointer: Phaser.Input.Pointer, gridX: number, gridY: number, _tileSprite: Phaser.GameObjects.Image): void {
    console.log('🎯 Tile clicked:', { gridX, gridY, currentStage: this.currentStage });
    
    // Don't handle clicks if dialog is open
    if (this.uiManager.isDialogOpen()) {
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

    // Only handle tile-specific placement in tiles stage
    // For other stages, let the global handler deal with it
    if (this.currentStage === 'tiles') {
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

  private placeEnemy(worldX: number, worldY: number): void {
    if (!this.levelData) return;

    const gridPos = GridUtils.worldToGrid(worldX, worldY);
    console.log('🎯 Placing enemy at world position:', { worldX, worldY, gridPos });

    if (GridUtils.isValidGridPosition(gridPos.x, gridPos.y, DEFAULT_LEVEL_SIZE, DEFAULT_LEVEL_SIZE)) {
      // Validate enemy placement using the helper
      const placementValidation = this.levelValidationService.validateEnemyPlacement(this.levelData, gridPos.x, gridPos.y);
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
      const placementValidation = this.levelValidationService.validateSpawnPlacement(this.levelData, gridPos.x, gridPos.y);
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
      if (this.inputManager) {
        this.inputManager.handleEntityClick(pointer, gridX, gridY, 'enemy', enemy);
      }
    });
    
    // Add hover effects
    enemy.on('pointerover', () => {
      if (!this.uiManager.isDialogOpen()) {
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
      if (this.inputManager) {
        this.inputManager.handleEntityClick(pointer, gridX, gridY, 'spawn', spawn);
      }
    });
    
    // Add hover effects
    spawn.on('pointerover', () => {
      if (!this.uiManager.isDialogOpen()) {
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

  /**
   * Handles entity click events (enemies and spawn points) with highest priority
   */
  private handleEntityClick(pointer: Phaser.Input.Pointer, gridX: number, gridY: number, entityType: 'enemy' | 'spawn', _entitySprite: Phaser.GameObjects.Image): void {
    console.log('🎯 Entity clicked:', { gridX, gridY, entityType, currentStage: this.currentStage });
    
    // Don't handle clicks if dialog is open
    if (this.uiManager.isDialogOpen()) {
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

    // Only handle entity removal in the appropriate stage
    if (entityType === 'enemy' && this.currentStage === 'enemies') {
      // Remove enemy and leave tile intact
      this.removeEnemyAt(gridX, gridY);
    } else if (entityType === 'spawn' && this.currentStage === 'spawn') {
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

  private validateLevel(): { isValid: boolean; message: string } {
    return this.levelValidationService.validateLevel(this.levelData);
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
    this.uiManager.showRetryableError(title, details, retryCallback);
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
    const metadataValidation = this.levelValidationService.validateMetadata(this.levelData);
    if (!metadataValidation.isValid) {
      this.showMessage(metadataValidation.message, 0xAA4444);
      return false;
    }

    return true;
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

  private showConfirmationDialog(title: string, message: string, onConfirm: () => void): void {
    this.uiManager.showConfirmationDialog(title, message, onConfirm);
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
    this.uiManager.showMessage(text, color, duration);
  }

  private showProgressMessage(text: string, progress: number = 0): Phaser.GameObjects.Container {
    return this.uiManager.showProgressMessage(text, progress);
  }

  private updateProgressMessage(container: Phaser.GameObjects.Container, text: string, progress: number): void {
    this.uiManager.updateProgressMessage(container, text, progress);
  }

  init(data?: { customization?: CustomizationData; selectedOption?: OptionElementData; cameraState?: { zoom: number; scrollX: number; scrollY: number } }): void {
    // Store customization data for preview purposes
    // Load from storage if not provided to ensure latest customization is used
    this.customization = data?.customization || StorageUtils.loadCustomization();

    // Restore camera state if provided
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

    // Disable input manager
    if (this.inputManager) {
      this.inputManager.disableInput();
      this.inputManager.destroy();
    }

    // Destroy UI manager
    if (this.uiManager) {
      this.uiManager.destroy();
    }
  }

  destroy(): void {
    // Save current state before destroying
    this.saveCurrentState();

    if (this.autosaveTimer) {
      StorageUtils.clearAutosaveTimer(this.autosaveTimer);
      this.autosaveTimer = null;
    }

    // Disable and destroy input manager
    if (this.inputManager) {
      this.inputManager.disableInput();
      this.inputManager.destroy();
    }

    // Destroy UI manager
    if (this.uiManager) {
      this.uiManager.destroy();
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