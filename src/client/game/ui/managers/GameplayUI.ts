import { Scene } from 'phaser';
import { ColorTheme } from '../../utils/ColorTheme';
import { PlayerHealthBar } from '../HealthUI';

export interface GameplayUICallbacks {
  onBackClick: () => void;
  onRetryClick: () => void;
}

export interface LevelInfo {
  name: string;
  author: string;
}

export class GameplayUI {
  private scene: Scene;
  private uiCamera: Phaser.Cameras.Scene2D.Camera;
  private callbacks: GameplayUICallbacks;
  
  // UI Elements
  private header: Phaser.GameObjects.Container | null = null;
  private playerHealthBar: PlayerHealthBar | null = null;
  private loadingText: Phaser.GameObjects.Text | null = null;
  private isTestMode: boolean = false;

  constructor(scene: Scene, uiCamera: Phaser.Cameras.Scene2D.Camera, callbacks: GameplayUICallbacks, isTestMode: boolean = false) {
    this.scene = scene;
    this.uiCamera = uiCamera;
    this.callbacks = callbacks;
    this.isTestMode = isTestMode;
  }

  /**
   * Creates the main UI elements for gameplay
   */
  createUI(): void {
    this.createHeader();
    // Player health bar now follows the player above their head (similar to enemies)
    // this.createPlayerHealthBar();
  }

