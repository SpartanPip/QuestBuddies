import { Scene, GameObjects } from 'phaser';
import { LevelValidationService } from '../services';
import { ApiUtils } from '../utils/ApiUtils';
import { StorageUtils, CustomizationData } from '../utils/StorageUtils';
import { MenuButton } from '../ui/MenuButton';
import { MenuUI, MenuUICallbacks } from '../ui/managers/MenuUI';

export class MainMenu extends Scene {
  background: GameObjects.Graphics | null = null;
  logo: GameObjects.Image | null = null;
  private levelCheckComplete: boolean = false;
  private hasLevelData: boolean = false;
  private customization: CustomizationData;
  private levelValidationService: LevelValidationService;
  
  // UI elements - managed by MenuUI
  
  // Keyboard navigation
  private buttons: MenuButton[] = [];
  private currentButtonIndex: number = 0;
  private keyboardEnabled: boolean = false;
  private uiManager: MenuUI;

  constructor() {
    super('MainMenu');
  }

  /**
   * Initialize validation service asynchronously
   */
  private async initializeValidationService(): Promise<void> {
    try {
      const { LevelManager } = await import('../managers/LevelManager');
      this.levelValidationService = new LevelValidationService(new LevelManager());
    } catch (error) {
      console.error('Failed to initialize validation service:', error);
    }
  }

  /**
   * Reset cached GameObject references every time the scene starts.
   * The same Scene instance is reused by Phaser, so we must ensure
   * stale (destroyed) objects are cleared out when the scene restarts.
   */
  init(): void {
    this.background = null;
    this.logo = null;
    this.levelCheckComplete = false;
    this.hasLevelData = false;
    this.customization = StorageUtils.loadCustomization();
    
    // Initialize validation service asynchronously
    void this.initializeValidationService();
    
    // Load customization data
    this.customization = StorageUtils.loadCustomization();
  }

  create() {
    // Initialize UI manager with callbacks
    const uiCallbacks: MenuUICallbacks = {
      onPlayButtonClick: () => {
        void this.handlePlayButton();
      },
      onBuildButtonClick: () => {
        this.handleBuildButton();
      },
      onCustomizeButtonClick: () => {
        this.handleCustomizeButton();
      }
    };

    this.uiManager = new MenuUI(this, uiCallbacks);
    this.uiManager.createUI();

    // Re-calculate positions whenever the game canvas is resized (e.g. orientation change).
    this.scale.on('resize', () => this.uiManager.createUI());

    // Setup keyboard navigation
    this.setupKeyboardNavigation();

    // Check for level data in Reddit post
    void this.checkForLevelData();
  }

  private async checkForLevelData(): Promise<void> {
    try {
      const result = await ApiUtils.loadLevelFromReddit();
      
      if (result.success && result.levelData) {
        // Validate level data
        const validation = this.levelValidationService.validateDataStructure(result.levelData);
        if (validation.isValid) {
          // Valid level data found
          this.hasLevelData = true;
          this.showLevelInfo(result.levelData.metadata.name, result.levelData.metadata.author);
        } else {
          // Invalid level data - use fallback
          console.warn('Invalid level data found:', validation.message);
          this.hasLevelData = true; // Still allow playing with fallback level
          this.showFallbackLevelInfo();
        }
      } else {
        // No level data or load failed - use fallback level
        console.log('No level data available, using fallback level:', result.message);
        this.hasLevelData = true; // Allow playing with fallback level
        this.showFallbackLevelInfo();
      }
    } catch (error) {
      console.error('Error checking for level data, using fallback level:', error);
      this.hasLevelData = true; // Allow playing with fallback level
      this.showFallbackLevelInfo();
    } finally {
      this.levelCheckComplete = true;
      this.updateButtonStates();
    }
  }

  private showLevelInfo(_levelName: string, _author: string): void {
    // Title removed - level info no longer displayed in title
  }

  private showFallbackLevelInfo(): void {
    // Title removed - fallback level info no longer displayed in title
  }


  /**
   * Shows message when no level is available
   */
  private showNoLevelMessage(): void {
    this.showTemporaryMessage('No level available for this post.\nTry building your own level!', 3000);
  }



  /**
   * Shows a temporary message that fades out
   */
  private showTemporaryMessage(message: string, duration: number): void {
    this.uiManager.showTemporaryMessage(message, duration);
  }

