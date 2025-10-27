import { LevelData } from '../../../shared/types/level';
import { LevelBuilderState } from '../managers/LevelBuilderState';
import { GameplayState } from '../managers/GameplayState';
import { CustomizationData } from '../utils/StorageUtils';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  message: string;
}

/**
 * Centralized service for scene state validation
 * Handles validation of scene states, transitions, and state consistency
 */
export class StateValidationService {
  /**
   * Validates LevelBuilder state
   * @param state - The LevelBuilder state to validate
   * @returns ValidationResult
   */
  validateLevelBuilderState(state: LevelBuilderState): ValidationResult {
    if (!state) {
      return { isValid: false, message: 'LevelBuilder state is required' };
    }

    // Validate level data exists
    const levelData = state.getLevelData();
    if (!levelData) {
      return { isValid: false, message: 'Level data is missing from state' };
    }

    // Validate current stage
    const currentStage = state.getCurrentStage();
    const validStages = ['tiles', 'enemies', 'spawn'];
    if (!validStages.includes(currentStage)) {
      return { isValid: false, message: 'Invalid builder stage' };
    }

    // Validate selected enemy type
    const selectedEnemyType = state.getSelectedEnemyType();
    if (typeof selectedEnemyType !== 'number' || selectedEnemyType < 0) {
      return { isValid: false, message: 'Invalid selected enemy type' };
    }

    // Validate selected tile sprite
    const selectedTileSprite = state.getSelectedTileSprite();
    if (!selectedTileSprite || typeof selectedTileSprite !== 'string') {
      return { isValid: false, message: 'Invalid selected tile sprite' };
    }

    return { isValid: true, message: 'LevelBuilder state is valid' };
  }

  /**
   * Validates Gameplay state
   * @param state - The Gameplay state to validate
   * @returns ValidationResult
   */
  validateGameplayState(state: GameplayState): ValidationResult {
    if (!state) {
      return { isValid: false, message: 'Gameplay state is required' };
    }

    // Validate game state
    const gameState = state.getGameState();
    const validGameStates = ['playing', 'gameOver', 'victory'];
    if (!validGameStates.includes(gameState)) {
      return { isValid: false, message: 'Invalid game state' };
    }

    // Validate player health
    const playerHealth = state.getPlayerHealth();
    const maxPlayerHealth = state.getMaxPlayerHealth();
    
    if (typeof playerHealth !== 'number' || playerHealth < 0) {
      return { isValid: false, message: 'Invalid player health' };
    }

    if (typeof maxPlayerHealth !== 'number' || maxPlayerHealth <= 0) {
      return { isValid: false, message: 'Invalid max player health' };
    }

    if (playerHealth > maxPlayerHealth) {
      return { isValid: false, message: 'Player health exceeds maximum' };
    }

    // Validate level dimensions
    const levelWidth = state.getLevelWidth();
    const levelHeight = state.getLevelHeight();
    
    if (typeof levelWidth !== 'number' || levelWidth <= 0) {
      return { isValid: false, message: 'Invalid level width' };
    }

    if (typeof levelHeight !== 'number' || levelHeight <= 0) {
      return { isValid: false, message: 'Invalid level height' };
    }

    // Validate damage cooldown
    const damageCooldown = state.getPlayerDamageCooldown();
    if (typeof damageCooldown !== 'number' || damageCooldown < 0) {
      return { isValid: false, message: 'Invalid damage cooldown' };
    }

    return { isValid: true, message: 'Gameplay state is valid' };
  }

  /**
   * Validates scene transition state
   * @param fromScene - The scene transitioning from
   * @param toScene - The scene transitioning to
   * @param data - Transition data
   * @returns ValidationResult
   */
  validateSceneTransition(fromScene: string, toScene: string, data?: any): ValidationResult {
    if (!fromScene || typeof fromScene !== 'string') {
      return { isValid: false, message: 'Source scene is required' };
    }

    if (!toScene || typeof toScene !== 'string') {
      return { isValid: false, message: 'Target scene is required' };
    }

    const validScenes = ['MainMenu', 'LevelBuilder', 'GamePlay', 'Customization'];
    if (!validScenes.includes(fromScene)) {
      return { isValid: false, message: 'Invalid source scene' };
    }

    if (!validScenes.includes(toScene)) {
      return { isValid: false, message: 'Invalid target scene' };
    }

    // Validate specific transition requirements
    if (toScene === 'GamePlay') {
      if (!data || !data.levelData) {
        return { isValid: false, message: 'Level data is required for GamePlay scene' };
      }
    }

    if (toScene === 'LevelBuilder') {
      // LevelBuilder can be started without specific data
      // It will create a new level if no data is provided
    }

    return { isValid: true, message: 'Scene transition is valid' };
  }

