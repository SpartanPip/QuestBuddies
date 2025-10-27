import * as Phaser from 'phaser';
import { ColorTheme } from '../../utils/ColorTheme';
import { MenuButton } from '../MenuButton';

/**
 * Configuration interface for dialog creation
 */
export interface DialogConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  width?: number;
  height?: number;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}

/**
 * Configuration interface for error dialogs
 */
export interface ErrorDialogConfig {
  title?: string;
  message: string;
  buttonText?: string;
  onClose?: () => void;
}

/**
 * Reusable Dialog Manager for creating confirmation dialogs and error dialogs
 * 
 * Features:
 * - Standardized dialog appearance and behavior
 * - Confirmation dialogs with confirm/cancel options
 * - Error dialogs with single action
 * - Responsive design that adapts to screen size
 * - Consistent styling using ColorTheme
 * - Proper depth management and input blocking
 * - Smooth animations for show/hide
 * 
 * Usage:
 * ```typescript
 * // Confirmation dialog
 * DialogManager.showConfirmation(scene, {
 *   title: 'Delete Level',
 *   message: 'Are you sure you want to delete this level?',
 *   onConfirm: () => console.log('Confirmed'),
 *   onCancel: () => console.log('Cancelled')
 * });
 * 
 * // Error dialog
 * DialogManager.showError(scene, {
 *   message: 'Failed to save level. Please try again.',
 *   onClose: () => console.log('Error acknowledged')
 * });
 * ```
 */
export class DialogManager {
  private static readonly CONFIG = {
    DEFAULT_WIDTH: 400,
    DEFAULT_HEIGHT: 200,
    MIN_WIDTH: 300,
    MAX_WIDTH_RATIO: 0.8, // 80% of screen width
    MAX_HEIGHT_RATIO: 0.6, // 60% of screen height
    PADDING: 20,
    BUTTON_SPACING: 15,
    ANIMATION_DURATION: 300
  };

  private static activeDialogs: Map<Phaser.Scene, Phaser.GameObjects.Container> = new Map();

  /**
   * Show a confirmation dialog with confirm and cancel buttons
   */
  public static showConfirmation(scene: Phaser.Scene, config: DialogConfig): void {
    // Close any existing dialog for this scene
    this.closeDialog(scene);

    const dialog = this.createDialog(scene, config);
    this.activeDialogs.set(scene, dialog);
  }

  /**
   * Show an error dialog with a single close button
   */
  public static showError(scene: Phaser.Scene, config: ErrorDialogConfig): void {
    // Close any existing dialog for this scene
    this.closeDialog(scene);

    const dialogConfig: DialogConfig = {
      title: config.title || 'Error',
      message: config.message,
      confirmText: config.buttonText || 'OK',
      showCancel: false,
      onConfirm: config.onClose,
      onClose: config.onClose
    };

    const dialog = this.createDialog(scene, dialogConfig);
    this.activeDialogs.set(scene, dialog);
  }

  /**
   * Close any active dialog for the given scene
   */
  public static closeDialog(scene: Phaser.Scene): void {
    const existingDialog = this.activeDialogs.get(scene);
    if (existingDialog) {
      this.hideDialog(existingDialog);
      this.activeDialogs.delete(scene);
    }
  }

  /**
   * Check if a dialog is currently active for the given scene
   */
  public static isDialogActive(scene: Phaser.Scene): boolean {
    return this.activeDialogs.has(scene);
  }

