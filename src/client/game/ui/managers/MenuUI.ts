import { Scene, GameObjects } from 'phaser';
import { MenuButton } from '../MenuButton';
import { ColorTheme } from '../../utils/ColorTheme';

export interface MenuUICallbacks {
  onPlayButtonClick: () => void;
  onBuildButtonClick: () => void;
  onCustomizeButtonClick: () => void;
}

export class MenuUI {
  private scene: Scene;
  private callbacks: MenuUICallbacks;
  
  // UI Elements
  private background: GameObjects.Graphics | null = null;
  private logo: GameObjects.Image | null = null;
  
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

  constructor(scene: Scene, callbacks: MenuUICallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
  }

  /**
   * Creates the main UI elements for the menu
   */
  createUI(): void {
    this.refreshLayout();
    this.setupKeyboardNavigation();
  }

  /**
   * Resets all UI elements (called when scene restarts)
   */
  resetUI(): void {
    this.background = null;
    this.logo = null;
    
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
    
    // Clear buttons array
    this.buttons = [];
  }

  /**
   * Sets up keyboard navigation for desktop users
   */
  private setupKeyboardNavigation(): void {
    if (!this.scene.input.keyboard) return;
    
    // Detect if user is on desktop (has keyboard)
    this.keyboardEnabled = !this.scene.sys.game.device.input.touch;
    
    if (this.keyboardEnabled) {
      // Arrow key navigation
      const upKey = this.scene.input.keyboard.addKey('UP');
      const downKey = this.scene.input.keyboard.addKey('DOWN');
      const enterKey = this.scene.input.keyboard.addKey('ENTER');
      const spaceKey = this.scene.input.keyboard.addKey('SPACE');
      
      upKey.on('down', () => this.navigateUp());
      downKey.on('down', () => this.navigateDown());
      enterKey.on('down', () => this.activateCurrentButton());
      spaceKey.on('down', () => this.activateCurrentButton());
      
      // Number key shortcuts
      const key1 = this.scene.input.keyboard.addKey('ONE');
      const key2 = this.scene.input.keyboard.addKey('TWO');
      const key3 = this.scene.input.keyboard.addKey('THREE');
      
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
        this.scene.tweens.add({
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
    const { width, height } = this.scene.scale;
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
      this.scene,
      width / 2,
      startY,
      'LOADING...',
      () => this.callbacks.onPlayButtonClick(),
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
      this.scene,
      width / 2,
      startY + buttonHeight + buttonSpacing,
      'BUILD LEVEL',
      () => this.callbacks.onBuildButtonClick(),
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
      this.scene,
      width / 2,
      startY + (buttonHeight + buttonSpacing) * 2,
      'CUSTOMIZE',
      () => this.callbacks.onCustomizeButtonClick(),
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
   * Creates a loading spinner next to the play button
   */
  private createLoadingSpinner(x: number, y: number): void {
    this.loadingSpinner = this.scene.add.graphics();
    this.loadingSpinner.setPosition(x, y);
    
    // Create spinning circle
    const radius = 12;
    this.loadingSpinner.lineStyle(3, ColorTheme.PRIMARY_BLUE_LIGHT, 0.8);
    this.loadingSpinner.beginPath();
    this.loadingSpinner.arc(0, 0, radius, 0, Math.PI * 1.5);
    this.loadingSpinner.strokePath();
    
    // Animate the spinner
    this.scene.tweens.add({
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
   * Updates button states based on available data
   */
  updateButtonStates(): void {
    // Check if scene is still active before updating
    if (!this.scene || !this.scene.scene || !this.scene.scene.isActive()) {
      console.warn('MenuUI: Cannot update button states - scene inactive');
      return;
    }
    
    if (this.playButton) {
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
   * Positions buttons responsively based on screen size
   */
  private layoutButtons(): void {
    if (this.buttons.length === 0) return;
    
    const { width, height } = this.scene.scale;
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
    if (this.playButton) {
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
    const { width, height } = this.scene.scale;

    // Resize camera to new viewport to prevent black bars
    this.scene.cameras.resize(width, height);

    // Background – use common gradient background
    if (!this.background) {
      this.background = ColorTheme.createMenuGradientBackground(this.scene, width, height);
    } else {
      ColorTheme.updateMenuGradientBackground(this.background, width, height);
    }

    // Logo – keep aspect but scale down for very small screens
    const scaleFactor = Math.min(width / 1024, height / 768);

    if (!this.logo) {
      this.logo = this.scene.add.image(0, 0, 'logo');
    }
    this.logo!.setPosition(width / 2, height * 0.25).setScale(scaleFactor);
    
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

  /**
   * Shows a temporary message that fades out
   */
  showTemporaryMessage(message: string, duration: number): void {
    const { width, height } = this.scene.scale;
    
    // Create message text
    const messageText = this.scene.add.text(width / 2, height * 0.8, message, {
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
    this.scene.tweens.add({
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
   * Destroys all UI elements
   */
  destroy(): void {
    if (this.background) {
      this.background.destroy();
      this.background = null;
    }
    if (this.logo) {
      this.logo.destroy();
      this.logo = null;
    }
    if (this.playButton) {
      this.playButton.destroy();
      this.playButton = null;
    }
    if (this.buildButton) {
      this.buildButton.destroy();
      this.buildButton = null;
    }
    if (this.customizeButton) {
      this.customizeButton.destroy();
      this.customizeButton = null;
    }
    if (this.loadingSpinner) {
      this.loadingSpinner.destroy();
      this.loadingSpinner = null;
    }
    this.buttons = [];
  }
}
