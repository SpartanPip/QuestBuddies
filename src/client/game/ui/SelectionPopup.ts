import * as Phaser from 'phaser';
import { ColorTheme } from '../utils/ColorTheme';
import { ScrollableGrid } from './ScrollableGrid';
import { OptionElementData } from './OptionElement';

export interface PopupConfig {
  width?: number;
  height?: number;
  title: string;
}

export class SelectionPopup extends Phaser.GameObjects.Container {
  private static readonly CONFIG = {
    DEFAULT_WIDTH: 450,
    DEFAULT_HEIGHT: 500,
    TITLE_HEIGHT: 60,
    CANCEL_HEIGHT: 60,
    SIDE_MARGIN: 30,
    MIN_WIDTH: 350,
    MAX_WIDTH_RATIO: 0.9 // 90% of screen width
  };

  private config: Required<PopupConfig>;
  private overlay: Phaser.GameObjects.Rectangle;
  private background: Phaser.GameObjects.Rectangle;
  private titleText: Phaser.GameObjects.Text;
  private cancelButton: Phaser.GameObjects.Text;
  private scrollableGrid: ScrollableGrid;
  
  private onSelectCallback?: (data: OptionElementData) => void;
  private onCancelCallback?: () => void;
  private onCloseCallback?: () => void;

  constructor(scene: Phaser.Scene, config: PopupConfig) {
    super(scene, scene.cameras.main.centerX, scene.cameras.main.centerY);
    
    // Calculate responsive dimensions
    const screenWidth = scene.cameras.main.width;
    const screenHeight = scene.cameras.main.height;
    
    const maxWidth = screenWidth * SelectionPopup.CONFIG.MAX_WIDTH_RATIO;
    const defaultWidth = Math.min(SelectionPopup.CONFIG.DEFAULT_WIDTH, maxWidth);
    const finalWidth = Math.max(SelectionPopup.CONFIG.MIN_WIDTH, defaultWidth);
    
    const maxHeight = screenHeight * 0.8; // 80% of screen height
    const finalHeight = Math.min(SelectionPopup.CONFIG.DEFAULT_HEIGHT, maxHeight);
    
    this.config = {
      width: config.width || finalWidth,
      height: config.height || finalHeight,
      title: config.title
    };

    this.createPopupStructure();
    this.setupInteractions();
    
    scene.add.existing(this);
  }

  private createPopupStructure(): void {
    // Create overlay
    this.overlay = this.scene.add.rectangle(
      0, 0,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height,
      0x000000,
      0.7
    ).setOrigin(0.5).setScrollFactor(0).setDepth(3000).setInteractive();

    // Background
    this.background = this.scene.add.rectangle(
      0, 0,
      this.config.width,
      this.config.height,
      ColorTheme.SECONDARY_DARK,
      0.95
    );
    this.background.setStrokeStyle(3, ColorTheme.BORDER_SECONDARY);
    this.background.setInteractive();
    this.add(this.background);

    // Title
    this.titleText = this.scene.add.text(
      0, 
      -this.config.height / 2 + 40, 
      this.config.title, 
      {
        ...ColorTheme.getTextStyle('medium'),
        fontSize: '20px',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);
    this.add(this.titleText);

    // Cancel button
    this.cancelButton = this.scene.add.text(
      0, 
      this.config.height / 2 - 30, 
      'Cancel', 
      {
        ...ColorTheme.getTextStyle('small'),
        fontSize: '16px',
        backgroundColor: `#${ColorTheme.BUTTON_SECONDARY_HOVER.toString(16).padStart(6, '0')}`,
        padding: { x: 20, y: 10 }
      }
    ).setOrigin(0.5).setInteractive();
    this.add(this.cancelButton);

    // Create scrollable grid in the middle area
    const gridWidth = this.config.width - (2 * SelectionPopup.CONFIG.SIDE_MARGIN);
    const gridHeight = this.config.height - SelectionPopup.CONFIG.TITLE_HEIGHT - SelectionPopup.CONFIG.CANCEL_HEIGHT;
    
    // Calculate the center of available space between title and cancel button
    const titleBottom = -this.config.height / 2 + SelectionPopup.CONFIG.TITLE_HEIGHT;
    const cancelTop = this.config.height / 2 - SelectionPopup.CONFIG.CANCEL_HEIGHT;
    const availableCenter = (titleBottom + cancelTop) / 2;

    // Position ScrollableGrid in the center of available space
    this.scrollableGrid = new ScrollableGrid(this.scene, 0, availableCenter, gridWidth, gridHeight);
    this.add(this.scrollableGrid);

    // Set proper depths
    this.setScrollFactor(0);
    this.setDepth(3001);
  }

  private setupInteractions(): void {
    // Block clicks from passing through overlay
    this.overlay.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
    });

    // Block clicks on background
    this.background.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
    });

    // Cancel button
    this.cancelButton.on('pointerdown', () => {
      if (this.onCancelCallback) {
        this.onCancelCallback();
      }
      this.close();
    });

    // Cancel button hover effects
    this.cancelButton.on('pointerover', () => {
      this.cancelButton.setStyle({
        backgroundColor: `#${ColorTheme.SECONDARY_LIGHT.toString(16).padStart(6, '0')}`
      });
    });

    this.cancelButton.on('pointerout', () => {
      this.cancelButton.setStyle({
        backgroundColor: `#${ColorTheme.BUTTON_SECONDARY_HOVER.toString(16).padStart(6, '0')}`
      });
    });

    // Grid selection
    this.scrollableGrid.onSelect((data) => {
      if (this.onSelectCallback) {
        this.onSelectCallback(data);
      }
      this.close();
    });

    // Enable scrolling
    this.scrollableGrid.enableScrolling(this.overlay);
  }

  public setOptions(options: OptionElementData[]): void {
    this.scrollableGrid.setOptions(options);
  }

  public onSelect(callback: (data: OptionElementData) => void): SelectionPopup {
    this.onSelectCallback = callback;
    return this;
  }

  public onCancel(callback: () => void): SelectionPopup {
    this.onCancelCallback = callback;
    return this;
  }

  public onClose(callback: () => void): SelectionPopup {
    this.onCloseCallback = callback;
    return this;
  }

  public show(): void {
    this.setVisible(true);
  }

  public close(): void {
    if (this.onCloseCallback) {
      this.onCloseCallback();
    }
    
    this.overlay.destroy();
    this.destroy();
  }

  public static create(scene: Phaser.Scene, config: PopupConfig): SelectionPopup {
    return new SelectionPopup(scene, config);
  }
}