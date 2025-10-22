import { Scene, GameObjects } from 'phaser';
import { ApiUtils } from '../utils/ApiUtils';
import { StorageUtils, CustomizationData } from '../utils/StorageUtils';
import { MenuButton } from '../ui/MenuButton';
import { ColorTheme } from '../utils/ColorTheme';

export class MainMenu extends Scene {
  background: GameObjects.Graphics | null = null;
  logo: GameObjects.Image | null = null;
  private levelCheckComplete: boolean = false;
  private hasLevelData: boolean = false;
  private customization: CustomizationData;
  
  // Menu buttons
  private playButton: MenuButton | null = null;
  private buildButton: MenuButton | null = null;
  private customizeButton: MenuButton | null = null;
  
  // Loading indicator
  private loadingSpinner: GameObjects.Graphics | null = null;
  
  // Keyboard navigation
  private buttons: MenuButton[] = [];
  private currentButtonIndex: number = 0;
  private keyboardEnabled: boolean = false;

  constructor() {
    super('MainMenu');
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
    
    // Destroy existing buttons
    this.playButton?.destroy();
    this.buildButton?.destroy();
    this.customizeButton?.destroy();
    this.playButton = null;
    this.buildButton = null;
    this.customizeButton = null;
    
    // Destroy loading spinner
    this.loadingSpinner?.destroy();
    this.loadingSpinner = null;
    
    // Load customization data
    this.customization = StorageUtils.loadCustomization();
  }

  create() {
    this.refreshLayout();

    // Re-calculate positions whenever the game canvas is resized (e.g. orientation change).
    this.scale.on('resize', () => this.refreshLayout());

    // Setup keyboard navigation
    this.setupKeyboardNavigation();

    // Check for level data in Reddit post
    this.checkForLevelData();
  }

