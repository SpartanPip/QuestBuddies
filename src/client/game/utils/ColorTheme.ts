/**
 * Universal color theme configuration for the game
 * Provides consistent blue and dark grey color scheme with white text
 */
export class ColorTheme {
  // Primary colors - Blue theme
  static readonly PRIMARY_BLUE = 0x1e3a8a;        // Dark blue
  static readonly PRIMARY_BLUE_LIGHT = 0x3b82f6;  // Medium blue
  static readonly PRIMARY_BLUE_HOVER = 0x60a5fa;  // Light blue for hover
  
  // Secondary colors - Dark grey theme
  static readonly SECONDARY_DARK = 0x1f2937;      // Dark grey
  static readonly SECONDARY_MEDIUM = 0x374151;    // Medium grey
  static readonly SECONDARY_LIGHT = 0x4b5563;     // Light grey for hover
  
  // Text colors
  static readonly TEXT_PRIMARY = '#ffffff';        // White text
  static readonly TEXT_SECONDARY = '#e5e7eb';      // Light grey text
  static readonly TEXT_DISABLED = '#9ca3af';      // Disabled text
  
  // Background colors
  static readonly BACKGROUND_DARK = 0x111827;     // Very dark background
  static readonly BACKGROUND_OVERLAY = 0x000000;  // Black overlay
  
  // Status colors (maintaining visibility with theme)
  static readonly SUCCESS = 0x10b981;             // Green
  static readonly WARNING = 0xf59e0b;             // Amber
  static readonly ERROR = 0xef4444;               // Red
  static readonly INFO = 0x3b82f6;                // Blue
  
  // UI Component specific colors
  static readonly BUTTON_PRIMARY = 0x1e3a8a;      // Primary blue buttons
  static readonly BUTTON_PRIMARY_HOVER = 0x3b82f6;
  static readonly BUTTON_SECONDARY = 0x374151;    // Secondary grey buttons
  static readonly BUTTON_SECONDARY_HOVER = 0x4b5563;
  static readonly BUTTON_SUCCESS = 0x10b981;      // Success buttons
  static readonly BUTTON_SUCCESS_HOVER = 0x34d399;
  static readonly BUTTON_WARNING = 0xf59e0b;      // Warning buttons
  static readonly BUTTON_WARNING_HOVER = 0xfbbf24;
  static readonly BUTTON_DISABLED = 0x374151;     // Disabled buttons
  
  // Border colors
  static readonly BORDER_PRIMARY = 0x60a5fa;      // Light blue borders
  static readonly BORDER_SECONDARY = 0x6b7280;    // Grey borders
  static readonly BORDER_FOCUS = 0xfbbf24;        // Yellow focus border
  
  // Health bar colors (adjusted for theme)
  static readonly HEALTH_HIGH = 0x10b981;         // Green
  static readonly HEALTH_MEDIUM = 0xf59e0b;       // Amber
  static readonly HEALTH_LOW = 0xef4444;          // Red
  static readonly HEALTH_BACKGROUND = 0x1f2937;   // Dark grey background
  
  /**
   * Get button style configuration for different button types
   */
  static getButtonStyle(type: 'primary' | 'secondary' | 'success' | 'warning' | 'disabled' = 'primary') {
    const baseStyle = {
      borderColor: this.BORDER_PRIMARY,
      borderWidth: 2,
      textColor: this.TEXT_PRIMARY,
      fontSize: '24px',
      fontFamily: 'Arial Black',
      disabledTextColor: this.TEXT_DISABLED
    };

    switch (type) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: this.BUTTON_PRIMARY,
          hoverBackgroundColor: this.BUTTON_PRIMARY_HOVER,
          disabledBackgroundColor: this.BUTTON_DISABLED
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: this.BUTTON_SECONDARY,
          hoverBackgroundColor: this.BUTTON_SECONDARY_HOVER,
          disabledBackgroundColor: this.BUTTON_DISABLED
        };
      case 'success':
        return {
          ...baseStyle,
          backgroundColor: this.BUTTON_SUCCESS,
          hoverBackgroundColor: this.BUTTON_SUCCESS_HOVER,
          disabledBackgroundColor: this.BUTTON_DISABLED
        };
      case 'warning':
        return {
          ...baseStyle,
          backgroundColor: this.BUTTON_WARNING,
          hoverBackgroundColor: this.BUTTON_WARNING_HOVER,
          disabledBackgroundColor: this.BUTTON_DISABLED
        };
      case 'disabled':
        return {
          ...baseStyle,
          backgroundColor: this.BUTTON_DISABLED,
          hoverBackgroundColor: this.BUTTON_DISABLED,
          disabledBackgroundColor: this.BUTTON_DISABLED
        };
      default:
        return baseStyle;
    }
  }

  /**
   * Get text style configuration
   */
  static getTextStyle(size: 'small' | 'medium' | 'large' | 'xlarge' = 'medium', type: 'primary' | 'secondary' = 'primary') {
    const sizes = {
      small: '16px',
      medium: '24px',
      large: '32px',
      xlarge: '48px'
    };

    return {
      fontSize: sizes[size],
      color: type === 'primary' ? this.TEXT_PRIMARY : this.TEXT_SECONDARY,
      fontFamily: 'Arial Black',
      stroke: '#000000',
      strokeThickness: type === 'primary' ? 4 : 2
    };
  }

  /**
   * Get overlay style for modals and popups
   */
  static getOverlayStyle(alpha: number = 0.8) {
    return {
      color: this.BACKGROUND_OVERLAY,
      alpha: alpha
    };
  }

  /**
   * Get health bar colors based on health percentage
   */
  static getHealthColor(healthPercent: number): number {
    if (healthPercent > 0.6) return this.HEALTH_HIGH;
    if (healthPercent > 0.3) return this.HEALTH_MEDIUM;
    return this.HEALTH_LOW;
  }
}