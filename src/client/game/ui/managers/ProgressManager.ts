import * as Phaser from 'phaser';
import { ColorTheme } from '../../../utils/ColorTheme';

/**
 * Configuration interface for progress indicators
 */
export interface ProgressConfig {
  message?: string;
  showProgressBar?: boolean;
  showSpinner?: boolean;
  progress?: number; // 0-1
  duration?: number; // For indeterminate progress
  overlayAlpha?: number;
}

/**
 * Configuration interface for loading indicators
 */
export interface LoadingConfig {
  message: string;
  showSpinner?: boolean;
  overlayAlpha?: number;
}

/**
 * Reusable Progress Manager for creating loading indicators and progress bars
 * 
 * Features:
 * - Loading spinners with customizable messages
 * - Progress bars with percentage display
 * - Indeterminate progress animations
 * - Consistent styling using ColorTheme
 * - Proper depth management and overlay
 * - Smooth animations and transitions
 * - Responsive design
 * 
 * Usage:
 * ```typescript
 * // Loading spinner
 * const loadingId = ProgressManager.showLoading(scene, {
 *   message: 'Loading level...',
 *   showSpinner: true
 * });
 * 
 * // Progress bar
 * const progressId = ProgressManager.showProgress(scene, {
 *   message: 'Saving level...',
 *   showProgressBar: true,
 *   progress: 0.5
 * });
 * 
 * // Update progress
 * ProgressManager.updateProgress(scene, progressId, 0.75);
 * 
 * // Hide progress
 * ProgressManager.hideProgress(scene, progressId);
 * ```
 */
export class ProgressManager {
  private static readonly CONFIG = {
    OVERLAY_DEPTH: 3000,
    CONTENT_DEPTH: 3001,
    SPINNER_DEPTH: 3002,
    PROGRESS_DEPTH: 3002,
    ANIMATION_DURATION: 300,
    SPINNER_RADIUS: 20,
    PROGRESS_BAR_WIDTH: 200,
    PROGRESS_BAR_HEIGHT: 8,
    MESSAGE_FONT_SIZE: '18px',
    PROGRESS_FONT_SIZE: '14px'
  };

  private static activeProgress: Map<Phaser.Scene, Map<string, Phaser.GameObjects.Container>> = new Map();

  /**
   * Show a loading indicator with spinner
   */
  public static showLoading(scene: Phaser.Scene, config: LoadingConfig): string {
    const id = this.generateId();
    const progressConfig: ProgressConfig = {
      message: config.message,
      showSpinner: config.showSpinner !== false,
      overlayAlpha: config.overlayAlpha || 0.8
    };

    const container = this.createProgressContainer(scene, progressConfig, id);
    this.addToActiveProgress(scene, id, container);
    return id;
  }

  /**
   * Show a progress bar with percentage
   */
  public static showProgress(scene: Phaser.Scene, config: ProgressConfig): string {
    const id = this.generateId();
    const progressConfig: ProgressConfig = {
      message: config.message || 'Loading...',
      showProgressBar: config.showProgressBar !== false,
      progress: config.progress || 0,
      overlayAlpha: config.overlayAlpha || 0.8
    };

    const container = this.createProgressContainer(scene, progressConfig, id);
    this.addToActiveProgress(scene, id, container);
    return id;
  }

  /**
   * Update progress percentage
   */
  public static updateProgress(scene: Phaser.Scene, id: string, progress: number): void {
    const container = this.getActiveProgress(scene, id);
    if (!container) return;

    const progressBar = container.getData('progressBar') as Phaser.GameObjects.Rectangle;
    const progressText = container.getData('progressText') as Phaser.GameObjects.Text;

    if (progressBar) {
      const maxWidth = this.CONFIG.PROGRESS_BAR_WIDTH;
      const newWidth = Math.max(0, Math.min(maxWidth, maxWidth * progress));
      progressBar.setSize(newWidth, this.CONFIG.PROGRESS_BAR_HEIGHT);
    }

    if (progressText) {
      const percentage = Math.round(progress * 100);
      progressText.setText(`${percentage}%`);
    }
  }

  /**
   * Hide a specific progress indicator
   */
  public static hideProgress(scene: Phaser.Scene, id: string): void {
    const container = this.getActiveProgress(scene, id);
    if (!container) return;

    this.hideProgressContainer(container);
    this.removeFromActiveProgress(scene, id);
  }

  /**
   * Hide all progress indicators for a scene
   */
  public static hideAllProgress(scene: Phaser.Scene): void {
    const sceneProgress = this.activeProgress.get(scene);
    if (!sceneProgress) return;

    sceneProgress.forEach((container, id) => {
      this.hideProgressContainer(container);
    });

    this.activeProgress.delete(scene);
  }

  /**
   * Check if any progress indicators are active for a scene
   */
  public static hasActiveProgress(scene: Phaser.Scene): boolean {
    const sceneProgress = this.activeProgress.get(scene);
    return sceneProgress ? sceneProgress.size > 0 : false;
  }

