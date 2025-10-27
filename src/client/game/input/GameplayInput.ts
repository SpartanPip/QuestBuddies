import * as Phaser from 'phaser';
import { Player } from '../entities/Player';
import { GRID_SIZE } from '../../../shared/types/level';

export interface GameplayInputCallbacks {
  onPlayerMovement: (velocityX: number, velocityY: number) => void;
  onPlayerAttack: () => void;
  onPlayerInteract: () => void;
  onPauseGame: () => void;
  onShowInventory: () => void;
  onToggleFullscreen: () => void;
  onRestartLevel: () => void;
  onReturnToMenu: () => void;
  getPlayer: () => Player | null;
  isGamePaused: () => boolean;
  isGameOver: () => boolean;
}

export class GameplayInput {
  private scene: Phaser.Scene;
  private callbacks: GameplayInputCallbacks;
  
  // Keyboard controls
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasdKeys: { [key: string]: Phaser.Input.Keyboard.Key } = {};
  private actionKeys: { [key: string]: Phaser.Input.Keyboard.Key } = {};
  
  // Touch controls
  private virtualJoystick: any | null = null;
  private isTouchDevice: boolean = false;
  private touchControls: {
    attackButton: Phaser.GameObjects.Graphics | null;
    interactButton: Phaser.GameObjects.Graphics | null;
    pauseButton: Phaser.GameObjects.Graphics | null;
  } = {
    attackButton: null,
    interactButton: null,
    pauseButton: null
  };
  
  // Input state
  private isInputEnabled: boolean = true;
  private lastAttackTime: number = 0;
  private attackCooldown: number = 500; // 500ms cooldown between attacks

  constructor(scene: Phaser.Scene, callbacks: GameplayInputCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
    
    this.setupKeyboardControls();
    this.setupTouchControls();
    this.setupGameStateControls();
  }

  /**
   * Sets up keyboard controls for player movement and actions
   */
  private setupKeyboardControls(): void {
    if (!this.scene.input.keyboard) return;

    // Movement controls
    this.cursors = this.scene.input.keyboard.createCursorKeys();
    
    // WASD movement
    this.wasdKeys = {
      W: this.scene.input.keyboard.addKey('W'),
      A: this.scene.input.keyboard.addKey('A'),
      S: this.scene.input.keyboard.addKey('S'),
      D: this.scene.input.keyboard.addKey('D')
    };

    // Action controls
    this.actionKeys = {
      SPACE: this.scene.input.keyboard.addKey('SPACE'), // Attack
      E: this.scene.input.keyboard.addKey('E'),         // Interact
      ESC: this.scene.input.keyboard.addKey('ESC'),     // Pause
      I: this.scene.input.keyboard.addKey('I'),         // Inventory
      F: this.scene.input.keyboard.addKey('F'),         // Fullscreen
      R: this.scene.input.keyboard.addKey('R'),         // Restart
      M: this.scene.input.keyboard.addKey('M')          // Menu
    };

    // Set up event listeners
    this.setupActionKeyListeners();
  }

  /**
   * Sets up action key event listeners
   */
  private setupActionKeyListeners(): void {
    // Attack
    this.actionKeys.SPACE.on('down', () => {
      if (this.isInputEnabled && !this.callbacks.isGamePaused()) {
        this.handleAttack();
      }
    });

    // Interact
    this.actionKeys.E.on('down', () => {
      if (this.isInputEnabled && !this.callbacks.isGamePaused()) {
        this.callbacks.onPlayerInteract();
      }
    });

    // Pause
    this.actionKeys.ESC.on('down', () => {
      if (this.isInputEnabled) {
        this.callbacks.onPauseGame();
      }
    });

    // Inventory
    this.actionKeys.I.on('down', () => {
      if (this.isInputEnabled && !this.callbacks.isGamePaused()) {
        this.callbacks.onShowInventory();
      }
    });

    // Fullscreen
    this.actionKeys.F.on('down', () => {
      if (this.isInputEnabled) {
        this.callbacks.onToggleFullscreen();
      }
    });

    // Restart (only when game is over)
    this.actionKeys.R.on('down', () => {
      if (this.isInputEnabled && this.callbacks.isGameOver()) {
        this.callbacks.onRestartLevel();
      }
    });

    // Return to menu
    this.actionKeys.M.on('down', () => {
      if (this.isInputEnabled) {
        this.callbacks.onReturnToMenu();
      }
    });
  }

