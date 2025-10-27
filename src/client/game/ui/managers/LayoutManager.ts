import * as Phaser from 'phaser';
import { ColorTheme } from '../../../utils/ColorTheme';

/**
 * Configuration interface for layout areas
 */
export interface LayoutArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Configuration interface for responsive layout
 */
export interface ResponsiveLayoutConfig {
  headerHeight?: number;
  footerHeight?: number;
  sidebarWidth?: number;
  contentPadding?: number;
  breakpoints?: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
}

/**
 * Reusable Layout Manager for responsive positioning utilities
 * 
 * Features:
 * - Responsive layout calculations
 * - Screen size breakpoint detection
 * - Layout area definitions (header, footer, content, sidebar)
 * - Positioning utilities for UI elements
 * - Consistent spacing and padding
 * - Mobile-first responsive design
 * 
 * Usage:
 * ```typescript
 * // Get layout areas
 * const layout = LayoutManager.getLayoutAreas(scene);
 * 
 * // Position element in center of content area
 * const centerX = LayoutManager.getCenterX(scene, layout.content);
 * const centerY = LayoutManager.getCenterY(scene, layout.content);
 * 
 * // Check screen size
 * if (LayoutManager.isMobile(scene)) {
 *   // Mobile-specific layout
 * }
 * 
 * // Create responsive container
 * const container = LayoutManager.createResponsiveContainer(scene, {
 *   headerHeight: 80,
 *   footerHeight: 120
 * });
 * ```
 */
export class LayoutManager {
  private static readonly CONFIG = {
    DEFAULT_HEADER_HEIGHT: 80,
    DEFAULT_FOOTER_HEIGHT: 120,
    DEFAULT_SIDEBAR_WIDTH: 200,
    DEFAULT_CONTENT_PADDING: 20,
    MOBILE_BREAKPOINT: 768,
    TABLET_BREAKPOINT: 1024,
    DESKTOP_BREAKPOINT: 1200,
    MIN_CONTENT_HEIGHT: 200,
    MIN_CONTENT_WIDTH: 300
  };

  /**
   * Get layout areas for the current screen size
   */
  public static getLayoutAreas(scene: Phaser.Scene, config?: ResponsiveLayoutConfig): {
    screen: LayoutArea;
    header: LayoutArea;
    footer: LayoutArea;
    content: LayoutArea;
    sidebar?: LayoutArea;
  } {
    const { width, height } = scene.scale;
    const headerHeight = config?.headerHeight || this.CONFIG.DEFAULT_HEADER_HEIGHT;
    const footerHeight = config?.footerHeight || this.CONFIG.DEFAULT_FOOTER_HEIGHT;
    const sidebarWidth = config?.sidebarWidth || this.CONFIG.DEFAULT_SIDEBAR_WIDTH;
    const padding = config?.contentPadding || this.CONFIG.DEFAULT_CONTENT_PADDING;

    const screen: LayoutArea = { x: 0, y: 0, width, height };

    // Header area
    const header: LayoutArea = {
      x: 0,
      y: 0,
      width,
      height: headerHeight
    };

    // Footer area
    const footer: LayoutArea = {
      x: 0,
      y: height - footerHeight,
      width,
      height: footerHeight
    };

    // Content area
    const contentHeight = height - headerHeight - footerHeight;
    const content: LayoutArea = {
      x: padding,
      y: headerHeight + padding,
      width: width - (padding * 2),
      height: Math.max(this.CONFIG.MIN_CONTENT_HEIGHT, contentHeight - (padding * 2))
    };

    const result: any = { screen, header, footer, content };

    // Add sidebar for larger screens
    if (this.isDesktop(scene) && width > sidebarWidth + this.CONFIG.MIN_CONTENT_WIDTH) {
      result.sidebar = {
        x: 0,
        y: headerHeight,
        width: sidebarWidth,
        height: height - headerHeight - footerHeight
      };

      // Adjust content area to account for sidebar
      result.content.x = sidebarWidth + padding;
      result.content.width = width - sidebarWidth - (padding * 2);
    }

    return result;
  }

  /**
   * Check if current screen size is mobile
   */
  public static isMobile(scene: Phaser.Scene): boolean {
    return scene.scale.width <= this.CONFIG.MOBILE_BREAKPOINT;
  }