  /**
   * Create a progress container with the given configuration
   */
  private static createProgressContainer(scene: Phaser.Scene, config: ProgressConfig, id: string): Phaser.GameObjects.Container {
    const screenWidth = scene.cameras.main.width;
    const screenHeight = scene.cameras.main.height;

    // Create overlay
    const overlay = scene.add.rectangle(
      screenWidth / 2,
      screenHeight / 2,
      screenWidth,
      screenHeight,
      ColorTheme.BACKGROUND_OVERLAY,
      config.overlayAlpha || 0.8
    ).setOrigin(0.5).setScrollFactor(0).setDepth(this.CONFIG.OVERLAY_DEPTH);

    // Create progress container
    const container = scene.add.container(screenWidth / 2, screenHeight / 2);
    container.setScrollFactor(0).setDepth(this.CONFIG.CONTENT_DEPTH);

    // Message text
    const messageText = scene.add.text(0, -30, config.message || 'Loading...', {
      ...ColorTheme.getTextStyle('medium'),
      fontSize: this.CONFIG.MESSAGE_FONT_SIZE,
      align: 'center'
    }).setOrigin(0.5);

    // Create spinner if requested
    let spinner: Phaser.GameObjects.Graphics | null = null;
    if (config.showSpinner) {
      spinner = this.createSpinner(scene);
      spinner.setPosition(0, 20);
      container.add(spinner);
    }

    // Create progress bar if requested
    let progressBar: Phaser.GameObjects.Rectangle | null = null;
    let progressFill: Phaser.GameObjects.Rectangle | null = null;
    let progressText: Phaser.GameObjects.Text | null = null;

    if (config.showProgressBar) {
      // Progress bar background
      progressBar = scene.add.rectangle(
        0, 20,
        this.CONFIG.PROGRESS_BAR_WIDTH,
        this.CONFIG.PROGRESS_BAR_HEIGHT,
        ColorTheme.SECONDARY_DARK
      ).setOrigin(0.5);

      // Progress bar fill
      const progress = config.progress || 0;
      const fillWidth = this.CONFIG.PROGRESS_BAR_WIDTH * progress;
      progressFill = scene.add.rectangle(
        -this.CONFIG.PROGRESS_BAR_WIDTH / 2 + fillWidth / 2, 20,
        fillWidth,
        this.CONFIG.PROGRESS_BAR_HEIGHT,
        ColorTheme.SUCCESS
      ).setOrigin(0, 0.5);

      // Progress percentage text
      const percentage = Math.round(progress * 100);
      progressText = scene.add.text(0, 45, `${percentage}%`, {
        ...ColorTheme.getTextStyle('small'),
        fontSize: this.CONFIG.PROGRESS_FONT_SIZE,
        align: 'center'
      }).setOrigin(0.5);

      container.add([progressBar, progressFill, progressText]);
    }

    // Add all elements to container
    container.add([overlay, messageText]);

    // Store references for updates
    container.setData('id', id);
    container.setData('overlay', overlay);
    container.setData('messageText', messageText);
    container.setData('spinner', spinner);
    container.setData('progressBar', progressBar);
    container.setData('progressFill', progressFill);
    container.setData('progressText', progressText);

    // Animate appearance
    this.showProgressContainer(container);

    return container;
  }

  /**
   * Create a spinning loading indicator
   */
  private static createSpinner(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
    const spinner = scene.add.graphics();
    spinner.setDepth(this.CONFIG.SPINNER_DEPTH);

    // Create spinning circle
    spinner.lineStyle(3, ColorTheme.PRIMARY_BLUE_LIGHT, 0.8);
    spinner.beginPath();
    spinner.arc(0, 0, this.CONFIG.SPINNER_RADIUS, 0, Math.PI * 1.5);
    spinner.strokePath();

    // Animate the spinner
    scene.tweens.add({
      targets: spinner,
      rotation: Math.PI * 2,
      duration: 1000,
      repeat: -1,
      ease: 'Linear'
    });

    return spinner;
  }

  /**
   * Animate progress container appearance
   */
  private static showProgressContainer(container: Phaser.GameObjects.Container): void {
    container.setAlpha(0);
    container.scene.tweens.add({
      targets: container,
      alpha: 1,
      duration: this.CONFIG.ANIMATION_DURATION,
      ease: 'Power2'
    });
  }

  /**
   * Animate progress container disappearance and cleanup
   */
  private static hideProgressContainer(container: Phaser.GameObjects.Container): void {
    container.scene.tweens.add({
      targets: container,
      alpha: 0,
      duration: this.CONFIG.ANIMATION_DURATION,
      ease: 'Power2',
      onComplete: () => {
        container.destroy();
      }
    });
  }

  /**
   * Generate a unique ID for progress indicators
   */
  private static generateId(): string {
    return `progress_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add progress container to active progress tracking
   */
  private static addToActiveProgress(scene: Phaser.Scene, id: string, container: Phaser.GameObjects.Container): void {
    if (!this.activeProgress.has(scene)) {
      this.activeProgress.set(scene, new Map());
    }
    this.activeProgress.get(scene)!.set(id, container);
  }

  /**
   * Remove progress container from active progress tracking
   */
  private static removeFromActiveProgress(scene: Phaser.Scene, id: string): void {
    const sceneProgress = this.activeProgress.get(scene);
    if (sceneProgress) {
      sceneProgress.delete(id);
      if (sceneProgress.size === 0) {
        this.activeProgress.delete(scene);
      }
    }
  }

  /**
   * Get active progress container by ID
   */
  private static getActiveProgress(scene: Phaser.Scene, id: string): Phaser.GameObjects.Container | null {
    const sceneProgress = this.activeProgress.get(scene);
    return sceneProgress ? sceneProgress.get(id) || null : null;
  }

  /**
   * Clean up all progress indicators when scene is destroyed
   */
  public static cleanup(scene: Phaser.Scene): void {
    this.hideAllProgress(scene);
  }
}
