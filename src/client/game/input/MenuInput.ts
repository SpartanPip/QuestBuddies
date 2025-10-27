import * as Phaser from 'phaser';

export interface MenuInputCallbacks {
  onNavigateUp: () => void;
  onNavigateDown: () => void;
  onNavigateLeft: () => void;
  onNavigateRight: () => void;
  onActivateCurrent: () => void;
  onSelectButton: (index: number) => void;
  onBack: () => void;
  onEscape: () => void;
  onToggleFullscreen: () => void;
  getButtonCount: () => number;
  getCurrentButtonIndex: () => number;
}

export class MenuInput {
  private scene: Phaser.Scene;
  private callbacks: MenuInputCallbacks;
  
  // Keyboard controls
  private navigationKeys: { [key: string]: Phaser.Input.Keyboard.Key } = {};
  private actionKeys: { [key: string]: Phaser.Input.Keyboard.Key } = {};
  private numberKeys: { [key: string]: Phaser.Input.Keyboard.Key } = {};
  
  // Input state
  private isInputEnabled: boolean = true;
  private keyboardEnabled: boolean = false;
  private currentButtonIndex: number = 0;
  
  // Touch/pointer controls
  private isTouchDevice: boolean = false;
  private pointerStartTime: number = 0;
  private pointerStartPosition: { x: number; y: number } = { x: 0, y: 0 };
  private swipeThreshold: number = 50;
  private tapThreshold: number = 300; // ms

  constructor(scene: Phaser.Scene, callbacks: MenuInputCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
    
    this.detectInputDevice();
    this.setupKeyboardControls();
    this.setupTouchControls();
  }

  /**
   * Detects the input device type
   */
  private detectInputDevice(): void {
    this.isTouchDevice = this.scene.sys.game.device.input.touch;
    this.keyboardEnabled = !this.isTouchDevice;
    
    console.log('🎮 Input device detected:', {
      isTouchDevice: this.isTouchDevice,
      keyboardEnabled: this.keyboardEnabled
    });
  }

  /**
   * Sets up keyboard controls for menu navigation
   */
  private setupKeyboardControls(): void {
    if (!this.scene.input.keyboard) return;

    // Navigation controls
    this.navigationKeys = {
      UP: this.scene.input.keyboard.addKey('UP'),
      DOWN: this.scene.input.keyboard.addKey('DOWN'),
      LEFT: this.scene.input.keyboard.addKey('LEFT'),
      RIGHT: this.scene.input.keyboard.addKey('RIGHT'),
      W: this.scene.input.keyboard.addKey('W'),
      A: this.scene.input.keyboard.addKey('A'),
      S: this.scene.input.keyboard.addKey('S'),
      D: this.scene.input.keyboard.addKey('D')
    };

    // Action controls
    this.actionKeys = {
      ENTER: this.scene.input.keyboard.addKey('ENTER'),
      SPACE: this.scene.input.keyboard.addKey('SPACE'),
      ESC: this.scene.input.keyboard.addKey('ESC'),
      F: this.scene.input.keyboard.addKey('F') // Fullscreen toggle
    };

    // Number key shortcuts (1-9)
    this.numberKeys = {};
    for (let i = 1; i <= 9; i++) {
      const keyName = i === 1 ? 'ONE' : i === 2 ? 'TWO' : i === 3 ? 'THREE' : 
                     i === 4 ? 'FOUR' : i === 5 ? 'FIVE' : i === 6 ? 'SIX' :
                     i === 7 ? 'SEVEN' : i === 8 ? 'EIGHT' : 'NINE';
      this.numberKeys[i.toString()] = this.scene.input.keyboard.addKey(keyName);
    }

    this.setupKeyboardEventListeners();
  }

