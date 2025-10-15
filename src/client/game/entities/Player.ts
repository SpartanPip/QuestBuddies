import * as Phaser from 'phaser';
import { Position, GRID_SIZE } from '../../../shared/types/level';
import { Weapon } from './Weapon';
import { CustomizationData } from '../utils/StorageUtils';

export class Player extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Image;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys: { [key: string]: Phaser.Input.Keyboard.Key };
  private moveSpeed: number = 150;
  private health: number = 100;
  private maxHealth: number = 100;
  private weapon: Weapon;
  
  // Touch controls
  private virtualJoystick: VirtualJoystick | null = null;
  private isTouchDevice: boolean = false;
  
  // Customization data
  private customization: CustomizationData;

  constructor(scene: Phaser.Scene, x: number, y: number, customization?: CustomizationData) {
    super(scene, x, y);
    
    // Set customization data with defaults
    this.customization = customization || { avatar: 'boy', weapon: 'sword' };
    
    this.createSprite();
    this.setupInput();
    this.setupTouchControls();
    this.createWeapon();
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    // Enable physics body
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(24, 24);
    body.setCollideWorldBounds(true);
  }

  private createSprite(): void {
    // Use customization data to determine avatar
    const avatarTexture = `player-${this.customization.avatar}`;
    this.sprite = this.scene.add.image(0, 0, avatarTexture);
    this.sprite.setScale(0.5); // Scale down to appropriate size
    this.add(this.sprite);
  }

  private setupInput(): void {
    // Arrow keys
    this.cursors = this.scene.input.keyboard!.createCursorKeys();
    
    // WASD keys
    this.wasdKeys = this.scene.input.keyboard!.addKeys('W,S,A,D') as { [key: string]: Phaser.Input.Keyboard.Key };
  }

  private setupTouchControls(): void {
    // Detect if touch device by checking if we have touch capability
    this.isTouchDevice = 'ontouchstart' in window;
    
    if (this.isTouchDevice) {
      this.virtualJoystick = new VirtualJoystick(this.scene);
    }
  }

  override update(_time?: number, delta?: number, enemies?: any[]): void {
    this.handleMovement();
    
    if (this.weapon && delta !== undefined) {
      this.weapon.updateWeapon(delta, enemies);
    }
  }

  private createWeapon(): void {
    this.weapon = new Weapon(this.scene, 0, 0, this.customization.weapon);
    this.add(this.weapon);
  }

  private handleMovement(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    let velocityX = 0;
    let velocityY = 0;

    // Keyboard input
    if (this.cursors?.left.isDown || this.wasdKeys?.A?.isDown) {
      velocityX = -this.moveSpeed;
    } else if (this.cursors?.right.isDown || this.wasdKeys?.D?.isDown) {
      velocityX = this.moveSpeed;
    }

    if (this.cursors?.up.isDown || this.wasdKeys?.W?.isDown) {
      velocityY = -this.moveSpeed;
    } else if (this.cursors?.down.isDown || this.wasdKeys?.S?.isDown) {
      velocityY = this.moveSpeed;
    }

    // Touch input override
    if (this.virtualJoystick && this.virtualJoystick.isActive()) {
      const joystickInput = this.virtualJoystick.getInput();
      velocityX = joystickInput.x * this.moveSpeed;
      velocityY = joystickInput.y * this.moveSpeed;
    }

    // Normalize diagonal movement
    if (velocityX !== 0 && velocityY !== 0) {
      const normalizer = Math.sqrt(2) / 2;
      velocityX *= normalizer;
      velocityY *= normalizer;
    }

    body.setVelocity(velocityX, velocityY);
  }

  getPosition(): Position {
    return { x: this.x, y: this.y };
  }

  getGridPosition(): Position {
    return {
      x: Math.floor(this.x / GRID_SIZE),
      y: Math.floor(this.y / GRID_SIZE)
    };
  }

  takeDamage(damage: number): void {
    this.health = Math.max(0, this.health - damage);
    
    // Visual feedback for taking damage
    this.sprite.setTint(0xff0000);
    this.scene.time.delayedCall(200, () => {
      this.sprite.clearTint();
    });
  }

  getHealth(): number {
    return this.health;
  }

  getMaxHealth(): number {
    return this.maxHealth;
  }

  isAlive(): boolean {
    return this.health > 0;
  }

  getWeapon(): Weapon {
    return this.weapon;
  }
}

class VirtualJoystick {
  private scene: Phaser.Scene;
  private base: Phaser.GameObjects.Arc;
  private thumb: Phaser.GameObjects.Arc;
  private isDragging: boolean = false;
  private baseRadius: number = 50;
  private thumbRadius: number = 20;
  private maxDistance: number = 30;
  private inputVector: { x: number; y: number } = { x: 0, y: 0 };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createJoystick();
    this.setupInput();
  }

  private createJoystick(): void {
    const camera = this.scene.cameras.main;
    const baseX = this.baseRadius + 20;
    const baseY = camera.height - this.baseRadius - 20;

    // Create base
    this.base = this.scene.add.arc(baseX, baseY, this.baseRadius, 0, 360, false, 0x333333, 0.3);
    this.base.setStrokeStyle(2, 0x666666, 0.5);
    this.base.setScrollFactor(0); // Fixed to camera

    // Create thumb
    this.thumb = this.scene.add.arc(baseX, baseY, this.thumbRadius, 0, 360, false, 0x666666, 0.7);
    this.thumb.setStrokeStyle(2, 0x999999);
    this.thumb.setScrollFactor(0); // Fixed to camera
    this.thumb.setInteractive();
  }

  private setupInput(): void {
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const distance = Phaser.Math.Distance.Between(
        pointer.x, pointer.y,
        this.base.x, this.base.y
      );
      
      if (distance <= this.baseRadius) {
        this.isDragging = true;
      }
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        this.updateThumbPosition(pointer.x, pointer.y);
      }
    });

    this.scene.input.on('pointerup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.resetThumb();
      }
    });
  }

  private updateThumbPosition(pointerX: number, pointerY: number): void {
    const distance = Phaser.Math.Distance.Between(
      pointerX, pointerY,
      this.base.x, this.base.y
    );

    if (distance <= this.maxDistance) {
      this.thumb.setPosition(pointerX, pointerY);
    } else {
      const angle = Phaser.Math.Angle.Between(
        this.base.x, this.base.y,
        pointerX, pointerY
      );
      
      this.thumb.setPosition(
        this.base.x + Math.cos(angle) * this.maxDistance,
        this.base.y + Math.sin(angle) * this.maxDistance
      );
    }

    // Calculate input vector
    const deltaX = this.thumb.x - this.base.x;
    const deltaY = this.thumb.y - this.base.y;
    
    this.inputVector.x = deltaX / this.maxDistance;
    this.inputVector.y = deltaY / this.maxDistance;
  }

  private resetThumb(): void {
    this.thumb.setPosition(this.base.x, this.base.y);
    this.inputVector.x = 0;
    this.inputVector.y = 0;
  }

  isActive(): boolean {
    return this.isDragging;
  }

  getInput(): { x: number; y: number } {
    return { ...this.inputVector };
  }
}