  /**
   * Creates the header with controls information
   */
  private createHeader(): void {
    // Create header background using screen coordinates
    const headerHeight = 60;
    const headerBackground = this.scene.add.rectangle(
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
    headerBackground.setInteractive(false);
    headerBackground.setName('header_background');

    // Create header container centered at top using screen coordinates
    this.header = this.scene.add.container(this.uiCamera.width / 2, headerHeight / 2);
    this.header.setName('header');

    // Controls text (centered in header)
    const controlsText = this.scene.add.text(
      0,
      0,
      'Controls: Click to Move • WASD/Arrows to Move',
      {
        ...ColorTheme.getTextStyle('small'),
        fontSize: '11px',
        align: 'center'
      }
    ).setOrigin(0.5).setInteractive(false);

    // Add controls text to header
    this.header.add([controlsText]);

    this.header.setScrollFactor(0, 0);
    this.header.setDepth(5000); // Very high depth to ensure header is always on top

    // Ensure all elements in header have higher depth
    this.header.list.forEach(child => {
      if ('setDepth' in child) {
        (child as any).setDepth(5001);
      }
    });
  }

  /**
   * Updates the player health display
   * NOTE: Player health bar now follows the player above their head, so this is no longer needed
   */
  updatePlayerHealth(_currentHealth: number, _maxHealth: number): void {
    // Player health bar is now attached to the player entity
    // if (this.playerHealthBar) {
    //   this.playerHealthBar.updateHealth(currentHealth, maxHealth);
    // }
  }

  /**
   * Shows a loading indicator
   */
  showLoadingIndicator(message: string): void {
    // Create loading overlay
    const overlayStyle = ColorTheme.getOverlayStyle(0.8);
    const overlay = this.scene.add.rectangle(
      this.uiCamera.centerX,
      this.uiCamera.centerY,
      this.uiCamera.width,
      this.uiCamera.height,
      overlayStyle.color,
      overlayStyle.alpha
    ).setOrigin(0.5).setScrollFactor(0).setDepth(3000);

    // Loading text
    this.loadingText = this.scene.add.text(
      this.uiCamera.centerX,
      this.uiCamera.centerY - 30,
      message,
      {
        ...ColorTheme.getTextStyle('medium'),
        fontStyle: 'bold'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(3001);

    // Loading spinner/progress bar
    const progressBar = this.scene.add.rectangle(
      this.uiCamera.centerX,
      this.uiCamera.centerY + 20,
      200,
      8,
      ColorTheme.SECONDARY_DARK
    ).setOrigin(0.5).setScrollFactor(0).setDepth(3001);

    const progressFill = this.scene.add.rectangle(
      this.uiCamera.centerX - 100,
      this.uiCamera.centerY + 20,
      0,
      8,
      ColorTheme.SUCCESS
    ).setOrigin(0, 0.5).setScrollFactor(0).setDepth(3002);

    // Animate progress bar
    this.scene.tweens.add({
      targets: progressFill,
      width: 200,
      duration: 2000,
      ease: 'Power2',
      repeat: -1,
      yoyo: true
    });

    // Store references for cleanup
    this.loadingText.setData('overlay', overlay);
    this.loadingText.setData('progressBar', progressBar);
    this.loadingText.setData('progressFill', progressFill);
  }

  /**
   * Hides the loading indicator
   */
  hideLoadingIndicator(): void {
    if (this.loadingText) {
      // Clean up all loading UI elements
      const overlay = this.loadingText.getData('overlay');
      const progressBar = this.loadingText.getData('progressBar');
      const progressFill = this.loadingText.getData('progressFill');

      if (overlay) overlay.destroy();
      if (progressBar) progressBar.destroy();
      if (progressFill) progressFill.destroy();
      
      this.loadingText.destroy();
      this.loadingText = null;
    }
  }

  /**
   * Shows level information briefly
   */
  showLevelInfo(levelInfo: LevelInfo): void {
    const infoText = this.scene.add.text(
      20,
      20,
      `Level: ${levelInfo.name}\nBy: ${levelInfo.author}`,
      {
        ...ColorTheme.getTextStyle('small'),
        backgroundColor: `rgba(${(ColorTheme.BACKGROUND_OVERLAY >> 16) & 255}, ${(ColorTheme.BACKGROUND_OVERLAY >> 8) & 255}, ${ColorTheme.BACKGROUND_OVERLAY & 255}, 0.7)`,
        padding: { x: 10, y: 5 }
      }
    ).setDepth(1000);

    // Auto-hide after 3 seconds
    this.scene.time.delayedCall(3000, () => {
      if (infoText && infoText.active) {
        this.scene.tweens.add({
          targets: infoText,
          alpha: 0,
          duration: 500,
          onComplete: () => infoText.destroy()
        });
      }
    });
  }

  /**
   * Shows an error message with retry option
   */
  showErrorMessage(message: string): void {
    // Create error overlay
    const overlayStyle = ColorTheme.getOverlayStyle(0.8);
    const overlay = this.scene.add.rectangle(
      this.uiCamera.centerX,
      this.uiCamera.centerY,
      this.uiCamera.width,
      this.uiCamera.height,
      overlayStyle.color,
      overlayStyle.alpha
    ).setOrigin(0.5).setScrollFactor(0).setDepth(3000);

    // Error icon (X)
    const errorIcon = this.scene.add.text(
      this.uiCamera.centerX,
      this.uiCamera.centerY - 60,
      '✖',
      {
        fontSize: '48px',
        color: `#${ColorTheme.ERROR.toString(16).padStart(6, '0')}`
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(3001);

    // Error message
    const errorText = this.scene.add.text(
      this.uiCamera.centerX,
      this.uiCamera.centerY - 10,
      message,
      {
        fontSize: '18px',
        color: ColorTheme.TEXT_PRIMARY,
        backgroundColor: `#${ColorTheme.ERROR.toString(16).padStart(6, '0')}`,
        padding: { x: 20, y: 10 },
        wordWrap: { width: 400 },
        align: 'center'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(3001);

    // Retry button
    const retryButton = this.scene.add.text(
      this.uiCamera.centerX - 60,
      this.uiCamera.centerY + 50,
      'Retry',
      {
        ...ColorTheme.getTextStyle('small'),
        backgroundColor: `#${ColorTheme.BUTTON_SECONDARY.toString(16).padStart(6, '0')}`,
        padding: { x: 15, y: 8 }
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(3001).setInteractive();

    // Menu button
    const menuButton = this.scene.add.text(
      this.uiCamera.centerX + 60,
      this.uiCamera.centerY + 50,
      this.isTestMode ? 'Back to Builder' : 'Menu',
      {
        ...ColorTheme.getTextStyle('small'),
        backgroundColor: `#${ColorTheme.BUTTON_SECONDARY.toString(16).padStart(6, '0')}`,
        padding: { x: 15, y: 8 }
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(3001).setInteractive();

    // Button interactions
    retryButton.on('pointerdown', () => {
      overlay.destroy();
      errorIcon.destroy();
      errorText.destroy();
      retryButton.destroy();
      menuButton.destroy();
      this.callbacks.onRetryClick();
    });

    menuButton.on('pointerdown', () => {
      this.callbacks.onBackClick();
    });

    // Hover effects
    retryButton.on('pointerover', () => retryButton.setStyle({ 
      backgroundColor: `#${ColorTheme.BUTTON_SECONDARY_HOVER.toString(16).padStart(6, '0')}` 
    }));
    retryButton.on('pointerout', () => retryButton.setStyle({ 
      backgroundColor: `#${ColorTheme.BUTTON_SECONDARY.toString(16).padStart(6, '0')}` 
    }));
    menuButton.on('pointerover', () => menuButton.setStyle({ 
      backgroundColor: `#${ColorTheme.BUTTON_SECONDARY_HOVER.toString(16).padStart(6, '0')}` 
    }));
    menuButton.on('pointerout', () => menuButton.setStyle({ 
      backgroundColor: `#${ColorTheme.BUTTON_SECONDARY.toString(16).padStart(6, '0')}` 
    }));
  }

  /**
   * Shows a simple game over message (briefly before returning to menu)
   */
  showGameOver(): void {
    console.log('🎮 [GameplayUI] showGameOver called');
    console.log('🎮 [GameplayUI] Camera centerX:', this.uiCamera.centerX, 'centerY:', this.uiCamera.centerY);
    console.log('🎮 [GameplayUI] Camera width:', this.uiCamera.width, 'height:', this.uiCamera.height);
    
    const overlayStyle = ColorTheme.getOverlayStyle(0.7);
    console.log('🎮 [GameplayUI] Overlay style:', overlayStyle);
    
    const overlay = this.scene.add.rectangle(
      this.uiCamera.centerX,
      this.uiCamera.centerY,
      this.uiCamera.width,
      this.uiCamera.height,
      overlayStyle.color,
      overlayStyle.alpha
    ).setScrollFactor(0).setDepth(2000).setInteractive(false); // Non-interactive so it doesn't block header buttons
    
    console.log('🎮 [GameplayUI] Created overlay:', overlay);

    const textObj = this.scene.add.text(
      this.uiCamera.centerX,
      this.uiCamera.centerY,
      'GAME OVER',
      {
        ...ColorTheme.getTextStyle('xlarge'),
        color: `#${ColorTheme.ERROR.toString(16).padStart(6, '0')}`,
        fontStyle: 'bold'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    
    console.log('🎮 [GameplayUI] Created text:', textObj);
    console.log('🎮 [GameplayUI] Text position:', textObj.x, textObj.y);
  }

  /**
   * Shows a simple victory message (briefly before returning to menu)
   */
  showVictory(): void {
    console.log('🎮 [GameplayUI] showVictory called');
    console.log('🎮 [GameplayUI] Camera centerX:', this.uiCamera.centerX, 'centerY:', this.uiCamera.centerY);
    console.log('🎮 [GameplayUI] Camera width:', this.uiCamera.width, 'height:', this.uiCamera.height);
    
    const overlayStyle = ColorTheme.getOverlayStyle(0.7);
    console.log('🎮 [GameplayUI] Overlay style:', overlayStyle);
    
    const overlay = this.scene.add.rectangle(
      this.uiCamera.centerX,
      this.uiCamera.centerY,
      this.uiCamera.width,
      this.uiCamera.height,
      overlayStyle.color,
      overlayStyle.alpha
    ).setScrollFactor(0).setDepth(2000).setInteractive(false); // Non-interactive so it doesn't block header buttons
    
    console.log('🎮 [GameplayUI] Created overlay:', overlay);

    const textObj = this.scene.add.text(
      this.uiCamera.centerX,
      this.uiCamera.centerY,
      'VICTORY!',
      {
        ...ColorTheme.getTextStyle('xlarge'),
        color: `#${ColorTheme.SUCCESS.toString(16).padStart(6, '0')}`,
        fontStyle: 'bold'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    
    console.log('🎮 [GameplayUI] Created text:', textObj);
    console.log('🎮 [GameplayUI] Text position:', textObj.x, textObj.y);
  }

  /**
   * Destroys all UI elements
   */
  destroy(): void {
    if (this.header) {
      this.header.destroy();
      this.header = null;
    }
    if (this.playerHealthBar) {
      this.playerHealthBar.destroy();
      this.playerHealthBar = null;
    }
    if (this.loadingText) {
      this.hideLoadingIndicator();
    }
  }
}