  /**
   * Check if current screen size is tablet
   */
  public static isTablet(scene: Phaser.Scene): boolean {
    const width = scene.scale.width;
    return width > this.CONFIG.MOBILE_BREAKPOINT && width <= this.CONFIG.TABLET_BREAKPOINT;
  }

  /**
   * Check if current screen size is desktop
   */
  public static isDesktop(scene: Phaser.Scene): boolean {
    return scene.scale.width > this.CONFIG.TABLET_BREAKPOINT;
  }

  /**
   * Get responsive scale factor based on screen size
   */
  public static getScaleFactor(scene: Phaser.Scene, referenceWidth: number = 1024, referenceHeight: number = 768): number {
    const { width, height } = scene.scale;
    return Math.min(width / referenceWidth, height / referenceHeight, 1); // Never scale up
  }

  /**
   * Get center X position for an area
   */
  public static getCenterX(scene: Phaser.Scene, area?: LayoutArea): number {
    if (area) {
      return area.x + area.width / 2;
    }
    return scene.cameras.main.centerX;
  }

  /**
   * Get center Y position for an area
   */
  public static getCenterY(scene: Phaser.Scene, area?: LayoutArea): number {
    if (area) {
      return area.y + area.height / 2;
    }
    return scene.cameras.main.centerY;
  }

  /**
   * Get responsive font size based on screen size
   */
  public static getResponsiveFontSize(scene: Phaser.Scene, baseSize: number): string {
    const scaleFactor = this.getScaleFactor(scene);
    const responsiveSize = Math.max(12, Math.floor(baseSize * scaleFactor));
    return `${responsiveSize}px`;
  }

  /**
   * Get responsive button dimensions
   */
  public static getResponsiveButtonSize(scene: Phaser.Scene, baseWidth: number = 200, baseHeight: number = 60): {
    width: number;
    height: number;
  } {
    const scaleFactor = this.getScaleFactor(scene);
    return {
      width: Math.max(120, Math.floor(baseWidth * scaleFactor)),
      height: Math.max(40, Math.floor(baseHeight * scaleFactor))
    };
  }

  /**
   * Create a responsive container with header, content, and footer areas
   */
  public static createResponsiveContainer(scene: Phaser.Scene, config?: ResponsiveLayoutConfig): {
    container: Phaser.GameObjects.Container;
    areas: ReturnType<typeof LayoutManager.getLayoutAreas>;
    headerContainer: Phaser.GameObjects.Container;
    contentContainer: Phaser.GameObjects.Container;
    footerContainer: Phaser.GameObjects.Container;
  } {
    const areas = this.getLayoutAreas(scene, config);
    
    // Main container
    const container = scene.add.container(0, 0);
    container.setScrollFactor(0);

    // Header container
    const headerContainer = scene.add.container(
      this.getCenterX(scene, areas.header),
      this.getCenterY(scene, areas.header)
    );
    headerContainer.setScrollFactor(0);
    headerContainer.setDepth(15);

    // Content container
    const contentContainer = scene.add.container(
      areas.content.x,
      areas.content.y
    );
    contentContainer.setScrollFactor(0);
    contentContainer.setDepth(5);

    // Footer container
    const footerContainer = scene.add.container(
      this.getCenterX(scene, areas.footer),
      this.getCenterY(scene, areas.footer)
    );
    footerContainer.setScrollFactor(0);
    footerContainer.setDepth(15);

    // Add containers to main container
    container.add([headerContainer, contentContainer, footerContainer]);

    return {
      container,
      areas,
      headerContainer,
      contentContainer,
      footerContainer
    };
  }

