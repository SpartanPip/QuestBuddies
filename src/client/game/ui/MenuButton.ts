import * as Phaser from 'phaser';
import { ColorTheme } from '../utils/ColorTheme';

/**
 * Configuration interface for MenuButton styling
 */
export interface ButtonStyle {
  width?: number;
  height?: number;
  backgroundColor?: number;
  borderColor?: number;
  borderWidth?: number;
  textColor?: string;
  fontSize?: string;
  fontFamily?: string;
  hoverBackgroundColor?: number;
  disabledBackgroundColor?: number;
  disabledTextColor?: string;
}

/**
 * Reusable menu button component for Phaser games
 * 
 * Features:
 * - Container-based button with background and text
 * - Customizable styling and colors
 * - Hover effects with scale and color changes
 * - Enable/disable functionality with visual feedback
 * - Click handling with callback support
 * - Responsive design support
 * 
 * Usage:
 * ```typescript
 * const button = new MenuButton(
 *   scene,
 *   x, y,
 *   'Button Text',
 *   () => console.log('Clicked!'),
 *   { width: 200, backgroundColor: 0x4a4a4a }
 * );
 * ```
 */
export class MenuButton {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Rectangle;
  private text: Phaser.GameObjects.Text;
  private callback: () => void;
  private enabled: boolean = true;
  private style: ButtonStyle;
  private focused: boolean = false;
  private keyboardKey: string | undefined;
  
