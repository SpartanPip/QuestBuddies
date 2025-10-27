import { Scene } from 'phaser';
import { ColorTheme } from '../../utils/ColorTheme';

export interface LevelBuilderUICallbacks {
  onBackClick: () => void;
  onStageButtonClick: () => void;
  onNextButtonClick: () => void;
  onClearButtonClick: () => void;
}

export interface StageInfo {
  currentStage: 'tiles' | 'enemies' | 'spawn';
  stageColor: number;
  stageLabel: string;
  instructionsText: string;
  nextButtonColor: number;
  nextButtonLabel: string;
}

export class LevelBuilderUI {
  private scene: Scene;
  private uiCamera: Phaser.Cameras.Scene2D.Camera;
  private callbacks: LevelBuilderUICallbacks;
  
  // UI Elements
  private header: Phaser.GameObjects.Container | null = null;
  private footer: Phaser.GameObjects.Container | null = null;
  private instructions: Phaser.GameObjects.Text | null = null;
  private dialogOpen: boolean = false;

  constructor(scene: Scene, uiCamera: Phaser.Cameras.Scene2D.Camera, callbacks: LevelBuilderUICallbacks) {
    this.scene = scene;
    this.uiCamera = uiCamera;
    this.callbacks = callbacks;
  }

  /**
   * Creates the main UI elements for the level builder
   */
  createUI(): void {
    this.createHeader();
    this.createSaveToolbar();
  }

  /**
   * Creates the header with back button and stage button
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

    // Calculate available space and button dimensions
    const availableWidth = this.uiCamera.width - 40; // 20px margin on each side
    const buttonHeight = 40;
    const backButtonWidth = 50; // Smaller for just arrow
    const stageButtonWidth = 120; // Fixed width for stage button

    // Back button (positioned on the left)
    const backButton = this.scene.add.rectangle(-availableWidth / 2 + backButtonWidth / 2 + 20, 0, backButtonWidth, buttonHeight, ColorTheme.BUTTON_SECONDARY)
      .setInteractive()
      .setStrokeStyle(2, ColorTheme.BORDER_PRIMARY)
      .setName('header_back_button');

    const backLabel = this.scene.add.text(-availableWidth / 2 + backButtonWidth / 2 + 20, 0, '←', {
      ...ColorTheme.getTextStyle('small'),
      fontSize: '18px',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    backButton.on('pointerdown', () => {
      this.callbacks.onBackClick();
    });

    backButton.on('pointerover', () => backButton.setStrokeStyle(3, ColorTheme.SUCCESS));
    backButton.on('pointerout', () => backButton.setStrokeStyle(2, ColorTheme.BORDER_PRIMARY));

    // Current stage button (positioned on the right) - will be updated dynamically
    const stageButton = this.scene.add.rectangle(availableWidth / 2 - stageButtonWidth / 2 - 20, 0, stageButtonWidth, buttonHeight, 0x4444AA)
      .setInteractive()
      .setStrokeStyle(2, ColorTheme.BORDER_PRIMARY)
      .setName('header_stage_button');

    const stageLabel = this.scene.add.text(availableWidth / 2 - stageButtonWidth / 2 - 20, 0, 'Tiles', {
      ...ColorTheme.getTextStyle('small'),
      fontSize: '14px'
    }).setOrigin(0.5);

    stageButton.on('pointerdown', () => {
      this.callbacks.onStageButtonClick();
    });
    stageButton.on('pointerover', () => stageButton.setStrokeStyle(3, ColorTheme.SUCCESS));
    stageButton.on('pointerout', () => stageButton.setStrokeStyle(2, ColorTheme.BORDER_PRIMARY));

    // Add buttons to header
    this.header.add([backButton, backLabel, stageButton, stageLabel]);

    // Instructions text positioned below header using screen coordinates
    this.instructions = this.scene.add.text(20, headerHeight + 20, 'WASD: Move Camera\nClick: Place/Remove Tiles\nScroll: Zoom', {
      ...ColorTheme.getTextStyle('small', 'secondary'),
      fontSize: '12px'
    });
    this.instructions.setScrollFactor(0, 0);
    this.instructions.setDepth(1001);
    this.instructions.setName('instructions');

    this.header.setScrollFactor(0, 0);
    this.header.setDepth(1001);

    // Ensure all buttons in header have higher depth
    this.header.list.forEach(child => {
      if (child && 'setDepth' in child) {
        (child as Phaser.GameObjects.GameObject & { setDepth: (depth: number) => void }).setDepth(1002);
      }
    });
  }

  /**
   * Creates the footer toolbar with Next/Post and Clear buttons
   */
  private createSaveToolbar(): void {
    // Create footer background using screen coordinates
    const footerHeight = 60;
    const footerY = this.uiCamera.height - footerHeight;

    const footerBackground = this.scene.add.rectangle(
      this.uiCamera.width / 2,
      footerY + footerHeight / 2,
      this.uiCamera.width,
      footerHeight,
      ColorTheme.BACKGROUND_OVERLAY,
      0.9
    );
    footerBackground.setStrokeStyle(2, ColorTheme.BORDER_PRIMARY);
    footerBackground.setScrollFactor(0, 0);
    footerBackground.setDepth(1000);
    footerBackground.setName('footer_background');

    // Create container centered at bottom using screen coordinates
    this.footer = this.scene.add.container(this.uiCamera.width / 2, footerY + footerHeight / 2);
    this.footer.setName('footer');

    // Next/Post button
    const nextButton = this.scene.add.rectangle(-65, 0, 120, 40, ColorTheme.BUTTON_PRIMARY)
      .setInteractive()
      .setStrokeStyle(2, ColorTheme.BORDER_PRIMARY)
      .setName('footer_next_button');

    const nextLabel = this.scene.add.text(-65, 0, 'Next', {
      ...ColorTheme.getTextStyle('small'),
      fontSize: '14px'
    }).setOrigin(0.5);

    nextButton.on('pointerdown', () => this.callbacks.onNextButtonClick());
    nextButton.on('pointerover', () => nextButton.setStrokeStyle(3, ColorTheme.SUCCESS));
    nextButton.on('pointerout', () => nextButton.setStrokeStyle(2, ColorTheme.BORDER_PRIMARY));

    // Clear Level button
    const clearButton = this.scene.add.rectangle(65, 0, 120, 40, ColorTheme.ERROR)
      .setInteractive()
      .setStrokeStyle(2, ColorTheme.BORDER_PRIMARY)
      .setName('footer_clear_button');

    const clearLabel = this.scene.add.text(65, 0, 'Clear Level', {
      ...ColorTheme.getTextStyle('small'),
      fontSize: '14px'
    }).setOrigin(0.5);

    clearButton.on('pointerdown', () => this.callbacks.onClearButtonClick());
    clearButton.on('pointerover', () => clearButton.setStrokeStyle(3, ColorTheme.SUCCESS));
    clearButton.on('pointerout', () => clearButton.setStrokeStyle(2, ColorTheme.BORDER_PRIMARY));

    this.footer.add([nextButton, nextLabel, clearButton, clearLabel]);
    this.footer.setScrollFactor(0, 0);
    this.footer.setDepth(1001);

    // Ensure all buttons in footer have higher depth
    this.footer.list.forEach(child => {
      if (child && 'setDepth' in child) {
        (child as Phaser.GameObjects.GameObject & { setDepth: (depth: number) => void }).setDepth(1002);
      }
    });
  }

