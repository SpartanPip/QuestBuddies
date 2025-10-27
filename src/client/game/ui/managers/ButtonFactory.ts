import * as Phaser from 'phaser';
import { ColorTheme } from '../../../utils/ColorTheme';
import { MenuButton, ButtonStyle } from '../MenuButton';

/**
 * Configuration interface for button creation
 */
export interface ButtonConfig {
  x: number;
  y: number;
  text: string;
  onClick: () => void;
  style?: Partial<ButtonStyle>;
  keyboardKey?: string;
  enabled?: boolean;
}

/**
 * Configuration interface for button groups
 */
export interface ButtonGroupConfig {
  buttons: Array<{
    text: string;
    onClick: () => void;
    style?: Partial<ButtonStyle>;
    keyboardKey?: string;
    enabled?: boolean;
  }>;
  layout: 'horizontal' | 'vertical';
  spacing?: number;
  startPosition: { x: number; y: number };
  alignment?: 'left' | 'center' | 'right';
}

/**
 * Reusable Button Factory for standardized button creation
 * 
 * Features:
 * - Predefined button styles for common use cases
 * - Responsive button sizing
 * - Button group layouts (horizontal/vertical)
 * - Keyboard shortcut support
 * - Consistent styling using ColorTheme
 * - Easy button management and updates
 * 
 * Usage:
 * ```typescript
 * // Single button
 * const button = ButtonFactory.createButton(scene, {
 *   x: 100, y: 100,
 *   text: 'Play',
 *   onClick: () => console.log('Play clicked'),
 *   style: ButtonFactory.getStyle('primary')
 * });
 * 
 * // Button group
 * const buttons = ButtonFactory.createButtonGroup(scene, {
 *   buttons: [
 *     { text: 'Play', onClick: () => console.log('Play') },
 *     { text: 'Settings', onClick: () => console.log('Settings') },
 *     { text: 'Quit', onClick: () => console.log('Quit') }
 *   ],
 *   layout: 'vertical',
 *   startPosition: { x: 100, y: 100 },
 *   spacing: 20
 * });
 * ```
 */
export class ButtonFactory {
  private static readonly CONFIG = {
    DEFAULT_WIDTH: 200,
    DEFAULT_HEIGHT: 60,
    MIN_WIDTH: 120,
    MAX_WIDTH: 400,
    MIN_HEIGHT: 40,
    MAX_HEIGHT: 80,
    DEFAULT_SPACING: 20,
    RESPONSIVE_SCALE_FACTOR: 0.8
  };

  /**
   * Create a single button with the given configuration
   */
  public static createButton(scene: Phaser.Scene, config: ButtonConfig): MenuButton {
    const style = this.getResponsiveStyle(config.style);
    
    const button = new MenuButton(
      scene,
      config.x,
      config.y,
      config.text,
      config.onClick,
      style,
      config.keyboardKey
    );

    if (config.enabled !== undefined) {
      button.setEnabled(config.enabled);
    }

    return button;
  }

  /**
   * Create a group of buttons with automatic layout
   */
  public static createButtonGroup(scene: Phaser.Scene, config: ButtonGroupConfig): MenuButton[] {
    const buttons: MenuButton[] = [];
    const spacing = config.spacing || this.CONFIG.DEFAULT_SPACING;
    const { x: startX, y: startY } = config.startPosition;

    config.buttons.forEach((buttonConfig, index) => {
      let x = startX;
      let y = startY;

      if (config.layout === 'horizontal') {
        x = startX + index * (this.CONFIG.DEFAULT_WIDTH + spacing);
      } else {
        y = startY + index * (this.CONFIG.DEFAULT_HEIGHT + spacing);
      }

      // Apply alignment
      if (config.alignment === 'center') {
        if (config.layout === 'horizontal') {
          const totalWidth = config.buttons.length * this.CONFIG.DEFAULT_WIDTH + 
                           (config.buttons.length - 1) * spacing;
          x = startX - totalWidth / 2 + index * (this.CONFIG.DEFAULT_WIDTH + spacing);
        } else {
          // For vertical layout, center is handled by startPosition
        }
      } else if (config.alignment === 'right') {
        if (config.layout === 'horizontal') {
          const totalWidth = config.buttons.length * this.CONFIG.DEFAULT_WIDTH + 
                           (config.buttons.length - 1) * spacing;
          x = startX - totalWidth + index * (this.CONFIG.DEFAULT_WIDTH + spacing);
        }
      }

      const button = this.createButton(scene, {
        x,
        y,
        text: buttonConfig.text,
        onClick: buttonConfig.onClick,
        style: buttonConfig.style,
        keyboardKey: buttonConfig.keyboardKey,
        enabled: buttonConfig.enabled
      });

      buttons.push(button);
    });

    return buttons;
  }

