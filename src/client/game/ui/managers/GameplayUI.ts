import { Scene } from 'phaser';
import { ColorTheme } from '../../utils/ColorTheme';
import { PlayerHealthBar } from '../HealthUI';

export interface GameplayUICallbacks {
  onBackClick: () => void;
  onRestartClick: () => void;
  onMenuClick: () => void;
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
  private gameStateText: Phaser.GameObjects.Text | null = null;
  private restartButton: Phaser.GameObjects.Text | null = null;
  private menuButton: Phaser.GameObjects.Text | null = null;
  private backButton: Phaser.GameObjects.Text | null = null;
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
    this.createPlayerHealthBar();
  }

  /**
   * Creates the header with back button
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
    headerBackground.setName('header_background');

    // Create header container centered at top using screen coordinates
    this.header = this.scene.add.container(this.uiCamera.width / 2, headerHeight / 2);
    this.header.setName('header');

    // Back button (positioned on the left)
    const backButton = this.scene.add.rectangle(-this.uiCamera.width / 2 + 50, 0, 80, 40, ColorTheme.BUTTON_SECONDARY)
      .setInteractive()
      .setStrokeStyle(2, ColorTheme.BORDER_PRIMARY)
      .setName('header_back_button');

    const backLabel = this.scene.add.text(-this.uiCamera.width / 2 + 50, 0, '← Back', {
      ...ColorTheme.getTextStyle('small'),
      fontSize: '14px'
    }).setOrigin(0.5);

    backButton.on('pointerdown', () => {
      this.callbacks.onBackClick();
    });

    backButton.on('pointerover', () => {
      backButton.setStrokeStyle(3, ColorTheme.SUCCESS);
    });
    backButton.on('pointerout', () => {
      backButton.setStrokeStyle(2, ColorTheme.BORDER_PRIMARY);
    });

    // Add back button to header
    this.header.add([backButton, backLabel]);

    this.header.setScrollFactor(0, 0);
    this.header.setDepth(1001);

    // Ensure all buttons in header have higher depth
    this.header.list.forEach(child => {
      if ('setDepth' in child) {
        (child as any).setDepth(1002);
      }
    });
  }

  /**
   * Creates the player health bar
   */
  private createPlayerHealthBar(): void {
    this.playerHealthBar = new PlayerHealthBar(this.scene);
  }

  /**
   * Updates the player health display
   */
  updatePlayerHealth(currentHealth: number, maxHealth: number): void {
    if (this.playerHealthBar) {
      this.playerHealthBar.updateHealth(currentHealth, maxHealth);
    }
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
      this.callbacks.onMenuClick();
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
   * Shows the game over screen
   */
  showGameOver(): void {
    // Create semi-transparent overlay
    const overlayStyle = ColorTheme.getOverlayStyle(0.7);
    this.scene.add.rectangle(
      this.uiCamera.centerX,
      this.uiCamera.centerY,
      this.uiCamera.width,
      this.uiCamera.height,
      overlayStyle.color,
      overlayStyle.alpha
    ).setScrollFactor(0).setDepth(2000);

    // Game over text
    this.gameStateText = this.scene.add.text(
      this.uiCamera.centerX,
      this.uiCamera.centerY - 50,
      'GAME OVER',
      {
        ...ColorTheme.getTextStyle('xlarge'),
        color: `#${ColorTheme.ERROR.toString(16).padStart(6, '0')}`,
        fontStyle: 'bold'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

    // Restart button
    this.restartButton = this.scene.add.text(
      this.uiCamera.centerX - 80,
      this.uiCamera.centerY + 50,
      'Restart',
      {
        ...ColorTheme.getTextStyle('medium'),
        backgroundColor: `#${ColorTheme.BUTTON_SECONDARY.toString(16).padStart(6, '0')}`,
        padding: { x: 20, y: 10 }
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2001).setInteractive();

    this.restartButton.on('pointerdown', () => {
      this.callbacks.onRestartClick();
    });

    // Menu/Back button
    const menuButtonText = this.isTestMode ? 'Back to Builder' : 'Menu';
    this.menuButton = this.scene.add.text(
      this.uiCamera.centerX + 80,
      this.uiCamera.centerY + 50,
      menuButtonText,
      {
        fontSize: '24px',
        color: '#ffffff',
        backgroundColor: '#333333',
        padding: { x: 20, y: 10 }
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2001).setInteractive();

    this.menuButton.on('pointerdown', () => {
      this.callbacks.onMenuClick();
    });
  }

  /**
   * Shows the victory screen
   */
  showVictory(): void {
    // Create semi-transparent overlay
    const overlayStyle = ColorTheme.getOverlayStyle(0.7);
    this.scene.add.rectangle(
      this.uiCamera.centerX,
      this.uiCamera.centerY,
      this.uiCamera.width,
      this.uiCamera.height,
      overlayStyle.color,
      overlayStyle.alpha
    ).setScrollFactor(0).setDepth(2000);

    // Victory text
    this.gameStateText = this.scene.add.text(
      this.uiCamera.centerX,
      this.uiCamera.centerY - 50,
      'VICTORY!',
      {
        ...ColorTheme.getTextStyle('xlarge'),
        color: `#${ColorTheme.SUCCESS.toString(16).padStart(6, '0')}`,
        fontStyle: 'bold'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

    // Victory message
    this.scene.add.text(
      this.uiCamera.centerX,
      this.uiCamera.centerY - 10,
      'All enemies defeated!',
      {
        ...ColorTheme.getTextStyle('medium')
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

    // Restart button
    this.restartButton = this.scene.add.text(
      this.uiCamera.centerX - 80,
      this.uiCamera.centerY + 50,
      'Play Again',
      {
        ...ColorTheme.getTextStyle('medium'),
        backgroundColor: `#${ColorTheme.BUTTON_SECONDARY.toString(16).padStart(6, '0')}`,
        padding: { x: 20, y: 10 }
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2001).setInteractive();

    this.restartButton.on('pointerdown', () => {
      this.callbacks.onRestartClick();
    });

    // Menu/Back button
    const menuButtonText = this.isTestMode ? 'Back to Builder' : 'Menu';
    this.menuButton = this.scene.add.text(
      this.uiCamera.centerX + 80,
      this.uiCamera.centerY + 50,
      menuButtonText,
      {
        fontSize: '24px',
        color: '#ffffff',
        backgroundColor: '#333333',
        padding: { x: 20, y: 10 }
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2001).setInteractive();

    this.menuButton.on('pointerdown', () => {
      this.callbacks.onMenuClick();
    });
  }

  /**
   * Clears all game state UI elements
   */
  clearGameStateUI(): void {
    if (this.gameStateText) {
      this.gameStateText.destroy();
      this.gameStateText = null;
    }
    if (this.restartButton) {
      this.restartButton.destroy();
      this.restartButton = null;
    }
    if (this.menuButton) {
      this.menuButton.destroy();
      this.menuButton = null;
    }
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
    this.clearGameStateUI();
    if (this.backButton) {
      this.backButton.destroy();
      this.backButton = null;
    }
  }
}