  /**
   * Updates the stage display based on current stage
   */
  updateStageDisplay(stageInfo: StageInfo): void {
    // Update header stage button
    if (this.header && this.header.list) {
      // Find the stage button (should be the 3rd element, index 2)
      const stageButton = this.header.list[2] as Phaser.GameObjects.Rectangle;
      const stageLabel = this.header.list[3] as Phaser.GameObjects.Text;
      
      if (stageButton && stageLabel) {
        stageButton.setFillStyle(stageInfo.stageColor);
        stageLabel.setText(stageInfo.stageLabel);
      }
    }

    // Update instructions
    if (this.instructions) {
      this.instructions.setText(stageInfo.instructionsText);
    }

    // Update footer next button
    if (this.footer && this.footer.list) {
      // Find the next button (should be the 1st element, index 0)
      const nextButton = this.footer.list[0] as Phaser.GameObjects.Rectangle;
      const nextLabel = this.footer.list[1] as Phaser.GameObjects.Text;
      
      if (nextButton && nextLabel) {
        nextButton.setFillStyle(stageInfo.nextButtonColor);
        nextLabel.setText(stageInfo.nextButtonLabel);
      }
    }
  }

  /**
   * Shows a temporary message to the user
   */
  showMessage(text: string, color: number, duration: number = 3000): void {
    // Create message container using screen coordinates
    const messageContainer = this.scene.add.container(this.uiCamera.width / 2, 100);
    messageContainer.setScrollFactor(0, 0).setDepth(2000);

    // Message background
    const background = this.scene.add.rectangle(0, 0, 0, 50, color, 0.9);
    background.setStrokeStyle(2, ColorTheme.BORDER_PRIMARY);

    // Message text
    const messageText = this.scene.add.text(0, 0, text, {
      fontSize: '16px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      wordWrap: { width: 400 },
      align: 'center'
    }).setOrigin(0.5);

    // Adjust background size to fit text
    background.setSize(messageText.width + 20, 50);

    messageContainer.add([background, messageText]);

    // Slide in animation
    messageContainer.setY(50);
    this.scene.tweens.add({
      targets: messageContainer,
      y: 100,
      duration: 300,
      ease: 'Back.easeOut'
    });

    // Auto-remove message after specified duration
    this.scene.time.delayedCall(duration, () => {
      if (messageContainer && messageContainer.active) {
        this.scene.tweens.add({
          targets: messageContainer,
          y: 50,
          alpha: 0,
          duration: 300,
          ease: 'Power2.easeIn',
          onComplete: () => messageContainer.destroy()
        });
      }
    });
  }

