import * as Phaser from 'phaser';
import { OptionElement, OptionElementData } from './OptionElement';

export class ScrollableGrid extends Phaser.GameObjects.Container {
  private static readonly CONFIG = {
    PADDING: 20,
    SPACING: 10,
    SCROLL_STEP: 40
  };

  private viewport: { width: number; height: number };
  private scrollableContent: Phaser.GameObjects.Container;
  private gridContainer: Phaser.GameObjects.Container;
  private options: OptionElement[] = [];
  
  private currentScrollY: number = 0;
  private maxScrollY: number = 0;
  private columnsPerRow: number = 4;
  private onSelectCallback?: (data: OptionElementData) => void;
  private wheelHandler?: (pointer: Phaser.Input.Pointer, gameObjects: any, deltaX: number, deltaY: number) => void;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    super(scene, x, y);
    
    this.viewport = { width, height };
    this.createScrollSystem();
    this.setupEventBlocking();
    
    scene.add.existing(this);
  }

  private createScrollSystem(): void {
    // Simple scrollable content container - no mask needed
    this.scrollableContent = this.scene.add.container(0, 0);
    this.add(this.scrollableContent);

    // Grid container for options
    this.gridContainer = this.scene.add.container(0, 0);
    this.scrollableContent.add(this.gridContainer);


  }

  private handleWheelEvent(deltaY: number): void {
    console.log('🖱️ SCROLL DEBUG: Wheel event detected!', {
      deltaY,
      currentScrollY: this.currentScrollY,
      maxScrollY: this.maxScrollY,
      canScrollDown: deltaY > 0 && this.currentScrollY < this.maxScrollY,
      canScrollUp: deltaY < 0 && this.currentScrollY > 0
    });
    
    if (this.maxScrollY > 0) {
      if (deltaY > 0 && this.currentScrollY < this.maxScrollY) {
        this.currentScrollY = Math.min(this.maxScrollY, this.currentScrollY + ScrollableGrid.CONFIG.SCROLL_STEP);
        console.log('🖱️ SCROLL DEBUG: Scrolled DOWN to:', this.currentScrollY);
      } else if (deltaY < 0 && this.currentScrollY > 0) {
        this.currentScrollY = Math.max(0, this.currentScrollY - ScrollableGrid.CONFIG.SCROLL_STEP);
        console.log('🖱️ SCROLL DEBUG: Scrolled UP to:', this.currentScrollY);
      } else {
        console.log('🖱️ SCROLL DEBUG: Scroll blocked at boundary');
      }
      
      this.positionGrid();
    } else {
      console.log('🖱️ SCROLL DEBUG: No scrolling needed (maxScrollY = 0)');
    }
  }

  private setupEventBlocking(): void {
    // Make the ScrollableGrid interactive to capture clicks within its bounds
    this.setInteractive(
      new Phaser.Geom.Rectangle(
        -this.viewport.width / 2,
        -this.viewport.height / 2,
        this.viewport.width,
        this.viewport.height
      ),
      Phaser.Geom.Rectangle.Contains
    );

    // Block all pointer events from propagating to the background scene
    this.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Stop the event from propagating to objects behind the ScrollableGrid
      pointer.event.stopPropagation();
    });

    this.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      // Stop move events from propagating as well
      pointer.event.stopPropagation();
    });

    this.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      // Stop up events from propagating
      pointer.event.stopPropagation();
    });

    // Set up wheel event handling using the scene's input system
    // This approach should work more reliably than container-based wheel events
    this.setupWheelEventHandling();
  }

  private setupWheelEventHandling(): void {
    // Store reference to the wheel handler for cleanup
    this.wheelHandler = (pointer: Phaser.Input.Pointer, _gameObjects: any, _deltaX: number, deltaY: number) => {
      // Check if the pointer is within our bounds
      if (this.isPointerWithinBounds(pointer)) {
        console.log('🖱️ SCROLL DEBUG: Scene wheel event within bounds');
        this.handleWheelEvent(deltaY);
      }
    };

    // Add wheel event listener to the scene
    this.scene.input.on('wheel', this.wheelHandler);
  }

  private isPointerWithinBounds(pointer: Phaser.Input.Pointer): boolean {
    // Convert pointer position to world coordinates
    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    
    // Check if the world point is within our container bounds
    const bounds = new Phaser.Geom.Rectangle(
      this.x - this.viewport.width / 2,
      this.y - this.viewport.height / 2,
      this.viewport.width,
      this.viewport.height
    );
    
    return Phaser.Geom.Rectangle.Contains(bounds, worldPoint.x, worldPoint.y);
  }

  public setOptions(optionsData: OptionElementData[]): void {
    // Clear existing options
    this.clearOptions();

    // Calculate grid layout
    const optionSize = OptionElement.getSize();
    const availableWidth = this.viewport.width - (2 * ScrollableGrid.CONFIG.PADDING);
    
    // Calculate columns that fit
    this.columnsPerRow = Math.floor(availableWidth / (optionSize.width + ScrollableGrid.CONFIG.SPACING));
    this.columnsPerRow = Math.max(1, Math.min(this.columnsPerRow, 4)); // Between 1-4 columns

    // Calculate actual spacing to center grid horizontally within viewport
    const totalOptionsWidth = this.columnsPerRow * optionSize.width;
    const totalSpacingWidth = (this.columnsPerRow - 1) * ScrollableGrid.CONFIG.SPACING;
    const gridWidth = totalOptionsWidth + totalSpacingWidth;
    
    // Position relative to viewport center (mask coordinates)
    const startX = -gridWidth / 2 + optionSize.width / 2;

    // Create option elements positioned from the top of the viewport
    optionsData.forEach((data, index) => {
      const row = Math.floor(index / this.columnsPerRow);
      const col = index % this.columnsPerRow;
      
      const x = startX + col * (optionSize.width + ScrollableGrid.CONFIG.SPACING);
      const y = -this.viewport.height / 2 + ScrollableGrid.CONFIG.PADDING + row * (optionSize.height + ScrollableGrid.CONFIG.SPACING) + optionSize.height / 2;

      const option = new OptionElement(this.scene, x, y, data);
      option.onSelect((selectedData) => {
        if (this.onSelectCallback) {
          this.onSelectCallback(selectedData);
        }
      });

      this.options.push(option);
      this.gridContainer.add(option);
    });

    // Calculate scroll bounds
    this.updateScrollBounds();
    this.positionGrid();
  }

  private updateScrollBounds(): void {
    const optionSize = OptionElement.getSize();
    const totalRows = Math.ceil(this.options.length / this.columnsPerRow);
    
    // Calculate the height of all rows including top padding
    const totalContentHeight = ScrollableGrid.CONFIG.PADDING + totalRows * (optionSize.height + ScrollableGrid.CONFIG.SPACING);
    
    // Calculate available viewport height (minus padding)
    const availableViewportHeight = this.viewport.height - ScrollableGrid.CONFIG.PADDING;
    
    // Calculate how much content extends beyond the viewport
    const contentOverflow = Math.max(0, totalContentHeight - availableViewportHeight);
    
    // Set maxScrollY to the amount we can scroll to see all content
    this.maxScrollY = contentOverflow;
    
    // Start at the top of the content (0) so initial view shows the first items
    this.currentScrollY = 0;
    
    console.log('🖱️ SCROLL DEBUG: Scroll bounds updated:', {
      totalRows,
      totalContentHeight,
      availableViewportHeight,
      contentOverflow,
      maxScrollY: this.maxScrollY,
      needsScrolling: this.maxScrollY > 0
    });
  }

  private positionGrid(): void {
    if (this.maxScrollY === 0) {
      // Content fits - start from top with padding
      this.gridContainer.setY(0);
    } else {
      // Content needs scrolling - position based on scroll offset
      // currentScrollY represents how much to scroll down from the top
      // Position the grid so that scrolling down reveals content below
      this.gridContainer.setY(-this.currentScrollY);
    }
  }

  public enableScrolling(): void {
    // Scrolling is now handled directly in setupEventBlocking()
    // This method is kept for compatibility but no longer needed
    console.log('🖱️ SCROLL DEBUG: Scrolling is handled by container wheel events, maxScrollY:', this.maxScrollY);
  }

  public onSelect(callback: (data: OptionElementData) => void): void {
    this.onSelectCallback = callback;
  }

  public needsScrolling(): boolean {
    return this.maxScrollY > 0;
  }

  private clearOptions(): void {
    this.options.forEach(option => option.destroy());
    this.options = [];
  }

  public override destroy(): void {
    // Clean up wheel event listener
    if (this.wheelHandler) {
      this.scene.input.off('wheel', this.wheelHandler);
      this.wheelHandler = undefined;
    }
    this.clearOptions();
    super.destroy();
  }
}