  /**
   * Sets up keyboard event listeners
   */
  private setupKeyboardEventListeners(): void {
    // Navigation
    this.navigationKeys.UP.on('down', () => {
      if (this.isInputEnabled) {
        this.callbacks.onNavigateUp();
      }
    });

    this.navigationKeys.DOWN.on('down', () => {
      if (this.isInputEnabled) {
        this.callbacks.onNavigateDown();
      }
    });

    this.navigationKeys.LEFT.on('down', () => {
      if (this.isInputEnabled) {
        this.callbacks.onNavigateLeft();
      }
    });

    this.navigationKeys.RIGHT.on('down', () => {
      if (this.isInputEnabled) {
        this.callbacks.onNavigateRight();
      }
    });

    // WASD navigation (alternative)
    this.navigationKeys.W.on('down', () => {
      if (this.isInputEnabled) {
        this.callbacks.onNavigateUp();
      }
    });

    this.navigationKeys.S.on('down', () => {
      if (this.isInputEnabled) {
        this.callbacks.onNavigateDown();
      }
    });

    this.navigationKeys.A.on('down', () => {
      if (this.isInputEnabled) {
        this.callbacks.onNavigateLeft();
      }
    });

    this.navigationKeys.D.on('down', () => {
      if (this.isInputEnabled) {
        this.callbacks.onNavigateRight();
      }
    });

    // Actions
    this.actionKeys.ENTER.on('down', () => {
      if (this.isInputEnabled) {
        this.callbacks.onActivateCurrent();
      }
    });

    this.actionKeys.SPACE.on('down', () => {
      if (this.isInputEnabled) {
        this.callbacks.onActivateCurrent();
      }
    });

    this.actionKeys.ESC.on('down', () => {
      if (this.isInputEnabled) {
        this.callbacks.onEscape();
      }
    });

    this.actionKeys.F.on('down', () => {
      if (this.isInputEnabled) {
        this.callbacks.onToggleFullscreen();
      }
    });

    // Number key shortcuts
    Object.keys(this.numberKeys).forEach((key, index) => {
      this.numberKeys[key].on('down', () => {
        if (this.isInputEnabled && index < this.callbacks.getButtonCount()) {
          this.callbacks.onSelectButton(index);
        }
      });
    });
  }

  /**
   * Sets up touch controls for mobile devices
   */
  private setupTouchControls(): void {
    if (!this.isTouchDevice) return;

    // Set up pointer events for touch navigation
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.isInputEnabled) return;
      