  /**
   * Shows a progress message with progress bar
   */
  showProgressMessage(text: string, progress: number = 0): Phaser.GameObjects.Container {
    // Create progress message container using screen coordinates
    const container = this.scene.add.container(this.uiCamera.width / 2, 150);
    container.setScrollFactor(0, 0).setDepth(2000);

    // Background
    const background = this.scene.add.rectangle(0, 0, 300, 80, ColorTheme.BACKGROUND_OVERLAY, 0.9);
    background.setStrokeStyle(2, ColorTheme.BUTTON_PRIMARY);

    // Message text
    const messageText = this.scene.add.text(0, -15, text, {
      fontSize: '16px',
      color: '#FFFFFF',
      align: 'center'
    }).setOrigin(0.5);

    // Progress bar background
    const progressBg = this.scene.add.rectangle(0, 15, 200, 8, 0x333333);

    // Progress bar fill
    const progressFill = this.scene.add.rectangle(-100, 15, progress * 2, 8, 0x4444AA);
    progressFill.setOrigin(0, 0.5);

    container.add([background, messageText, progressBg, progressFill]);
    container.setData('progressFill', progressFill);
    container.setData('messageText', messageText);

    return container;
  }

  /**
   * Updates a progress message
   */
  updateProgressMessage(container: Phaser.GameObjects.Container, text: string, progress: number): void {
    const progressFill = container.getData('progressFill') as Phaser.GameObjects.Rectangle;
    const messageText = container.getData('messageText') as Phaser.GameObjects.Text;

    if (progressFill && messageText) {
      messageText.setText(text);
      this.scene.tweens.add({
        targets: progressFill,
        width: progress * 2,
        duration: 200,
        ease: 'Power2'
      });
    }
  }