  /**
   * Sets up touch controls for mobile devices
   */
  private setupTouchControls(): void {
    this.isTouchDevice = this.scene.sys.game.device.input.touch;
    
    if (this.isTouchDevice) {
      this.createVirtualJoystick();
      this.createTouchButtons();
    }
  }

  /**
   * Creates virtual joystick for movement
   */
  private createVirtualJoystick(): void {
    // This would integrate with a virtual joystick library
    // For now, we'll create a simple touch area for movement
    const joystickArea = this.scene.add.graphics();
    joystickArea.fillStyle(0x000000, 0.3);
    joystickArea.fillCircle(100, this.scene.cameras.main.height - 100, 60);
    joystickArea.setScrollFactor(0, 0);
    joystickArea.setDepth(1000);
    joystickArea.setInteractive();
    
    // Add touch movement handling
    joystickArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handleTouchMovement(pointer);
    });
    
    joystickArea.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) {
        this.handleTouchMovement(pointer);
      }
    });
    
    joystickArea.on('pointerup', () => {
      this.handleTouchMovementStop();
    });
  }

  /**
   * Creates touch buttons for actions
   */
  private createTouchButtons(): void {
    const buttonSize = 50;
    const buttonSpacing = 60;
    const buttonY = this.scene.cameras.main.height - 50;

    // Attack button
    this.touchControls.attackButton = this.createTouchButton(
      this.scene.cameras.main.width - buttonSize * 3 - buttonSpacing * 2,
      buttonY,
      buttonSize,
      0xFF4444,
      'ATK',
      () => this.handleAttack()
    );

    // Interact button
    this.touchControls.interactButton = this.createTouchButton(
      this.scene.cameras.main.width - buttonSize * 2 - buttonSpacing,
      buttonY,
      buttonSize,
      0x44FF44,
      'USE',
      () => this.callbacks.onPlayerInteract()
    );

    // Pause button
    this.touchControls.pauseButton = this.createTouchButton(
      this.scene.cameras.main.width - buttonSize,
      buttonY,
      buttonSize,
      0x4444FF,
      'PAUSE',
      () => this.callbacks.onPauseGame()
    );
  }

  /**
   * Creates a touch button
   */
  private createTouchButton(x: number, y: number, size: number, color: number, label: string, callback: () => void): Phaser.GameObjects.Graphics {
    const button = this.scene.add.graphics();
    button.fillStyle(color, 0.8);
    button.fillCircle(x, y, size / 2);
    button.lineStyle(2, 0xFFFFFF, 0.8);
    button.strokeCircle(x, y, size / 2);
    
    button.setScrollFactor(0, 0);
    button.setDepth(1000);
    button.setInteractive();
    
    // Add label
    const text = this.scene.add.text(x, y, label, {
      fontSize: '12px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0, 0).setDepth(1001);
    
    button.on('pointerdown', () => {
      if (this.isInputEnabled && !this.callbacks.isGamePaused()) {
        callback();
      }
    });
    
    // Hover effect
    button.on('pointerover', () => {
      button.clear();
      button.fillStyle(color, 1.0);
      button.fillCircle(x, y, size / 2);
      button.lineStyle(2, 0xFFFFFF, 1.0);
      button.strokeCircle(x, y, size / 2);
    });
    
    button.on('pointerout', () => {
      button.clear();
      button.fillStyle(color, 0.8);
      button.fillCircle(x, y, size / 2);
      button.lineStyle(2, 0xFFFFFF, 0.8);
      button.strokeCircle(x, y, size / 2);
    });
    
    return button;
  }

  /**
   * Sets up game state controls (pause, restart, etc.)
   */
  private setupGameStateControls(): void {
    // These are handled by the action key listeners
    // Additional game state controls can be added here
  }

  /**
   * Handles player movement input
   */
  handleMovement(): void {
    if (!this.isInputEnabled || this.callbacks.isGamePaused()) return;

    let velocityX = 0;
    let velocityY = 0;

    // Keyboard input
    if (this.cursors?.left.isDown || this.wasdKeys?.A?.isDown) {
      velocityX = -1;
    } else if (this.cursors?.right.isDown || this.wasdKeys?.D?.isDown) {
      velocityX = 1;
    }

    if (this.cursors?.up.isDown || this.wasdKeys?.W?.isDown) {
      velocityY = -1;
    } else if (this.cursors?.down.isDown || this.wasdKeys?.S?.isDown) {
      velocityY = 1;
    }

    // Touch input override (if virtual joystick is active)
    if (this.virtualJoystick && this.virtualJoystick.isActive()) {
      const joystickInput = this.virtualJoystick.getInput();
      velocityX = joystickInput.x;
      velocityY = joystickInput.y;
    }

    // Normalize diagonal movement
    if (velocityX !== 0 && velocityY !== 0) {
      const normalizer = Math.sqrt(2) / 2;
      velocityX *= normalizer;
      velocityY *= normalizer;
    }

    this.callbacks.onPlayerMovement(velocityX, velocityY);
  }

  /**
   * Handles attack input with cooldown
   */
  private handleAttack(): void {
    const currentTime = this.scene.time.now;
    if (currentTime - this.lastAttackTime >= this.attackCooldown) {
      this.lastAttackTime = currentTime;
      this.callbacks.onPlayerAttack();
    }
  }

  /**
   * Handles touch movement input
   */
  private handleTouchMovement(pointer: Phaser.Input.Pointer): void {
    if (!this.isInputEnabled || this.callbacks.isGamePaused()) return;

    const joystickCenterX = 100;
    const joystickCenterY = this.scene.cameras.main.height - 100;
    const joystickRadius = 60;

    const deltaX = pointer.x - joystickCenterX;
    const deltaY = pointer.y - joystickCenterY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > 0) {
      const normalizedX = deltaX / Math.max(distance, joystickRadius);
      const normalizedY = deltaY / Math.max(distance, joystickRadius);
      
      // Clamp to joystick radius
      const clampedX = Math.max(-1, Math.min(1, deltaX / joystickRadius));
      const clampedY = Math.max(-1, Math.min(1, deltaY / joystickRadius));
      
      this.callbacks.onPlayerMovement(clampedX, clampedY);
    }
  }

  /**
   * Handles touch movement stop
   */
  private handleTouchMovementStop(): void {
    this.callbacks.onPlayerMovement(0, 0);
  }

  /**
   * Enables input handling
   */
  enableInput(): void {
    console.log('✅ ENABLING Gameplay input events');
    this.isInputEnabled = true;
  }

  /**
   * Disables input handling
   */
  disableInput(): void {
    console.log('🚫 DISABLING Gameplay input events');
    this.isInputEnabled = false;
  }

  /**
   * Updates input handling (called from scene update)
   */
  update(): void {
    if (this.isInputEnabled && !this.callbacks.isGamePaused()) {
      this.handleMovement();
    }
  }

  /**
   * Shows/hides touch controls
   */
  setTouchControlsVisible(visible: boolean): void {
    if (this.isTouchDevice) {
      // Show/hide virtual joystick and touch buttons
      // Implementation depends on the virtual joystick library used
    }
  }

  /**
   * Sets attack cooldown
   */
  setAttackCooldown(cooldown: number): void {
    this.attackCooldown = cooldown;
  }

  /**
   * Gets current input state
   */
  getInputState(): {
    movementX: number;
    movementY: number;
    isAttacking: boolean;
    isInteracting: boolean;
  } {
    let movementX = 0;
    let movementY = 0;

    // Calculate movement from keyboard
    if (this.cursors?.left.isDown || this.wasdKeys?.A?.isDown) {
      movementX = -1;
    } else if (this.cursors?.right.isDown || this.wasdKeys?.D?.isDown) {
      movementX = 1;
    }

    if (this.cursors?.up.isDown || this.wasdKeys?.W?.isDown) {
      movementY = -1;
    } else if (this.cursors?.down.isDown || this.wasdKeys?.S?.isDown) {
      movementY = 1;
    }

    return {
      movementX,
      movementY,
      isAttacking: this.actionKeys.SPACE.isDown,
      isInteracting: this.actionKeys.E.isDown
    };
  }

  /**
   * Cleanup method to remove event listeners
   */
  destroy(): void {
    if (this.scene.input.keyboard) {
      this.scene.input.keyboard.removeAllListeners();
    }
    
    // Clean up touch controls
    if (this.touchControls.attackButton) {
      this.touchControls.attackButton.destroy();
    }
    if (this.touchControls.interactButton) {
      this.touchControls.interactButton.destroy();
    }
    if (this.touchControls.pauseButton) {
      this.touchControls.pauseButton.destroy();
    }
  }
}