      this.pointerStartTime = this.scene.time.now;
      this.pointerStartPosition = { x: pointer.x, y: pointer.y };
    });

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.isInputEnabled) return;
      
      const pointerDuration = this.scene.time.now - this.pointerStartTime;
      const deltaX = pointer.x - this.pointerStartPosition.x;
      const deltaY = pointer.y - this.pointerStartPosition.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Handle swipe gestures
      if (distance > this.swipeThreshold) {
        this.handleSwipeGesture(deltaX, deltaY);
      } else if (pointerDuration < this.tapThreshold) {
        // Handle tap gesture
        this.handleTapGesture(pointer);
      }
    });

    // Handle pointer move for swipe detection
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isInputEnabled || !pointer.isDown) return;
      
      const deltaX = pointer.x - this.pointerStartPosition.x;
      const deltaY = pointer.y - this.pointerStartPosition.y;
      
      // Provide visual feedback for swipe gestures
      this.handleSwipeFeedback(deltaX, deltaY);
    });
  }

  /**
   * Handles swipe gestures for navigation
   */
  private handleSwipeGesture(deltaX: number, deltaY: number): void {
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Determine primary swipe direction
    if (absDeltaX > absDeltaY) {
      // Horizontal swipe
      if (deltaX > 0) {
        this.callbacks.onNavigateRight();
      } else {
        this.callbacks.onNavigateLeft();
      }
    } else {
      // Vertical swipe
      if (deltaY > 0) {
        this.callbacks.onNavigateDown();
      } else {
        this.callbacks.onNavigateUp();
      }
    }
  }

  /**
   * Handles tap gestures for button activation
   */
  private handleTapGesture(pointer: Phaser.Input.Pointer): void {
    // Check if tap is on a button
    const hitObjects = this.scene.input.hitTestPointer(pointer);
    const buttonIndex = this.findButtonIndex(hitObjects);
    
    if (buttonIndex >= 0) {
      this.callbacks.onSelectButton(buttonIndex);
    } else {
      // Default to activating current button
      this.callbacks.onActivateCurrent();
    }
  }

  /**
   * Provides visual feedback for swipe gestures
   */
  private handleSwipeFeedback(deltaX: number, deltaY: number): void {
    // This could show visual indicators for swipe directions
    // Implementation depends on UI requirements
  }

  /**
   * Finds the button index from hit objects
   */
  private findButtonIndex(hitObjects: Phaser.GameObjects.GameObject[]): number {
    for (const obj of hitObjects) {
      if (obj.getData && obj.getData('buttonIndex') !== undefined) {
        return obj.getData('buttonIndex');
      }
    }
    return -1;
  }

  /**
   * Sets the current button index
   */
  setCurrentButtonIndex(index: number): void {
    this.currentButtonIndex = index;
  }

  /**
   * Gets the current button index
   */
  getCurrentButtonIndex(): number {
    return this.currentButtonIndex;
  }

  /**
   * Navigates up in the menu
   */
  navigateUp(): void {
    if (this.isInputEnabled) {
      this.callbacks.onNavigateUp();
    }
  }

  /**
   * Navigates down in the menu
   */
  navigateDown(): void {
    if (this.isInputEnabled) {
      this.callbacks.onNavigateDown();
    }
  }

  /**
   * Navigates left in the menu
   */
  navigateLeft(): void {
    if (this.isInputEnabled) {
      this.callbacks.onNavigateLeft();
    }
  }

  /**
   * Navigates right in the menu
   */
  navigateRight(): void {
    if (this.isInputEnabled) {
      this.callbacks.onNavigateRight();
    }
  }

  /**
   * Activates the current button
   */
  activateCurrentButton(): void {
    if (this.isInputEnabled) {
      this.callbacks.onActivateCurrent();
    }
  }

  /**
   * Selects a specific button by index
   */
  selectButton(index: number): void {
    if (this.isInputEnabled && index >= 0 && index < this.callbacks.getButtonCount()) {
      this.callbacks.onSelectButton(index);
    }
  }

  /**
   * Handles back/escape action
   */
  handleBack(): void {
    if (this.isInputEnabled) {
      this.callbacks.onBack();
    }
  }

  /**
   * Handles escape action
   */
  handleEscape(): void {
    if (this.isInputEnabled) {
      this.callbacks.onEscape();
    }
  }

  /**
   * Enables input handling
   */
  enableInput(): void {
    console.log('✅ ENABLING Menu input events');
    this.isInputEnabled = true;
  }

  /**
   * Disables input handling
   */
  disableInput(): void {
    console.log('🚫 DISABLING Menu input events');
    this.isInputEnabled = false;
  }

  /**
   * Updates input handling (called from scene update)
   */
  update(): void {
    // Menu input typically doesn't need continuous updates
    // but this can be used for any continuous input processing
  }

  /**
   * Sets swipe threshold for touch gestures
   */
  setSwipeThreshold(threshold: number): void {
    this.swipeThreshold = threshold;
  }

  /**
   * Sets tap threshold for touch gestures
   */
  setTapThreshold(threshold: number): void {
    this.tapThreshold = threshold;
  }

  /**
   * Gets current input state
   */
  getInputState(): {
    currentButtonIndex: number;
    isKeyboardEnabled: boolean;
    isTouchDevice: boolean;
    isInputEnabled: boolean;
  } {
    return {
      currentButtonIndex: this.currentButtonIndex,
      isKeyboardEnabled: this.keyboardEnabled,
      isTouchDevice: this.isTouchDevice,
      isInputEnabled: this.isInputEnabled
    };
  }

  /**
   * Resets input state
   */
  reset(): void {
    this.currentButtonIndex = 0;
    this.pointerStartTime = 0;
    this.pointerStartPosition = { x: 0, y: 0 };
  }

  /**
   * Cleanup method to remove event listeners
   */
  destroy(): void {
    if (this.scene.input.keyboard) {
      this.scene.input.keyboard.removeAllListeners();
    }
    
    // Remove pointer event listeners
    this.scene.input.removeAllListeners();
  }
}
