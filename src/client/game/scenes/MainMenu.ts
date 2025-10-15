import { Scene, GameObjects } from 'phaser';
import { ApiUtils } from '../utils/ApiUtils';
import { StorageUtils, CustomizationData } from '../utils/StorageUtils';
import { MenuButton } from '../ui/MenuButton';
import { ColorTheme } from '../utils/ColorTheme';

export class MainMenu extends Scene {
  background: GameObjects.Image | null = null;
  logo: GameObjects.Image | null = null;
  title: GameObjects.Text | null = null;
  private levelCheckComplete: boolean = false;
  private hasLevelData: boolean = false;
  private customization: CustomizationData;
  
  // Menu buttons
  private playButton: MenuButton | null = null;
  private buildButton: MenuButton | null = null;
  private customizeButton: MenuButton | null = null;
  
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
    this.title = null;
    this.levelCheckComplete = false;
    this.hasLevelData = false;
    
    // Destroy existing buttons
    this.playButton?.destroy();
    this.buildButton?.destroy();
    this.customizeButton?.destroy();
    this.playButton = null;
    this.buildButton = null;
    this.customizeButton = null;
    
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
          // Invalid level data
          console.warn('Invalid level data found:', validation.error);
          this.hasLevelData = false;
          this.showBuilderInfo();
        }
      } else {
        // No level data or load failed
        console.log('No level data available:', result.message);
        this.hasLevelData = false;
        this.showBuilderInfo();
      }
    } catch (error) {
      console.error('Error checking for level data:', error);
      this.hasLevelData = false;
      this.showBuilderInfo();
    } finally {
      this.levelCheckComplete = true;
      this.updateButtonStates();
    }
  }

  private showLevelInfo(levelName: string, author: string): void {
    if (this.title) {
      this.title.setText(`Level: ${levelName}\nBy: ${author}`);
    }
  }

  private showBuilderInfo(): void {
    if (this.title) {
      this.title.setText('');
    }
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
   * Shows loading feedback
   */
  private showLoadingFeedback(): void {
    if (this.playButton) {
      this.playButton.setText('LOADING...');
      this.playButton.setEnabled(false);
    }
  }

  /**
   * Hides loading feedback
   */
  private hideLoadingFeedback(): void {
    if (this.playButton && this.levelCheckComplete) {
      this.updateButtonStates();
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
    
    // Play button with keyboard shortcut
    this.playButton = new MenuButton(
      this,
      width / 2,
      startY,
      this.keyboardEnabled ? 'PLAY (1)' : 'PLAY',
      () => this.handlePlayButton(),
      {
        ...ColorTheme.getButtonStyle('primary'),
        width: buttonWidth,
        height: buttonHeight,
        fontSize: `${Math.floor(24 * scaleFactor)}px`
      },
      'ONE'
    );
    
    // Build Level button with keyboard shortcut
    this.buildButton = new MenuButton(
      this,
      width / 2,
      startY + buttonHeight + buttonSpacing,
      this.keyboardEnabled ? 'BUILD LEVEL (2)' : 'BUILD LEVEL',
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
      this.keyboardEnabled ? 'CUSTOMIZE (3)' : 'CUSTOMIZE',
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
      // Enable/disable play button based on level data availability
      this.playButton.setEnabled(this.hasLevelData);
      
      if (!this.hasLevelData) {
        this.playButton.setText('NO LEVEL');
        // Update button style to indicate disabled state
        this.playButton.setStyle({
          backgroundColor: ColorTheme.BUTTON_DISABLED,
          hoverBackgroundColor: ColorTheme.BUTTON_DISABLED
        });
      } else {
        this.playButton.setText('PLAY');
        // Restore normal button style
        this.playButton.setStyle({
          backgroundColor: ColorTheme.BUTTON_PRIMARY,
          hoverBackgroundColor: ColorTheme.BUTTON_PRIMARY_HOVER
        });
      }
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
    
    // Show loading feedback
    this.showLoadingFeedback();
    
    try {
      const result = await ApiUtils.loadLevelFromReddit();
      
      if (result.success && result.levelData) {
        // Validate level data before starting game
        const validation = ApiUtils.validateLevelData(result.levelData);
        if (!validation.valid) {
          this.showErrorMessage(`Invalid level data: ${validation.error}`);
          return;
        }
        
        // Start gameplay with loaded level and customization data
        this.scene.start('GamePlay', { 
          levelData: result.levelData,
          customization: this.customization
        });
      } else {
        this.showErrorMessage(result.message || 'Level data not available');
      }
    } catch (error) {
      console.error('Error starting game:', error);
      this.showErrorMessage('Failed to load level. Please try again.');
    } finally {
      this.hideLoadingFeedback();
    }
  }
  
  /**
   * Handles Build Level button click
   */
  private handleBuildButton(): void {
    // Start level builder with customization data
    this.scene.start('LevelBuilder', { 
      customization: this.customization 
    });
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
    
    // Update button text for keyboard shortcuts
    if (this.playButton) {
      this.playButton.setText(this.keyboardEnabled ? 'PLAY (1)' : 'PLAY');
    }
    if (this.buildButton) {
      this.buildButton.setText(this.keyboardEnabled ? 'BUILD LEVEL (2)' : 'BUILD LEVEL');
    }
    if (this.customizeButton) {
      this.customizeButton.setText(this.keyboardEnabled ? 'CUSTOMIZE (3)' : 'CUSTOMIZE');
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

    // Background – stretch to fill the whole canvas
    if (!this.background) {
      this.background = this.add.image(0, 0, 'background').setOrigin(0);
    }
    this.background!.setDisplaySize(width, height);

    // Logo – keep aspect but scale down for very small screens
    const scaleFactor = Math.min(width / 1024, height / 768);

    if (!this.logo) {
      this.logo = this.add.image(0, 0, 'logo');
    }
    this.logo!.setPosition(width / 2, height * 0.25).setScale(scaleFactor);

    // Title text – create once, then scale on resize
    const baseFontSize = 32;
    if (!this.title) {
      this.title = this.add
        .text(0, 0, 'QuestBuddies', {
          ...ColorTheme.getTextStyle('large'),
          fontSize: `${baseFontSize}px`,
          align: 'center',
        })
        .setOrigin(0.5);
    }
    this.title!.setPosition(width / 2, height * 0.45);
    this.title!.setScale(scaleFactor);
    
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
