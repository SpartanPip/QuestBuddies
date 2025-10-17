import * as Phaser from 'phaser';
import { ColorTheme } from '../utils/ColorTheme';

export interface OptionElementData {
  id: string;
  sprite: string;
  label: string;
  data?: unknown;
}

export class OptionElement extends Phaser.GameObjects.Container {
  private static readonly CONFIG = {
    WIDTH: 100,
    HEIGHT: 80,
    IMAGE_SIZE: 32,
    FONT_SIZE: '10px',
    PADDING: 4
  };

  private background: Phaser.GameObjects.Rectangle;
  private image: Phaser.GameObjects.Image;
  private label: Phaser.GameObjects.Text;
  private optionData: OptionElementData;
  private onSelectCallback?: (data: OptionElementData) => void;

  constructor(scene: Phaser.Scene, x: number, y: number, data: OptionElementData) {
    super(scene, x, y);
    
    console.log('🎨 OptionElement Constructor:', {
      x, y,
      data: { id: data.id, sprite: data.sprite, label: data.label },
      spriteExists: scene.textures.exists(data.sprite),
      sceneTextures: scene.textures.list
    });
    
    this.optionData = data;
    this.createElements();
    this.setupInteractions();
    
    scene.add.existing(this);
    
    console.log('✅ OptionElement created and added to scene:', {
      finalPosition: { x: this.x, y: this.y },
      visible: this.visible,
      alpha: this.alpha,
      scale: { x: this.scaleX, y: this.scaleY }
    });
  }

  private createElements(): void {
    console.log('🏗️ Creating OptionElement components for:', this.optionData.sprite);
    
    // Background
    this.background = this.scene.add.rectangle(
      0, 0, 
      OptionElement.CONFIG.WIDTH, 
      OptionElement.CONFIG.HEIGHT, 
      0x444444, 0.3
    );
    this.background.setStrokeStyle(2, ColorTheme.BORDER_PRIMARY);
    this.add(this.background);
    
    console.log('📦 Background created:', {
      width: OptionElement.CONFIG.WIDTH,
      height: OptionElement.CONFIG.HEIGHT,
      color: '0x444444',
      alpha: 0.3
    });

    // Image
    console.log('🖼️ Creating image with sprite:', this.optionData.sprite);
    this.image = this.scene.add.image(0, -10, this.optionData.sprite);
    this.image.setDisplaySize(OptionElement.CONFIG.IMAGE_SIZE, OptionElement.CONFIG.IMAGE_SIZE);
    this.add(this.image);
    
    console.log('🖼️ Image created:', {
      sprite: this.optionData.sprite,
      displaySize: OptionElement.CONFIG.IMAGE_SIZE,
      textureExists: this.image.texture,
      imageVisible: this.image.visible,
      imageAlpha: this.image.alpha
    });

    // Label
    this.label = this.scene.add.text(0, 20, this.optionData.label, {
      ...ColorTheme.getTextStyle('small'),
      fontSize: OptionElement.CONFIG.FONT_SIZE
    }).setOrigin(0.5);
    this.add(this.label);
    
    console.log('📝 Label created:', {
      text: this.optionData.label,
      fontSize: OptionElement.CONFIG.FONT_SIZE,
      visible: this.label.visible,
      alpha: this.label.alpha
    });
    
    console.log('🏁 OptionElement components created. Total children:', this.list.length);
  }

  private setupInteractions(): void {
    // Make the entire container interactive instead of just the background
    this.setInteractive(
      new Phaser.Geom.Rectangle(
        -OptionElement.CONFIG.WIDTH / 2,
        -OptionElement.CONFIG.HEIGHT / 2,
        OptionElement.CONFIG.WIDTH,
        OptionElement.CONFIG.HEIGHT
      ),
      Phaser.Geom.Rectangle.Contains
    );

    // Click handler
    this.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Stop the event from propagating to parent containers
      pointer.event.stopPropagation();
      
      if (this.onSelectCallback) {
        this.onSelectCallback(this.optionData);
      }
    });

    // Handle wheel events by passing them through to parent
    this.on('wheel', (_pointer: Phaser.Input.Pointer, _deltaX: number, deltaY: number) => {
      // Don't stop propagation - let the wheel event bubble up to ScrollableGrid
      console.log('🖱️ OptionElement: Wheel event passed through', { deltaY });
    });

    // Hover effects
    this.on('pointerover', () => {
      this.background.setStrokeStyle(3, ColorTheme.SUCCESS);
      this.background.setAlpha(0.8);
    });

    this.on('pointerout', () => {
      this.background.setStrokeStyle(2, ColorTheme.BORDER_PRIMARY);
      this.background.setAlpha(1);
    });
  }

  public onSelect(callback: (data: OptionElementData) => void): void {
    this.onSelectCallback = callback;
  }

  public static getSize(): { width: number; height: number } {
    return {
      width: OptionElement.CONFIG.WIDTH,
      height: OptionElement.CONFIG.HEIGHT
    };
  }
}