  /**
   * Create a dialog with the given configuration
   */
  private static createDialog(scene: Phaser.Scene, config: DialogConfig): Phaser.GameObjects.Container {
    const screenWidth = scene.cameras.main.width;
    const screenHeight = scene.cameras.main.height;

    // Calculate responsive dimensions
    const maxWidth = screenWidth * this.CONFIG.MAX_WIDTH_RATIO;
    const maxHeight = screenHeight * this.CONFIG.MAX_HEIGHT_RATIO;
    const dialogWidth = Math.max(this.CONFIG.MIN_WIDTH, Math.min(config.width || this.CONFIG.DEFAULT_WIDTH, maxWidth));
    const dialogHeight = Math.min(config.height || this.CONFIG.DEFAULT_HEIGHT, maxHeight);

    // Create overlay
    const overlay = scene.add.rectangle(
      screenWidth / 2,
      screenHeight / 2,
      screenWidth,
      screenHeight,
      ColorTheme.BACKGROUND_OVERLAY,
      0.7
    ).setOrigin(0.5).setScrollFactor(0).setDepth(3000).setInteractive();

    // Block all pointer events from passing through the overlay
    overlay.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
    });

    overlay.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
    });

    // Create dialog container
    const dialogContainer = scene.add.container(screenWidth / 2, screenHeight / 2);
    dialogContainer.setScrollFactor(0).setDepth(3001);

    // Dialog background
    const background = scene.add.rectangle(
      0, 0,
      dialogWidth,
      dialogHeight,
      ColorTheme.SECONDARY_DARK,
      0.95
    );
    background.setStrokeStyle(3, ColorTheme.BORDER_SECONDARY);
    background.setInteractive();

    // Prevent clicks on dialog background from propagating
    background.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
    });

    // Title
    const titleText = scene.add.text(0, -dialogHeight / 2 + this.CONFIG.PADDING + 20, config.title, {
      ...ColorTheme.getTextStyle('medium'),
      fontSize: '20px',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5);

    // Message
    const messageText = scene.add.text(0, -dialogHeight / 2 + this.CONFIG.PADDING + 60, config.message, {
      ...ColorTheme.getTextStyle('small'),
      fontSize: '16px',
      wordWrap: { width: dialogWidth - (this.CONFIG.PADDING * 2) },
      align: 'center'
    }).setOrigin(0.5);

    // Buttons container
    const buttonsContainer = scene.add.container(0, dialogHeight / 2 - this.CONFIG.PADDING - 30);

    // Create buttons
    const buttons: MenuButton[] = [];
    
    if (config.showCancel !== false) {
      // Cancel button
      const cancelButton = new MenuButton(
        scene,
        -80, 0,
        config.cancelText || 'Cancel',
        () => {
          if (config.onCancel) config.onCancel();
          this.closeDialog(scene);
        },
        {
          ...ColorTheme.getButtonStyle('secondary'),
          width: 120,
          height: 40,
          fontSize: '16px'
        }
      );
      buttons.push(cancelButton);
      buttonsContainer.add(cancelButton.getContainer());
    }

    // Confirm button
    const confirmButton = new MenuButton(
      scene,
      config.showCancel === false ? 0 : 80, 0,
      config.confirmText || 'Confirm',
      () => {
        if (config.onConfirm) config.onConfirm();
        this.closeDialog(scene);
      },
      {
        ...ColorTheme.getButtonStyle('primary'),
        width: 120,
        height: 40,
        fontSize: '16px'
      }
    );
    buttons.push(confirmButton);
    buttonsContainer.add(confirmButton.getContainer());

    // Add all elements to dialog container
    dialogContainer.add([overlay, background, titleText, messageText, buttonsContainer]);

    // Store references for cleanup
    dialogContainer.setData('overlay', overlay);
    dialogContainer.setData('buttons', buttons);

    // Animate dialog appearance
    this.showDialog(dialogContainer);

    return dialogContainer;
  }

  /**
   * Animate dialog appearance
   */
  private static showDialog(dialog: Phaser.GameObjects.Container): void {
    // Start with dialog scaled down and transparent
    dialog.setScale(0.8);
    dialog.setAlpha(0);

    // Animate to full size and opacity
    dialog.scene.tweens.add({
      targets: dialog,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: this.CONFIG.ANIMATION_DURATION,
      ease: 'Back.easeOut'
    });
  }

  /**
   * Animate dialog disappearance and cleanup
   */
  private static hideDialog(dialog: Phaser.GameObjects.Container): void {
    dialog.scene.tweens.add({
      targets: dialog,
      scaleX: 0.8,
      scaleY: 0.8,
      alpha: 0,
      duration: this.CONFIG.ANIMATION_DURATION,
      ease: 'Back.easeIn',
      onComplete: () => {
        // Clean up buttons
        const buttons = dialog.getData('buttons') as MenuButton[];
        if (buttons) {
          buttons.forEach(button => button.destroy());
        }

        // Destroy dialog and all its children
        dialog.destroy();
      }
    });
  }

  /**
   * Clean up all dialogs when scene is destroyed
   */
  public static cleanup(scene: Phaser.Scene): void {
    this.closeDialog(scene);
  }
}
