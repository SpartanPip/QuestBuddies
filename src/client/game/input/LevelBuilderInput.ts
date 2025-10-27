import * as Phaser from 'phaser';
import { LevelBuilder } from '../scenes/LevelBuilder';
import { DEFAULT_LEVEL_SIZE, GRID_SIZE } from '../../../shared/types/level';

export interface LevelBuilderInputCallbacks {
  onTilePlacement: (worldX: number, worldY: number) => void;
  onEnemyPlacement: (worldX: number, worldY: number) => void;
  onSpawnPlacement: (worldX: number, worldY: number) => void;
  onTileClick: (pointer: Phaser.Input.Pointer, gridX: number, gridY: number, tileSprite: Phaser.GameObjects.Image) => void;
  onEntityClick: (pointer: Phaser.Input.Pointer, gridX: number, gridY: number, entityType: 'enemy' | 'spawn', entitySprite: Phaser.GameObjects.Image) => void;
  onBackgroundClick: (pointer: Phaser.Input.Pointer) => void;
  isDialogOpen: () => boolean;
  getCurrentStage: () => string;
  isPointerInUIArea: (pointer: Phaser.Input.Pointer) => boolean;
}

export class LevelBuilderInput {
  private scene: LevelBuilder;
  private callbacks: LevelBuilderInputCallbacks;
  private camera: Phaser.Cameras.Scene2D.Camera;
  
  // Camera control state
  private cameraSpeed: number = 8;
  private levelPixelWidth: number;
  private levelPixelHeight: number;
  
  // Input state
  private isInputEnabled: boolean = true;
  private wheelEventHandler: ((pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[], deltaX: number, deltaY: number) => void) | null = null;

  constructor(scene: LevelBuilder, callbacks: LevelBuilderInputCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.camera = scene.cameras.main;
    
    // Calculate level dimensions
    this.levelPixelWidth = DEFAULT_LEVEL_SIZE * GRID_SIZE;
    this.levelPixelHeight = DEFAULT_LEVEL_SIZE * GRID_SIZE;
    
    this.setupCameraControls();
    this.setupGridInteraction();
  }

  /**
   * Sets up camera controls for navigating the level builder
   */
  private setupCameraControls(): void {
    // Set camera bounds to prevent scrolling beyond level
    this.camera.setBounds(0, 0, this.levelPixelWidth, this.levelPixelHeight);

    console.log('📷 Camera setup:', {
      bounds: { x: 0, y: 0, width: this.levelPixelWidth, height: this.levelPixelHeight },
      cameraSize: { width: this.camera.width, height: this.camera.height },
      initialPosition: { x: this.camera.scrollX, y: this.camera.scrollY },
      initialZoom: this.camera.zoom
    });

    if (this.scene.input.keyboard) {
      // Smooth camera movement with bounds checking
      this.scene.input.keyboard.on('keydown', (event: KeyboardEvent) => {
        if (!this.isInputEnabled) return;
        
        switch (event.code) {
          case 'KeyW':
          case 'ArrowUp':
            this.camera.scrollY = Math.max(0, this.camera.scrollY - this.cameraSpeed);
            break;
          case 'KeyS':
          case 'ArrowDown':
            this.camera.scrollY = Math.min(this.levelPixelHeight - this.camera.height, this.camera.scrollY + this.cameraSpeed);
            break;
          case 'KeyA':
          case 'ArrowLeft':
            this.camera.scrollX = Math.max(0, this.camera.scrollX - this.cameraSpeed);
            break;
          case 'KeyD':
          case 'ArrowRight':
            this.camera.scrollX = Math.min(this.levelPixelWidth - this.camera.width, this.camera.scrollX + this.cameraSpeed);
            break;
        }
      });
    }

    // Mouse wheel zoom - only affects world camera, UI camera stays fixed
    this.setupWheelZoom();
  }