  private async checkForLevelData(): Promise<void> {
    try {
      const result = await ApiUtils.loadLevelFromReddit();
      
      if (result.success && result.levelData) {
        // Validate level data
        const validation = ApiUtils.validateLevelData(result.levelData);
        if (validation.valid) {
          // Valid level data found
          this.hasLevelData = true;
          this.showLevelInfo(result.levelData.metadata.name, result.levelData.metadata.author);
        } else {
          // Invalid level data - use fallback
          console.warn('Invalid level data found:', validation.error);
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

  private showBuilderInfo(): void {
    // Title removed - no builder info to clear
  }

  /**
   * Shows message when no level is available
   */
  private showNoLevelMessage(): void {
    this.showTemporaryMessage('No level available for this post.\nTry building your own level!', 3000);
  }

  /**
   * Shows error message to user
   */
  private showErrorMessage(message: string): void {
    this.showTemporaryMessage(`Error: ${message}`, 4000);
  }

  /**
   * Creates a loading spinner next to the play button
   */
  private createLoadingSpinner(x: number, y: number): void {
    this.loadingSpinner = this.add.graphics();
    this.loadingSpinner.setPosition(x, y);
    
    // Create spinning circle
    const radius = 12;
    this.loadingSpinner.lineStyle(3, ColorTheme.PRIMARY_BLUE_LIGHT, 0.8);
    this.loadingSpinner.beginPath();
    this.loadingSpinner.arc(0, 0, radius, 0, Math.PI * 1.5);
    this.loadingSpinner.strokePath();
    
    // Animate the spinner
    this.tweens.add({
      targets: this.loadingSpinner,
      rotation: Math.PI * 2,
      duration: 1000,
      repeat: -1,
      ease: 'Linear'
    });
  }

  /**
   * Removes the loading spinner
   */
  private removeLoadingSpinner(): void {
    if (this.loadingSpinner) {
      this.loadingSpinner.destroy();
      this.loadingSpinner = null;
    }
  }

  /**
   * Shows a temporary message that fades out
   */
  private showTemporaryMessage(message: string, duration: number): void {
    const { width, height } = this.scale;
    
    // Create message text
    const messageText = this.add.text(width / 2, height * 0.8, message, {
      fontSize: '20px',
      color: ColorTheme.TEXT_PRIMARY,
      fontFamily: 'Arial Black',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center',
      backgroundColor: `rgba(${(ColorTheme.ERROR >> 16) & 255}, ${(ColorTheme.ERROR >> 8) & 255}, ${ColorTheme.ERROR & 255}, 0.8)`,
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5);

    // Fade out after duration
    this.tweens.add({
      targets: messageText,
      alpha: 0,
      duration: 1000,
      delay: duration - 1000,
      onComplete: () => {
        messageText.destroy();
      }
    });
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
  private animateButtonsEntrance(): void {
    this.buttons.forEach((button, index) => {
      if (button) {
        // Start buttons off-screen to the right
        const container = button.getContainer();
        const originalX = container.x;
        container.setX(originalX + 300);
        container.setAlpha(0);
        
        // Animate them sliding in with staggered timing
        this.tweens.add({
          targets: container,
          x: originalX,
          alpha: 1,
          duration: 600,
          delay: index * 150,
          ease: 'Back.easeOut'
        });
      }
    });
  }

  /**
   * Creates the three main menu buttons
   */
  private createMenuButtons(): void {
    const { width, height } = this.scale;
    const scaleFactor = Math.min(width / 1024, height / 768);
    
    // Enhanced button dimensions for better touch targets
    const minButtonWidth = 280;
    const maxButtonWidth = 400;
    const buttonWidth = Math.max(minButtonWidth, Math.min(maxButtonWidth, width * 0.7));
    const buttonHeight = Math.max(60, Math.floor(70 * scaleFactor));
    const buttonSpacing = Math.max(15, Math.floor(25 * scaleFactor));
    
    // Calculate vertical positioning with better spacing
    const startY = height * 0.6;
    
    // Play button - start with loading state
    this.playButton = new MenuButton(
      this,
      width / 2,
      startY,
      'LOADING...',
      () => this.handlePlayButton(),
      {
        ...ColorTheme.getButtonStyle('primary'),
        width: buttonWidth,
        height: buttonHeight,
        fontSize: `${Math.floor(24 * scaleFactor)}px`
      },
      'ONE'
    );
    this.playButton.setEnabled(true);
    
    // Create loading spinner
    this.createLoadingSpinner(width / 2 + buttonWidth / 2 - 30, startY);
    
    // Build Level button with keyboard shortcut
    this.buildButton = new MenuButton(
      this,
      width / 2,
      startY + buttonHeight + buttonSpacing,
      'BUILD LEVEL',
      () => this.handleBuildButton(),
      {
        ...ColorTheme.getButtonStyle('success'),
        width: buttonWidth,
        height: buttonHeight,
        fontSize: `${Math.floor(24 * scaleFactor)}px`
      },
      'TWO'
    );
    
    // Customize button with keyboard shortcut
    this.customizeButton = new MenuButton(
      this,
      width / 2,
      startY + (buttonHeight + buttonSpacing) * 2,
      'CUSTOMIZE',
      () => this.handleCustomizeButton(),
      {
        ...ColorTheme.getButtonStyle('warning'),
        width: buttonWidth,
        height: buttonHeight,
        fontSize: `${Math.floor(24 * scaleFactor)}px`
      },
      'THREE'
    );
    
    // Store buttons for keyboard navigation
    this.buttons = [this.playButton, this.buildButton, this.customizeButton].filter(button => button !== null) as MenuButton[];
    
    // Set initial focus for keyboard users
    if (this.keyboardEnabled && this.buttons.length > 0 && this.buttons[0]) {
      this.buttons[0].setFocus(true);
    }
  }
  
  /**
   * Updates button states based on available data
   */
  private updateButtonStates(): void {
    if (this.playButton && this.levelCheckComplete) {
      // Remove loading spinner
      this.removeLoadingSpinner();
      
      // Play button is always enabled now (either Reddit level or fallback)
      this.playButton.setEnabled(true);
      this.playButton.setText('PLAY');
      
      // Restore normal button style
      this.playButton.setStyle({
        backgroundColor: ColorTheme.BUTTON_PRIMARY,
        hoverBackgroundColor: ColorTheme.BUTTON_PRIMARY_HOVER
      });
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
        const validation = ApiUtils.validateLevelData(result.levelData);
        if (!validation.valid) {
          // Use fallback level if validation fails
          console.warn('Invalid level data, using fallback level:', validation.error);
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
   * Hides loading feedback
   */
  private hideLoadingFeedback(): void {
    if (this.playButton && this.levelCheckComplete) {
      this.updateButtonStates();
    }
    if (this.loadingSpinner) {
      this.loadingSpinner.setVisible(false);
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
  
  /**
   * Positions buttons responsively based on screen size
   */
  private layoutButtons(): void {
    if (this.buttons.length === 0) return;
    
    const { width, height } = this.scale;
    const scaleFactor = Math.min(width / 1024, height / 768);
    
    // Enhanced button dimensions for better touch targets
    const minButtonWidth = 280;
    const maxButtonWidth = 400;
    const buttonWidth = Math.max(minButtonWidth, Math.min(maxButtonWidth, width * 0.7));
    const buttonHeight = Math.max(60, Math.floor(70 * scaleFactor));
    const buttonSpacing = Math.max(15, Math.floor(25 * scaleFactor));
    
    // Calculate vertical positioning with better spacing
    const startY = height * 0.6;
    
    // Update button positions and sizes
    this.buttons.forEach((button, index) => {
      if (button) {
        button.setPosition(width / 2, startY + index * (buttonHeight + buttonSpacing));
        
        // Update button styles for responsive sizing
        button.setStyle({
          width: buttonWidth,
          height: buttonHeight,
          fontSize: `${Math.floor(24 * scaleFactor)}px`
        });
      }
    });
    
    // Update button text (maintain current state)
    if (this.playButton && this.levelCheckComplete) {
      // Only update if level check is complete, otherwise keep loading state
      this.playButton.setText('PLAY');
    }
    if (this.buildButton) {
      this.buildButton.setText('BUILD LEVEL');
    }
    if (this.customizeButton) {
      this.customizeButton.setText('CUSTOMIZE');
    }
  }



  /**
   * Positions and (lightly) scales all UI elements based on the current game size.
   * Call this from create() and from any resize events.
   */
  private refreshLayout(): void {
    const { width, height } = this.scale;

    // Resize camera to new viewport to prevent black bars
    this.cameras.resize(width, height);

    // Background – use common gradient background
    if (!this.background) {
      this.background = ColorTheme.createMenuGradientBackground(this, width, height);
    } else {
      ColorTheme.updateMenuGradientBackground(this.background, width, height);
    }

    // Logo – keep aspect but scale down for very small screens
    const scaleFactor = Math.min(width / 1024, height / 768);

    if (!this.logo) {
      this.logo = this.add.image(0, 0, 'logo');
    }
    this.logo!.setPosition(width / 2, height * 0.25).setScale(scaleFactor);

    // Title removed - no longer showing "QuestBuddies" text
    
    // Create buttons if they don't exist
    if (!this.playButton) {
      this.createMenuButtons();
      // Add entrance animation for buttons
      this.animateButtonsEntrance();
    } else {
      // Layout existing buttons
      this.layoutButtons();
    }
  }
}