  /**
   * Create navigation buttons (Back, Next, etc.)
   */
  public static createNavigationButtons(scene: Phaser.Scene, config: {
    backButton?: { onClick: () => void; enabled?: boolean };
    nextButton?: { onClick: () => void; enabled?: boolean };
    position: { x: number; y: number };
    layout?: 'horizontal' | 'vertical';
    spacing?: number;
  }): { backButton?: MenuButton; nextButton?: MenuButton } {
    const buttons: { backButton?: MenuButton; nextButton?: MenuButton } = {};
    const spacing = config.spacing || this.CONFIG.DEFAULT_SPACING;
    const layout = config.layout || 'horizontal';

    if (config.backButton) {
      const x = layout === 'horizontal' ? config.position.x - spacing : config.position.x;
      const y = layout === 'vertical' ? config.position.y - spacing : config.position.y;

      buttons.backButton = this.createButton(scene, {
        x,
        y,
        text: '← Back',
        onClick: config.backButton.onClick,
        style: this.getStyle('secondary'),
        enabled: config.backButton.enabled
      });
    }

    if (config.nextButton) {
      const x = layout === 'horizontal' ? config.position.x + spacing : config.position.x;
      const y = layout === 'vertical' ? config.position.y + spacing : config.position.y;

      buttons.nextButton = this.createButton(scene, {
        x,
        y,
        text: 'Next →',
        onClick: config.nextButton.onClick,
        style: this.getStyle('primary'),
        enabled: config.nextButton.enabled
      });
    }

    return buttons;
  }

  /**
   * Create action buttons (Save, Cancel, Delete, etc.)
   */
  public static createActionButtons(scene: Phaser.Scene, config: {
    saveButton?: { onClick: () => void; enabled?: boolean };
    cancelButton?: { onClick: () => void; enabled?: boolean };
    deleteButton?: { onClick: () => void; enabled?: boolean };
    position: { x: number; y: number };
    layout?: 'horizontal' | 'vertical';
    spacing?: number;
  }): { saveButton?: MenuButton; cancelButton?: MenuButton; deleteButton?: MenuButton } {
    const buttons: { saveButton?: MenuButton; cancelButton?: MenuButton; deleteButton?: MenuButton } = {};
    const spacing = config.spacing || this.CONFIG.DEFAULT_SPACING;
    const layout = config.layout || 'horizontal';

    let buttonIndex = 0;

    if (config.saveButton) {
      const x = layout === 'horizontal' ? config.position.x + buttonIndex * spacing : config.position.x;
      const y = layout === 'vertical' ? config.position.y + buttonIndex * spacing : config.position.y;

      buttons.saveButton = this.createButton(scene, {
        x,
        y,
        text: 'Save',
        onClick: config.saveButton.onClick,
        style: this.getStyle('success'),
        enabled: config.saveButton.enabled
      });
      buttonIndex++;
    }

    if (config.cancelButton) {
      const x = layout === 'horizontal' ? config.position.x + buttonIndex * spacing : config.position.x;
      const y = layout === 'vertical' ? config.position.y + buttonIndex * spacing : config.position.y;

      buttons.cancelButton = this.createButton(scene, {
        x,
        y,
        text: 'Cancel',
        onClick: config.cancelButton.onClick,
        style: this.getStyle('secondary'),
        enabled: config.cancelButton.enabled
      });
      buttonIndex++;
    }

    if (config.deleteButton) {
      const x = layout === 'horizontal' ? config.position.x + buttonIndex * spacing : config.position.x;
      const y = layout === 'vertical' ? config.position.y + buttonIndex * spacing : config.position.y;

      buttons.deleteButton = this.createButton(scene, {
        x,
        y,
        text: 'Delete',
        onClick: config.deleteButton.onClick,
        style: this.getStyle('warning'),
        enabled: config.deleteButton.enabled
      });
    }

    return buttons;
  }

