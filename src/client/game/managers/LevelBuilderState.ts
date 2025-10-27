import { LevelData, ENEMY_TYPES } from '../../../shared/types/level';
import { LevelManager } from './LevelManager';
import { StorageUtils } from '../utils/StorageUtils';
import { LevelValidationService, StateValidationService } from '../services';

export type BuilderStage = 'tiles' | 'enemies' | 'spawn';

export interface CameraState {
  zoom: number;
  scrollX: number;
  scrollY: number;
}

export interface LevelBuilderStateData {
  levelData: LevelData;
  currentStage: BuilderStage;
  selectedEnemyType: number;
  selectedTileSprite: string;
  cameraState: CameraState | null;
  isDialogOpen: boolean;
}

export class LevelBuilderState {
  private levelData: LevelData;
  private currentStage: BuilderStage = 'tiles';
  private selectedEnemyType: number = ENEMY_TYPES.BASIC;
  private selectedTileSprite: string = 'tile-dirt1';
  private cameraState: CameraState | null = null;
  private isDialogOpen: boolean = false;
  
  private levelManager: LevelManager;
  private levelValidationService: LevelValidationService;
  private stateValidationService: StateValidationService;
  private autosaveTimer: number | null = null;

  constructor() {
    this.levelManager = new LevelManager();
    this.levelValidationService = new LevelValidationService(this.levelManager);
    this.stateValidationService = new StateValidationService();
  }

  /**
   * Initialize the state with level data
   */
  initializeLevelData(): void {
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
    }
  }

  /**
   * Set up autosave functionality
   */
  setupAutosave(): void {
    this.autosaveTimer = StorageUtils.createAutosaveTimer(() => {
      this.updateLevelManager();
      return this.levelManager.getCurrentLevel();
    });
  }

  /**
   * Clean up autosave timer
   */
  cleanupAutosave(): void {
    if (this.autosaveTimer) {
      StorageUtils.clearAutosaveTimer(this.autosaveTimer);
      this.autosaveTimer = null;
    }
  }

  /**
   * Update the level manager with current data
   */
  updateLevelManager(): void {
    if (this.levelData) {
      this.levelManager.updateLevel(this.levelData);
    }
  }

  /**
   * Save current state to local storage
   */
  saveCurrentState(): void {
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
   * Save camera state
   */
  saveCameraState(camera: { zoom: number; scrollX: number; scrollY: number }): void {
    this.cameraState = {
      zoom: camera.zoom,
      scrollX: camera.scrollX,
      scrollY: camera.scrollY
    };
    console.log('📷 Camera state saved:', this.cameraState);
  }

  /**
   * Restore camera state
   */
  restoreCameraState(camera: { setZoom: (zoom: number) => void; setScroll: (x: number, y: number) => void }): void {
    if (this.cameraState) {
      console.log('📷 Restoring camera state:', this.cameraState);
      
      // Apply the saved camera state
      camera.setZoom(this.cameraState.zoom);
      camera.setScroll(this.cameraState.scrollX, this.cameraState.scrollY);
      
      console.log('✅ Camera state restored successfully');
    } else {
      console.log('📷 No saved camera state found, using default camera settings');
    }
  }

  /**
   * Set current stage
   */
  setCurrentStage(stage: BuilderStage): void {
    this.currentStage = stage;
  }

  /**
   * Get current stage
   */
  getCurrentStage(): BuilderStage {
    return this.currentStage;
  }

  /**
   * Advance to next stage
   */
  advanceToNextStage(): void {
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
  }

  /**
   * Set selected enemy type
   */
  setSelectedEnemyType(type: number): void {
    this.selectedEnemyType = type;
  }

  /**
   * Get selected enemy type
   */
  getSelectedEnemyType(): number {
    return this.selectedEnemyType;
  }

  /**
   * Set selected tile sprite
   */
  setSelectedTileSprite(sprite: string): void {
    this.selectedTileSprite = sprite;
  }

  /**
   * Get selected tile sprite
   */
  getSelectedTileSprite(): string {
    return this.selectedTileSprite;
  }

  /**
   * Set dialog open state
   */
  setDialogOpen(isOpen: boolean): void {
    this.isDialogOpen = isOpen;
  }

  /**
   * Get dialog open state
   */
  isDialogOpen(): boolean {
    return this.isDialogOpen;
  }

  /**
   * Get level data
   */
  getLevelData(): LevelData {
    return this.levelData;
  }

  /**
   * Update level data
   */
  updateLevelData(levelData: LevelData): void {
    this.levelData = levelData;
  }

  /**
   * Clear the level and create a new one
   */
  clearLevel(): void {
    this.levelData = this.levelManager.createNewLevel('New Level', 'Player');
    this.updateLevelManager();
    StorageUtils.clearLocalStorage();
  }

  /**
   * Validate level
   */
  validateLevel(): { isValid: boolean; message: string } {
    return this.validationHelper.validateLevel(this.levelData);
  }

  /**
   * Validate metadata
   */
  validateMetadata(): { isValid: boolean; message: string } {
    return this.validationHelper.validateMetadata(this.levelData);
  }

  /**
   * Get level manager instance
   */
  getLevelManager(): LevelManager {
    return this.levelManager;
  }

  /**
   * Get level validation service instance
   */
  getLevelValidationService(): LevelValidationService {
    return this.levelValidationService;
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
  getStateData(): LevelBuilderStateData {
    return {
      levelData: this.levelData,
      currentStage: this.currentStage,
      selectedEnemyType: this.selectedEnemyType,
      selectedTileSprite: this.selectedTileSprite,
      cameraState: this.cameraState,
      isDialogOpen: this.isDialogOpen
    };
  }

  /**
   * Restore state from data
   */
  restoreStateData(data: Partial<LevelBuilderStateData>): void {
    if (data.levelData) {
      this.levelData = data.levelData;
    }
    if (data.currentStage) {
      this.currentStage = data.currentStage;
    }
    if (data.selectedEnemyType !== undefined) {
      this.selectedEnemyType = data.selectedEnemyType;
    }
    if (data.selectedTileSprite) {
      this.selectedTileSprite = data.selectedTileSprite;
    }
    if (data.cameraState) {
      this.cameraState = data.cameraState;
    }
    if (data.isDialogOpen !== undefined) {
      this.isDialogOpen = data.isDialogOpen;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.saveCurrentState();
    this.cleanupAutosave();
  }
}