  /**
   * Sets up mouse wheel zoom functionality
   */
  private setupWheelZoom(): void {
    this.wheelEventHandler = (_pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
      if (!this.isInputEnabled) return;
      
      const zoomFactor = deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Phaser.Math.Clamp(this.camera.zoom * zoomFactor, 0.5, 2);
      this.camera.setZoom(newZoom);
      // UI camera remains unaffected at zoom 1.0
    };
    
    this.scene.input.on('wheel', this.wheelEventHandler);
  }

  /**
   * Sets up grid interaction for tile placement
   */
  private setupGridInteraction(): void {
    // Grid interaction is handled by individual tile sprites and background graphics
    // This method can be used for any global grid-related input setup
  }

  /**
   * Handles placement based on current stage
   */
  handlePlacement(worldX: number, worldY: number): void {
    console.log('🎯 INPUT MANAGER: handlePlacement called');
    console.log('🎯 isInputEnabled:', this.isInputEnabled);
    console.log('🎯 isDialogOpen:', this.callbacks.isDialogOpen());
    
    if (!this.isInputEnabled || this.callbacks.isDialogOpen()) {
      console.log('❌ Blocked: Input disabled or dialog open');
      return;
    }
    
    const currentStage = this.callbacks.getCurrentStage();
    console.log('🎯 PLACING:', currentStage, 'at world position:', { worldX, worldY });
    console.log('🎯 Calling stage-specific callback...');
    
    switch (currentStage) {
      case 'tiles':
        console.log('🎯 Stage is TILES - calling onTilePlacement callback');
        this.callbacks.onTilePlacement(worldX, worldY);
        console.log('✅ onTilePlacement callback completed');
        break;
      case 'enemies':
        console.log('🎯 Stage is ENEMIES - calling onEnemyPlacement callback');
        this.callbacks.onEnemyPlacement(worldX, worldY);
        break;
      case 'spawn':
        console.log('🎯 Stage is SPAWN - calling onSpawnPlacement callback');
        this.callbacks.onSpawnPlacement(worldX, worldY);
        break;
    }
    console.log('✅ handlePlacement completed');
  }

  /**
   * Handles tile click events with proper priority checking
   */
  handleTileClick(pointer: Phaser.Input.Pointer, gridX: number, gridY: number, _tileSprite: Phaser.GameObjects.Image): void {
    console.log('🎯 Tile clicked:', { gridX, gridY, currentStage: this.callbacks.getCurrentStage() });
    
    // Don't handle clicks if dialog is open
    if (this.callbacks.isDialogOpen()) {
      console.log('❌ Blocked: Dialog is open');
      return;
    }

    // Check if we're clicking on UI elements first
    const hitObjects = this.scene.input.hitTestPointer(pointer);
    const isClickingUIButton = hitObjects.some(obj => {
      if (obj.name && obj.name.includes('button')) return true;
      if (obj.parentContainer) {
        const containerName = obj.parentContainer.name;
        return containerName === 'header' || containerName === 'footer';
      }
      return false;
    });

    if (isClickingUIButton || this.callbacks.isPointerInUIArea(pointer)) {
      console.log('❌ Blocked: Clicking on UI element');
      return;
    }

    // Handle placement for all stages - handlePlacement will route to the correct method
    console.log('🎯 Calling handlePlacement with world position:', { worldX: pointer.worldX, worldY: pointer.worldY });
    this.handlePlacement(pointer.worldX, pointer.worldY);
    console.log('🎯 handlePlacement call completed');
  }