  private defaultStyle: ButtonStyle = {
    width: 200,
    height: 60,
    backgroundColor: ColorTheme.BUTTON_PRIMARY,
    borderColor: ColorTheme.BORDER_PRIMARY,
    borderWidth: 2,
    textColor: ColorTheme.TEXT_PRIMARY,
    fontSize: '24px',
    fontFamily: 'Arial Black',
    hoverBackgroundColor: ColorTheme.BUTTON_PRIMARY_HOVER,
    disabledBackgroundColor: ColorTheme.BUTTON_DISABLED,
    disabledTextColor: ColorTheme.TEXT_DISABLED
  };

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    callback: () => void,
    style?: Partial<ButtonStyle>,
    keyboardKey?: string
  ) {
    this.scene = scene;
    this.callback = callback;
    this.style = { ...this.defaultStyle, ...style };
    this.keyboardKey = keyboardKey;
    
    this.createButton(x, y, text);
    this.setupInteractivity();
    this.updateVisualState();
    this.setupKeyboardSupport();
  }

  private createButton(x: number, y: number, text: string): void {
    // Create container for the button
    this.container = this.scene.add.container(x, y);
    
    // Create background rectangle
    this.background = this.scene.add.rectangle(
      0, 0,
      this.style.width!,
      this.style.height!,
      this.style.backgroundColor
    );
    
    // Add border
    this.background.setStrokeStyle(this.style.borderWidth!, this.style.borderColor);
    
    // Create text with dynamic sizing
    const optimalFontSize = this.calculateOptimalFontSize(text, this.style.width!, this.style.height!);
    this.text = this.scene.add.text(0, 0, text, {
      fontSize: `${optimalFontSize}px`,
      color: this.style.textColor!,
      fontFamily: this.style.fontFamily!,
      stroke: '#000000',
      strokeThickness: Math.max(1, Math.floor(optimalFontSize * 0.08)),
      align: 'center'
    });
    this.text.setOrigin(0.5, 0.5);
    
    // Add to container
    this.container.add([this.background, this.text]);
  }

  private setupInteractivity(): void {
    // Make the container interactive with larger touch targets for mobile
    const touchPadding = 10;
    this.container.setSize(
      this.style.width! + touchPadding * 2, 
      this.style.height! + touchPadding * 2
    );
    this.container.setInteractive();
    
    // Hover effects with smooth animations
    this.container.on('pointerover', () => {
      if (this.enabled) {
        this.background.setFillStyle(this.style.hoverBackgroundColor!);
        this.scene.tweens.add({
          targets: this.container,
          scaleX: 1.05,
          scaleY: 1.05,
          duration: 150,
          ease: 'Power2'
        });
      }
    });
    
    this.container.on('pointerout', () => {
      if (this.enabled) {
        this.background.setFillStyle(this.style.backgroundColor!);
        this.scene.tweens.add({
          targets: this.container,
          scaleX: 1.0,
          scaleY: 1.0,
          duration: 150,
          ease: 'Power2'
        });
      }
    });
    
    // Click handling with feedback animation
    this.container.on('pointerdown', () => {
      if (this.enabled) {
        this.scene.tweens.add({
          targets: this.container,
          scaleX: 0.95,
          scaleY: 0.95,
          duration: 100,
          ease: 'Power2'
        });
      }
    });
    
    this.container.on('pointerup', () => {
      if (this.enabled) {
        this.scene.tweens.add({
          targets: this.container,
          scaleX: 1.05,
          scaleY: 1.05,
          duration: 100,
          ease: 'Power2',
          onComplete: () => {
            this.callback();
          }
        });
      }
    });
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.updateVisualState();
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setText(newText: string): void {
    this.text.setText(newText);
    
    // Recalculate optimal font size for new text
    const optimalFontSize = this.calculateOptimalFontSize(newText, this.style.width!, this.style.height!);
    this.text.setStyle({
      fontSize: `${optimalFontSize}px`,
      color: this.enabled ? this.style.textColor! : this.style.disabledTextColor!,
      fontFamily: this.style.fontFamily!,
      stroke: '#000000',
      strokeThickness: Math.max(1, Math.floor(optimalFontSize * 0.08))
    });
  }

  public setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  public setScale(scale: number): void {
    this.container.setScale(scale);
  }

  private calculateOptimalFontSize(text: string, buttonWidth: number, buttonHeight: number): number {
    // If fontSize is explicitly set in style, use it as a base but still optimize
    const baseFontSize = this.style.fontSize ? parseInt(this.style.fontSize) : 24;
    
    // Create a temporary text object to measure dimensions
    const tempText = this.scene.add.text(0, 0, text, {
      fontSize: `${baseFontSize}px`,
      fontFamily: this.style.fontFamily!
    });
    
    // Calculate available space (leave padding for borders and visual breathing room)
    const padding = Math.max(8, buttonWidth * 0.1);
    const availableWidth = buttonWidth - (padding * 2);
    const availableHeight = buttonHeight - (padding * 2);
    
    // Calculate scale factors for width and height
    const widthScale = availableWidth / tempText.width;
    const heightScale = availableHeight / tempText.height;
    
    // Use the smaller scale to ensure text fits in both dimensions
    const scale = Math.min(widthScale, heightScale);
    
    // Calculate optimal font size
    let optimalSize = Math.floor(baseFontSize * scale);
    
    // Set reasonable bounds
    const minSize = Math.max(10, buttonHeight * 0.2);
    const maxSize = Math.min(48, buttonHeight * 0.8);
    
    optimalSize = Math.max(minSize, Math.min(maxSize, optimalSize));
    
    // Clean up temporary text
    tempText.destroy();
    
    return optimalSize;
  }

  public setStyle(newStyle: Partial<ButtonStyle>): void {
    this.style = { ...this.style, ...newStyle };
    
    // Update background
    this.background.setSize(this.style.width!, this.style.height!);
    this.background.setStrokeStyle(this.style.borderWidth!, this.style.borderColor);
    
    // Recalculate optimal font size when button dimensions change
    const currentText = this.text.text;
    const optimalFontSize = this.calculateOptimalFontSize(currentText, this.style.width!, this.style.height!);
    
    // Update text style with optimal font size
    this.text.setStyle({
      fontSize: `${optimalFontSize}px`,
      color: this.enabled ? this.style.textColor! : this.style.disabledTextColor!,
      fontFamily: this.style.fontFamily!,
      stroke: '#000000',
      strokeThickness: Math.max(1, Math.floor(optimalFontSize * 0.08))
    });
    
    // Update container size for interaction
    this.container.setSize(this.style.width!, this.style.height!);
    
    this.updateVisualState();
  }

  private updateVisualState(): void {
    if (this.enabled) {
      this.background.setFillStyle(this.style.backgroundColor!);
      this.text.setColor(this.style.textColor!);
      this.container.setAlpha(1.0);
      this.container.input!.enabled = true;
      
      // Add focus indicator
      if (this.focused) {
        this.background.setStrokeStyle(4, ColorTheme.BORDER_FOCUS); // Yellow focus border
      } else {
        this.background.setStrokeStyle(this.style.borderWidth!, this.style.borderColor);
      }
    } else {
      this.background.setFillStyle(this.style.disabledBackgroundColor!);
      this.text.setColor(this.style.disabledTextColor!);
      this.container.setAlpha(0.6);
      this.container.input!.enabled = false;
      this.container.setScale(1.0); // Reset scale when disabled
      this.background.setStrokeStyle(this.style.borderWidth!, this.style.borderColor);
    }
  }

  public getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  private setupKeyboardSupport(): void {
    if (this.keyboardKey && this.scene.input.keyboard) {
      const key = this.scene.input.keyboard.addKey(this.keyboardKey);
      key.on('down', () => {
        if (this.enabled) {
          this.triggerClick();
        }
      });
    }
  }

  public setFocus(focused: boolean): void {
    this.focused = focused;
    this.updateVisualState();
  }

  public isFocused(): boolean {
    return this.focused;
  }

  public triggerClick(): void {
    if (this.enabled) {
      // Visual feedback for keyboard activation
      this.scene.tweens.add({
        targets: this.container,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 100,
        ease: 'Power2',
        yoyo: true,
        onComplete: () => {
          this.callback();
        }
      });
    }
  }

  public destroy(): void {
    if (this.container) {
      this.container.destroy();
    }
  }

  public setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }
}