  /**
   * Validates customization data state
   * @param customization - The customization data to validate
   * @returns ValidationResult
   */
  validateCustomizationState(customization: CustomizationData): ValidationResult {
    if (!customization) {
      return { isValid: false, message: 'Customization data is required' };
    }

    // Validate player selection
    if (customization.selectedPlayer !== 'Boy' && customization.selectedPlayer !== 'Girl') {
      return { isValid: false, message: 'Invalid player selection' };
    }

    // Validate weapon selection
    if (customization.selectedWeapon !== 'sword' && customization.selectedWeapon !== 'axe') {
      return { isValid: false, message: 'Invalid weapon selection' };
    }

    // Validate color theme
    if (customization.colorTheme !== 'light' && customization.colorTheme !== 'dark') {
      return { isValid: false, message: 'Invalid color theme' };
    }

    return { isValid: true, message: 'Customization state is valid' };
  }

  /**
   * Validates camera state
   * @param cameraState - The camera state to validate
   * @returns ValidationResult
   */
  validateCameraState(cameraState: { zoom: number; scrollX: number; scrollY: number }): ValidationResult {
    if (!cameraState) {
      return { isValid: false, message: 'Camera state is required' };
    }

    // Validate zoom
    if (typeof cameraState.zoom !== 'number' || cameraState.zoom <= 0) {
      return { isValid: false, message: 'Invalid camera zoom' };
    }

    // Validate scroll positions
    if (typeof cameraState.scrollX !== 'number' || isNaN(cameraState.scrollX)) {
      return { isValid: false, message: 'Invalid camera scroll X' };
    }

    if (typeof cameraState.scrollY !== 'number' || isNaN(cameraState.scrollY)) {
      return { isValid: false, message: 'Invalid camera scroll Y' };
    }

    return { isValid: true, message: 'Camera state is valid' };
  }

  /**
   * Validates UI state
   * @param uiState - The UI state to validate
   * @returns ValidationResult
   */
  validateUIState(uiState: { isDialogOpen: boolean; isMenuOpen?: boolean; isLoading?: boolean }): ValidationResult {
    if (!uiState) {
      return { isValid: false, message: 'UI state is required' };
    }

    // Validate dialog state
    if (typeof uiState.isDialogOpen !== 'boolean') {
      return { isValid: false, message: 'Invalid dialog state' };
    }

    // Validate optional menu state
    if (uiState.isMenuOpen !== undefined && typeof uiState.isMenuOpen !== 'boolean') {
      return { isValid: false, message: 'Invalid menu state' };
    }

    // Validate optional loading state
    if (uiState.isLoading !== undefined && typeof uiState.isLoading !== 'boolean') {
      return { isValid: false, message: 'Invalid loading state' };
    }

    return { isValid: true, message: 'UI state is valid' };
  }

  /**
   * Validates level data state consistency
   * @param levelData - The level data to validate
   * @returns ValidationResult
   */
  validateLevelDataState(levelData: LevelData): ValidationResult {
    if (!levelData) {
      return { isValid: false, message: 'Level data is required' };
    }

    // Validate tiles array
    if (!Array.isArray(levelData.tiles) || levelData.tiles.length === 0) {
      return { isValid: false, message: 'Level must have tiles array' };
    }

    // Validate tileSprites array consistency
    if (levelData.tileSprites) {
      if (!Array.isArray(levelData.tileSprites)) {
        return { isValid: false, message: 'TileSprites must be an array' };
      }

      if (levelData.tileSprites.length !== levelData.tiles.length) {
        return { isValid: false, message: 'TileSprites array length must match tiles array' };
      }

      // Check each row length
      for (let i = 0; i < levelData.tiles.length; i++) {
        if (levelData.tileSprites[i] && levelData.tileSprites[i].length !== levelData.tiles[i].length) {
          return { isValid: false, message: `TileSprites row ${i} length must match tiles row length` };
        }
      }
    }

    // Validate enemies array
    if (!Array.isArray(levelData.enemies)) {
      return { isValid: false, message: 'Enemies must be an array' };
    }

    // Validate spawn point
    if (!levelData.spawn || typeof levelData.spawn.x !== 'number' || typeof levelData.spawn.y !== 'number') {
      return { isValid: false, message: 'Spawn point must have valid coordinates' };
    }

    // Validate metadata
    if (!levelData.metadata) {
      return { isValid: false, message: 'Level metadata is required' };
    }

    return { isValid: true, message: 'Level data state is consistent' };
  }

  /**
   * Validates game state transitions
   * @param fromState - The state transitioning from
   * @param toState - The state transitioning to
   * @returns ValidationResult
   */
  validateGameStateTransition(fromState: string, toState: string): ValidationResult {
    const validStates = ['playing', 'gameOver', 'victory'];
    
    if (!validStates.includes(fromState)) {
      return { isValid: false, message: 'Invalid source game state' };
    }

    if (!validStates.includes(toState)) {
      return { isValid: false, message: 'Invalid target game state' };
    }

    // Validate specific transition rules
    if (fromState === 'gameOver' && toState === 'playing') {
      return { isValid: false, message: 'Cannot transition from gameOver to playing without restart' };
    }

    if (fromState === 'victory' && toState === 'playing') {
      return { isValid: false, message: 'Cannot transition from victory to playing without restart' };
    }

    return { isValid: true, message: 'Game state transition is valid' };
  }
}