  /**
   * Sets up keyboard navigation for desktop users
   */
  private setupKeyboardNavigation(): void {
    if (!this.input.keyboard) return;
    
    // Detect if user is on desktop (has keyboard)
    this.keyboardEnabled = !this.sys.game.device.input.touch;
    
    if (this.keyboardEnabled) {
      // Arrow key navigation
      const upKey = this.input.keyboard.addKey('UP');
      const downKey = this.input.keyboard.addKey('DOWN');
      const enterKey = this.input.keyboard.addKey('ENTER');
      const spaceKey = this.input.keyboard.addKey('SPACE');
      
      upKey.on('down', () => this.navigateUp());
      downKey.on('down', () => this.navigateDown());
      enterKey.on('down', () => this.activateCurrentButton());
      spaceKey.on('down', () => this.activateCurrentButton());
      
      // Number key shortcuts
      const key1 = this.input.keyboard.addKey('ONE');
      const key2 = this.input.keyboard.addKey('TWO');
      const key3 = this.input.keyboard.addKey('THREE');
      
      key1.on('down', () => this.selectButton(0));
      key2.on('down', () => this.selectButton(1));
      key3.on('down', () => this.selectButton(2));
    }
  }

  private navigateUp(): void {
    if (this.buttons.length === 0) return;
    
    this.buttons[this.currentButtonIndex]?.setFocus(false);
    this.currentButtonIndex = (this.currentButtonIndex - 1 + this.buttons.length) % this.buttons.length;
    this.buttons[this.currentButtonIndex]?.setFocus(true);
  }

  private navigateDown(): void {
    if (this.buttons.length === 0) return;
    
    this.buttons[this.currentButtonIndex]?.setFocus(false);
    this.currentButtonIndex = (this.currentButtonIndex + 1) % this.buttons.length;
    this.buttons[this.currentButtonIndex]?.setFocus(true);
  }

  private selectButton(index: number): void {
    if (index >= 0 && index < this.buttons.length) {
      this.buttons[this.currentButtonIndex]?.setFocus(false);
      this.currentButtonIndex = index;
      this.buttons[this.currentButtonIndex]?.setFocus(true);
    }
  }

  private activateCurrentButton(): void {
    this.buttons[this.currentButtonIndex]?.triggerClick();
  }

  /**
   * Animates buttons entrance for visual polish
   */

  /**
   * Creates the three main menu buttons
   */
  
  /**
   * Updates button states based on available data
   */
  private updateButtonStates(): void {
    if (this.levelCheckComplete) {
      // Update button states through UI manager
      this.uiManager.updateButtonStates();
    }
  }
  
  /**
   * Handles Play button click
   */
  private async handlePlayButton(): Promise<void> {
    if (!this.hasLevelData) {
      this.showNoLevelMessage();
      return;
    }
    
    // Loading spinner is already shown by default
    
    try {
      const result = await ApiUtils.loadLevelFromReddit();
      
      if (result.success && result.levelData) {
        // Validate level data before starting game
        const validation = this.levelValidationService.validateDataStructure(result.levelData);
        if (!validation.isValid) {
          // Use fallback level if validation fails
          console.warn('Invalid level data, using fallback level:', validation.message);
          const fallbackLevel = ApiUtils.createFallbackLevel();
          this.scene.start('GamePlay', { 
            levelData: fallbackLevel,
            customization: this.customization
          });
          return;
        }
        
        // Start gameplay with loaded level and customization data
        this.scene.start('GamePlay', { 
          levelData: result.levelData,
          customization: this.customization
        });
      } else {
        // No level data available, use fallback level
        console.log('No level data available, using fallback level:', result.message);
        const fallbackLevel = ApiUtils.createFallbackLevel();
        this.scene.start('GamePlay', { 
          levelData: fallbackLevel,
          customization: this.customization
        });
      }
    } catch (error) {
      console.error('Error starting game, using fallback level:', error);
      // Use fallback level on error
      const fallbackLevel = ApiUtils.createFallbackLevel();
      this.scene.start('GamePlay', { 
        levelData: fallbackLevel,
        customization: this.customization
      });
    } finally {
      // Button state will be updated in updateButtonStates()
    }
  }

  
  /**
   * Handles Build Level button click
   */
  private handleBuildButton(): void {
    try {
      console.log('🔨 Starting Level Builder with customization:', this.customization);
      // Start level builder with customization data
      this.scene.start('LevelBuilder', { 
        customization: this.customization 
      });
    } catch (error) {
      console.error('Failed to start Level Builder:', error);
    }
  }
  
  /**
   * Handles Customize button click
   */
  private handleCustomizeButton(): void {
    // Start customize scene with current customization data
    this.scene.start('Customize', { 
      customization: this.customization 
    });
  }
  



}