  /**
   * Shows a confirmation dialog
   */
  showConfirmationDialog(title: string, message: string, onConfirm: () => void): void {
    // Set dialog flag
    this.dialogOpen = true;

    // Create overlay that blocks all clicks using screen coordinates
    const overlay = this.scene.add.rectangle(
      this.uiCamera.width / 2,
      this.uiCamera.height / 2,
      this.uiCamera.width,
      this.uiCamera.height,
      0x000000,
      0.7
    ).setOrigin(0.5).setScrollFactor(0, 0).setDepth(3000).setInteractive();

    // Block all pointer events from passing through the overlay
    overlay.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
    });

    overlay.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
    });

    // Dialog container using screen coordinates
    const dialogContainer = this.scene.add.container(this.uiCamera.width / 2, this.uiCamera.height / 2);
    dialogContainer.setScrollFactor(0, 0).setDepth(3001);

    // Dialog background - make interactive to capture clicks
    const background = this.scene.add.rectangle(0, 0, 400, 180, ColorTheme.SECONDARY_DARK, 0.95);
    background.setStrokeStyle(3, ColorTheme.BORDER_SECONDARY);
    background.setInteractive();

    // Prevent clicks on dialog background from propagating
    background.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
    });

    // Title
    const titleText = this.scene.add.text(0, -50, title, {
      ...ColorTheme.getTextStyle('medium'),
      fontSize: '20px',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Message
    const messageText = this.scene.add.text(0, -10, message, {
      ...ColorTheme.getTextStyle('small'),
      fontSize: '14px',
      wordWrap: { width: 350 },
      align: 'center'
    }).setOrigin(0.5);

    // Confirm button
    const confirmButton = this.scene.add.text(-60, 40, 'Confirm', {
      ...ColorTheme.getTextStyle('small'),
      fontSize: '16px',
      backgroundColor: `#${ColorTheme.ERROR.toString(16).padStart(6, '0')}`,
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive().setName('dialog_confirm_button');

    // Cancel button
    const cancelButton = this.scene.add.text(60, 40, 'Cancel', {
      ...ColorTheme.getTextStyle('small'),
      fontSize: '16px',
      backgroundColor: `#${ColorTheme.BUTTON_SECONDARY_HOVER.toString(16).padStart(6, '0')}`,
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive().setName('dialog_cancel_button');

    dialogContainer.add([background, titleText, messageText, confirmButton, cancelButton]);

    // Button interactions
    confirmButton.on('pointerdown', () => {
      this.dialogOpen = false;
      overlay.destroy();
      dialogContainer.destroy();
      onConfirm();
    });

    cancelButton.on('pointerdown', () => {
      this.dialogOpen = false;
      overlay.destroy();
      dialogContainer.destroy();
    });

    // Hover effects
    confirmButton.on('pointerover', () => confirmButton.setStyle({
      backgroundColor: `#${(ColorTheme.ERROR | 0x222222).toString(16).padStart(6, '0')}`
    }));
    confirmButton.on('pointerout', () => confirmButton.setStyle({
      backgroundColor: `#${ColorTheme.ERROR.toString(16).padStart(6, '0')}`
    }));
    cancelButton.on('pointerover', () => cancelButton.setStyle({
      backgroundColor: `#${ColorTheme.SECONDARY_LIGHT.toString(16).padStart(6, '0')}`
    }));
    cancelButton.on('pointerout', () => cancelButton.setStyle({
      backgroundColor: `#${ColorTheme.BUTTON_SECONDARY_HOVER.toString(16).padStart(6, '0')}`
    }));
  }

  /**
   * Shows a retryable error dialog
   */
  showRetryableError(title: string, details: string, retryCallback: () => void): void {
    // Create error overlay using screen coordinates
    const overlay = this.scene.add.rectangle(
      this.uiCamera.width / 2,
      this.uiCamera.height / 2,
      this.uiCamera.width,
      this.uiCamera.height,
      0x000000,
      0.8
    ).setOrigin(0.5).setScrollFactor(0, 0).setDepth(3000);

    // Error container using screen coordinates
    const errorContainer = this.scene.add.container(this.uiCamera.width / 2, this.uiCamera.height / 2);
    errorContainer.setScrollFactor(0, 0).setDepth(3001);

    // Error background
    const background = this.scene.add.rectangle(0, 0, 400, 200, ColorTheme.ERROR, 0.9);
    background.setStrokeStyle(3, ColorTheme.ERROR);

    // Error title
    const titleText = this.scene.add.text(0, -60, title, {
      ...ColorTheme.getTextStyle('medium'),
      fontSize: '20px',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Error details
    const detailsText = this.scene.add.text(0, -20, details, {
      ...ColorTheme.getTextStyle('small'),
      fontSize: '14px',
      wordWrap: { width: 350 },
      align: 'center'
    }).setOrigin(0.5);

    // Retry button
    const retryButton = this.scene.add.text(-60, 40, 'Retry', {
      ...ColorTheme.getTextStyle('small'),
      fontSize: '16px',
      backgroundColor: `#${ColorTheme.BUTTON_SECONDARY.toString(16).padStart(6, '0')}`,
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();

    // Cancel button
    const cancelButton = this.scene.add.text(60, 40, 'Cancel', {
      ...ColorTheme.getTextStyle('small'),
      fontSize: '16px',
      backgroundColor: `#${ColorTheme.BUTTON_SECONDARY_HOVER.toString(16).padStart(6, '0')}`,
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();

    errorContainer.add([background, titleText, detailsText, retryButton, cancelButton]);

    // Button interactions
    retryButton.on('pointerdown', () => {
      overlay.destroy();
      errorContainer.destroy();
      retryCallback();
    });

    cancelButton.on('pointerdown', () => {
      overlay.destroy();
      errorContainer.destroy();
    });

    // Hover effects
    retryButton.on('pointerover', () => retryButton.setStyle({
      backgroundColor: `#${ColorTheme.BUTTON_SECONDARY_HOVER.toString(16).padStart(6, '0')}`
    }));
    retryButton.on('pointerout', () => retryButton.setStyle({
      backgroundColor: `#${ColorTheme.BUTTON_SECONDARY.toString(16).padStart(6, '0')}`
    }));
    cancelButton.on('pointerover', () => cancelButton.setStyle({
      backgroundColor: `#${ColorTheme.SECONDARY_LIGHT.toString(16).padStart(6, '0')}`
    }));
    cancelButton.on('pointerout', () => cancelButton.setStyle({
      backgroundColor: `#${ColorTheme.BUTTON_SECONDARY_HOVER.toString(16).padStart(6, '0')}`
    }));
  }

  /**
   * Checks if a dialog is currently open
   */
  isDialogOpen(): boolean {
    return this.dialogOpen;
  }

  /**
   * Destroys all UI elements
   */
  destroy(): void {
    if (this.header) {
      this.header.destroy();
      this.header = null;
    }
    if (this.footer) {
      this.footer.destroy();
      this.footer = null;
    }
    if (this.instructions) {
      this.instructions.destroy();
      this.instructions = null;
    }
  }
}