  /**
   * Get predefined button style
   */
  public static getStyle(type: 'primary' | 'secondary' | 'success' | 'warning' | 'disabled' = 'primary'): Partial<ButtonStyle> {
    const baseStyle = ColorTheme.getButtonStyle(type);
    
    return {
      ...baseStyle,
      width: this.CONFIG.DEFAULT_WIDTH,
      height: this.CONFIG.DEFAULT_HEIGHT
    };
  }

  /**
   * Get responsive button style that adapts to screen size
   */
  public static getResponsiveStyle(baseStyle?: Partial<ButtonStyle>): Partial<ButtonStyle> {
    const responsiveStyle = baseStyle ? { ...baseStyle } : {};

    // Apply responsive sizing if not explicitly set
    if (!responsiveStyle.width) {
      responsiveStyle.width = this.CONFIG.DEFAULT_WIDTH;
    }
    if (!responsiveStyle.height) {
      responsiveStyle.height = this.CONFIG.DEFAULT_HEIGHT;
    }

    return responsiveStyle;
  }

  /**
   * Create a button with responsive sizing based on screen dimensions
   */
  public static createResponsiveButton(scene: Phaser.Scene, config: ButtonConfig): MenuButton {
    const { width, height } = scene.scale;
    const scaleFactor = Math.min(width / 1024, height / 768);

    // Calculate responsive dimensions
    const responsiveWidth = Math.max(
      this.CONFIG.MIN_WIDTH,
      Math.min(this.CONFIG.MAX_WIDTH, this.CONFIG.DEFAULT_WIDTH * scaleFactor)
    );
    const responsiveHeight = Math.max(
      this.CONFIG.MIN_HEIGHT,
      Math.min(this.CONFIG.MAX_HEIGHT, this.CONFIG.DEFAULT_HEIGHT * scaleFactor)
    );

    const responsiveStyle = {
      ...config.style,
      width: responsiveWidth,
      height: responsiveHeight,
      fontSize: `${Math.floor(24 * scaleFactor)}px`
    };

    return this.createButton(scene, {
      ...config,
      style: responsiveStyle
    });
  }

  /**
   * Update button group positions for responsive layout
   */
  public static updateButtonGroupLayout(scene: Phaser.Scene, buttons: MenuButton[], config: {
    layout: 'horizontal' | 'vertical';
    startPosition: { x: number; y: number };
    spacing?: number;
    alignment?: 'left' | 'center' | 'right';
  }): void {
    const spacing = config.spacing || this.CONFIG.DEFAULT_SPACING;
    const { x: startX, y: startY } = config.startPosition;

    buttons.forEach((button, index) => {
      let x = startX;
      let y = startY;

      if (config.layout === 'horizontal') {
        x = startX + index * (this.CONFIG.DEFAULT_WIDTH + spacing);
      } else {
        y = startY + index * (this.CONFIG.DEFAULT_HEIGHT + spacing);
      }

      // Apply alignment
      if (config.alignment === 'center') {
        if (config.layout === 'horizontal') {
          const totalWidth = buttons.length * this.CONFIG.DEFAULT_WIDTH + 
                           (buttons.length - 1) * spacing;
          x = startX - totalWidth / 2 + index * (this.CONFIG.DEFAULT_WIDTH + spacing);
        }
      } else if (config.alignment === 'right') {
        if (config.layout === 'horizontal') {
          const totalWidth = buttons.length * this.CONFIG.DEFAULT_WIDTH + 
                           (buttons.length - 1) * spacing;
          x = startX - totalWidth + index * (this.CONFIG.DEFAULT_WIDTH + spacing);
        }
      }

      button.setPosition(x, y);
    });
  }

  /**
   * Destroy all buttons in a group
   */
  public static destroyButtonGroup(buttons: MenuButton[]): void {
    buttons.forEach(button => button.destroy());
  }
}
