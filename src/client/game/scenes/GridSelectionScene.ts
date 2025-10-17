import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import { ScrollableGrid } from '../ui/ScrollableGrid';
import { OptionElementData } from '../ui/OptionElement';
import { ColorTheme } from '../utils/ColorTheme';

export interface GridSelectionData {
  options: OptionElementData[];
  title: string;
  returnScene: string;
  returnData?: any;
}

export class GridSelectionScene extends Scene {
  private selectionData!: GridSelectionData;
  private background: Phaser.GameObjects.Graphics | null = null;
  private scrollableGrid: ScrollableGrid | null = null;

  constructor() {
    super('GridSelectionScene');
  }

  init(data: GridSelectionData): void {
    this.selectionData = data;
    console.log('🎯 GridSelectionScene initialized with:', {
      title: data.title,
      optionCount: data.options.length,
      returnScene: data.returnScene
    });
  }

  create(): void {
    console.log('🏗️ Creating GridSelectionScene...');
    
    this.createBackground();
    this.createScrollableGrid();
    
    console.log('✅ GridSelectionScene created successfully');
  }

  private createBackground(): void {
    const { width, height } = this.cameras.main;
    
    // Use the same gradient background as other scenes
    this.background = ColorTheme.createMenuGradientBackground(this, width, height);
    
    console.log('🎨 Gradient background created:', { width, height });
  }


  private createScrollableGrid(): void {
    const { width, height } = this.cameras.main;
    
    // Use full screen with small margins
    const margin = 40;
    const gridWidth = width - (2 * margin);
    const gridHeight = height - (2 * margin);
    const gridX = width / 2;
    const gridY = height / 2;
    
    console.log('📐 Grid dimensions:', {
      gridWidth,
      gridHeight,
      gridX,
      gridY,
      screenWidth: width,
      screenHeight: height
    });
    
    this.scrollableGrid = new ScrollableGrid(
      this,
      gridX,
      gridY,
      gridWidth,
      gridHeight
    );
    
    // Set up selection callback
    this.scrollableGrid.onSelect((selectedData) => {
      console.log('✅ Option selected:', selectedData);
      this.returnToPreviousScene(selectedData);
    });
    
    // Set the options
    this.scrollableGrid.setOptions(this.selectionData.options);
    
    console.log('🎯 ScrollableGrid created and configured');
  }


  private returnToPreviousScene(selectedData: OptionElementData | null): void {
    console.log('🔄 Returning to previous scene:', {
      returnScene: this.selectionData.returnScene,
      selectedData,
      returnData: this.selectionData.returnData
    });
    
    // Prepare return data
    const returnData = {
      ...this.selectionData.returnData,
      selectedOption: selectedData
    };
    
    // Start the return scene with the selection data
    this.scene.start(this.selectionData.returnScene, returnData);
  }

  public update(): void {
    // Handle keyboard navigation
    if (this.input.keyboard) {
      const keyboard = this.input.keyboard;
      
      // ESC key to go back
      if (keyboard.checkDown(keyboard.addKey('ESC'), 500)) {
        this.returnToPreviousScene(null);
      }
    }
  }
}