  /**
   * Handles entity click events (enemies and spawn points) with highest priority
   */
  handleEntityClick(pointer: Phaser.Input.Pointer, gridX: number, gridY: number, entityType: 'enemy' | 'spawn', entitySprite: Phaser.GameObjects.Image): void {
    console.log('🎯 Entity clicked:', { gridX, gridY, entityType, currentStage: this.callbacks.getCurrentStage() });
    
    // Don't handle clicks if dialog is open
    if (this.callbacks.isDialogOpen()) {
      console.log('❌ Blocked: Dialog is open');
      return;
    }

    // Check if we're clicking on UI elements first
    const hitObjects = this.scene.input.hitTestPointer(pointer);
    const isClickingUIButton = hitObjects.some(obj => {
      if (obj.name && obj.name.includes('button')) return true;
      if (obj.parentContainer) {
        const containerName = obj.parentContainer.name;
        return containerName === 'header' || containerName === 'footer';
      }
      return false;
    });

    if (isClickingUIButton || this.callbacks.isPointerInUIArea(pointer)) {
      console.log('❌ Blocked: Clicking on UI element');
      return;
    }

    // Only handle entity removal in the appropriate stage
    if (entityType === 'enemy' && this.callbacks.getCurrentStage() === 'enemies') {
      this.callbacks.onEntityClick(pointer, gridX, gridY, entityType, entitySprite);
    } else if (entityType === 'spawn' && this.callbacks.getCurrentStage() === 'spawn') {
      this.callbacks.onEntityClick(pointer, gridX, gridY, entityType, entitySprite);
    }
  }

  /**
   * Handles background click for placement
   */
  handleBackgroundClick(pointer: Phaser.Input.Pointer): void {
    console.log('🎯 ========================================');
    console.log('🎯 INPUT MANAGER: Background clicked for placement');
    console.log('🎯 ========================================');
    console.log('🎯 Pointer world position:', { worldX: pointer.worldX, worldY: pointer.worldY });
    console.log('🎯 Pointer screen position:', { x: pointer.x, y: pointer.y });
    console.log('🎯 isInputEnabled:', this.isInputEnabled);
    console.log('🎯 isDialogOpen:', this.callbacks.isDialogOpen());
    console.log('🎯 Current stage:', this.callbacks.getCurrentStage());
    console.log('🎯 Calling handlePlacement...');
    this.handlePlacement(pointer.worldX, pointer.worldY);
    console.log('✅ handlePlacement called');
    console.log('🎯 ========================================');
  }

  /**
   * Enables input handling
   */
  enableInput(): void {
    console.log('✅ ENABLING LevelBuilder input events');
    this.isInputEnabled = true;
    this.enableCameraZoom();
  }

  /**
   * Disables input handling
   */
  disableInput(): void {
    console.log('🚫 DISABLING LevelBuilder input events');
    this.isInputEnabled = false;
    this.disableCameraZoom();
  }

  /**
   * Enables camera zoom functionality
   */
  private enableCameraZoom(): void {
    if (this.wheelEventHandler) {
      this.scene.input.on('wheel', this.wheelEventHandler);
    }
  }

  /**
   * Disables camera zoom functionality
   */
  private disableCameraZoom(): void {
    // Remove camera zoom wheel event
    this.scene.input.off('wheel');
  }

  /**
   * Updates camera bounds (useful when level size changes)
   */
  updateCameraBounds(width: number, height: number): void {
    this.levelPixelWidth = width;
    this.levelPixelHeight = height;
    this.camera.setBounds(0, 0, width, height);
  }

  /**
   * Gets current camera state
   */
  getCameraState(): { zoom: number; scrollX: number; scrollY: number } {
    return {
      zoom: this.camera.zoom,
      scrollX: this.camera.scrollX,
      scrollY: this.camera.scrollY
    };
  }

  /**
   * Sets camera state
   */
  setCameraState(state: { zoom: number; scrollX: number; scrollY: number }): void {
    this.camera.setZoom(state.zoom);
    this.camera.setScroll(state.scrollX, state.scrollY);
  }

  /**
   * Cleanup method to remove event listeners
   */
  destroy(): void {
    this.disableCameraZoom();
    if (this.scene.input.keyboard) {
      this.scene.input.keyboard.removeAllListeners();
    }
  }
}