  /**
   * Create background elements for layout areas
   */
  public static createLayoutBackgrounds(scene: Phaser.Scene, areas: ReturnType<typeof LayoutManager.getLayoutAreas>): {
    headerBackground?: Phaser.GameObjects.Rectangle;
    footerBackground?: Phaser.GameObjects.Rectangle;
    sidebarBackground?: Phaser.GameObjects.Rectangle;
  } {
    const backgrounds: any = {};

    // Header background
    if (areas.header.height > 0) {
      backgrounds.headerBackground = scene.add.rectangle(
        this.getCenterX(scene, areas.header),
        this.getCenterY(scene, areas.header),
        areas.header.width,
        areas.header.height,
        ColorTheme.SECONDARY_DARK,
        0.9
      );
      backgrounds.headerBackground.setStrokeStyle(2, ColorTheme.BORDER_PRIMARY);
      backgrounds.headerBackground.setScrollFactor(0);
      backgrounds.headerBackground.setDepth(10);
    }

    // Footer background
    if (areas.footer.height > 0) {
      backgrounds.footerBackground = scene.add.rectangle(
        this.getCenterX(scene, areas.footer),
        this.getCenterY(scene, areas.footer),
        areas.footer.width,
        areas.footer.height,
        ColorTheme.SECONDARY_DARK,
        0.9
      );
      backgrounds.footerBackground.setStrokeStyle(2, ColorTheme.BORDER_PRIMARY);
      backgrounds.footerBackground.setScrollFactor(0);
      backgrounds.footerBackground.setDepth(10);
    }

    // Sidebar background
    if (areas.sidebar) {
      backgrounds.sidebarBackground = scene.add.rectangle(
        this.getCenterX(scene, areas.sidebar),
        this.getCenterY(scene, areas.sidebar),
        areas.sidebar.width,
        areas.sidebar.height,
        ColorTheme.SECONDARY_DARK,
        0.8
      );
      backgrounds.sidebarBackground.setStrokeStyle(2, ColorTheme.BORDER_SECONDARY);
      backgrounds.sidebarBackground.setScrollFactor(0);
      backgrounds.sidebarBackground.setDepth(8);
    }

    return backgrounds;
  }

  /**
   * Position elements in a grid layout
   */
  public static createGridLayout(scene: Phaser.Scene, area: LayoutArea, config: {
    columns: number;
    rows?: number;
    spacing?: number;
    padding?: number;
  }): Array<{ x: number; y: number }> {
    const spacing = config.spacing || 20;
    const padding = config.padding || 20;
    const availableWidth = area.width - (padding * 2);
    const availableHeight = area.height - (padding * 2);
    
    const cellWidth = (availableWidth - (config.columns - 1) * spacing) / config.columns;
    const cellHeight = config.rows ? 
      (availableHeight - (config.rows - 1) * spacing) / config.rows :
      cellWidth; // Square cells if no rows specified

    const positions: Array<{ x: number; y: number }> = [];
    let index = 0;

    for (let row = 0; row < (config.rows || Math.ceil(1000 / config.columns)); row++) {
      for (let col = 0; col < config.columns; col++) {
        const x = area.x + padding + col * (cellWidth + spacing) + cellWidth / 2;
        const y = area.y + padding + row * (cellHeight + spacing) + cellHeight / 2;
        
        positions.push({ x, y });
        index++;
      }
    }

    return positions;
  }

  /**
   * Update layout for screen resize
   */
  public static updateLayout(scene: Phaser.Scene, containers: {
    container: Phaser.GameObjects.Container;
    headerContainer: Phaser.GameObjects.Container;
    contentContainer: Phaser.GameObjects.Container;
    footerContainer: Phaser.GameObjects.Container;
  }, config?: ResponsiveLayoutConfig): ReturnType<typeof LayoutManager.getLayoutAreas> {
    const areas = this.getLayoutAreas(scene, config);

    // Update container positions
    containers.headerContainer.setPosition(
      this.getCenterX(scene, areas.header),
      this.getCenterY(scene, areas.header)
    );

    containers.contentContainer.setPosition(
      areas.content.x,
      areas.content.y
    );

    containers.footerContainer.setPosition(
      this.getCenterX(scene, areas.footer),
      this.getCenterY(scene, areas.footer)
    );

    return areas;
  }

  /**
   * Get safe area insets for mobile devices
   */
  public static getSafeAreaInsets(scene: Phaser.Scene): {
    top: number;
    bottom: number;
    left: number;
    right: number;
  } {
    // Basic implementation - in a real app, you'd use device APIs
    const isMobile = this.isMobile(scene);
    return {
      top: isMobile ? 20 : 0,
      bottom: isMobile ? 20 : 0,
      left: isMobile ? 10 : 0,
      right: isMobile ? 10 : 0
    };
  }

  /**
   * Calculate optimal spacing between elements
   */
  public static getOptimalSpacing(scene: Phaser.Scene, elementCount: number, availableSpace: number): number {
    const minSpacing = 10;
    const maxSpacing = 50;
    const optimalSpacing = Math.max(minSpacing, Math.min(maxSpacing, availableSpace / (elementCount + 1)));
    return Math.floor(optimalSpacing);
  }
}
