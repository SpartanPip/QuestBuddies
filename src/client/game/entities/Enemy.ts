import * as Phaser from 'phaser';
import { Position, ENEMY_TYPES } from '../../../shared/types/level';
import { Player } from './Player';

export class Enemy extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Image;
  private healthBar: Phaser.GameObjects.Graphics;
  private healthBarBg: Phaser.GameObjects.Graphics;
  
  private health: number;
  private maxHealth: number;
  private enemyType: number;
  private moveSpeed: number;
  private jitterTimer: number = 0;
  private jitterDirection: Position = { x: 0, y: 0 };
  private jitterInterval: number = 1000; // Change jitter every 1 second
  private detectionRange: number = 200;
  
  // Boid behavior properties
  private separationRadius: number = 30;
  private separationForce: number = 50;
  
  constructor(scene: Phaser.Scene, x: number, y: number, type: number = ENEMY_TYPES.BASIC) {
    super(scene, x, y);
    
    this.enemyType = type;
    this.setupEnemyStats();
    this.createSprite();
    this.createHealthBar();
    
    scene.add.existing(this);
    
    // Add physics body if physics system is available
    if (scene.physics && scene.physics.add) {
      scene.physics.add.existing(this);
      
      // Enable physics body
      const body = this.body as Phaser.Physics.Arcade.Body;
      if (body) {
        body.setSize(20, 20);
        body.setCollideWorldBounds(true);
      }
    }
    
    // Set enemy data for identification
    this.setData('isEnemy', true);
    this.setData('enemyId', `enemy_${Date.now()}_${Math.random()}`);
    this.setData('health', this.health);
    this.setData('maxHealth', this.maxHealth);
  }

  private setupEnemyStats(): void {
    switch (this.enemyType) {
      case ENEMY_TYPES.FAST:
        this.health = 15;
        this.maxHealth = 15;
        this.moveSpeed = 80;
        break;
      case ENEMY_TYPES.HEAVY:
        this.health = 50;
        this.maxHealth = 50;
        this.moveSpeed = 40;
        break;
      case ENEMY_TYPES.BASIC:
      default:
        this.health = 20;
        this.maxHealth = 20;
        this.moveSpeed = 60;
        break;
    }
  }

  private createSprite(): void {
    let spriteKey: string;
    let scale: number;
    let tint: number | undefined;
    
    switch (this.enemyType) {
      case ENEMY_TYPES.FAST:
        spriteKey = 'enemy-bug2'; // Use bug 2 for fast enemies
        scale = 0.3;
        tint = 0xff6600; // Orange tint for fast enemies
        break;
      case ENEMY_TYPES.HEAVY:
        spriteKey = 'enemy-bug3'; // Use bug 3 for heavy enemies
        scale = 0.5;
        tint = 0x660066; // Purple tint for heavy enemies
        break;
      case ENEMY_TYPES.BASIC:
      default:
        spriteKey = 'enemy-bug1'; // Use bug 1 for basic enemies
        scale = 0.4;
        tint = 0xff0000; // Red tint for basic enemies
        break;
    }
    
    this.sprite = this.scene.add.image(0, 0, spriteKey);
    this.sprite.setScale(scale);
    if (tint) {
      this.sprite.setTint(tint);
    }
    this.add(this.sprite);
  }

  private createHealthBar(): void {
    const barWidth = 24;
    const barHeight = 4;
    const barY = -18;
    
    // Background
    this.healthBarBg = this.scene.add.graphics();
    this.healthBarBg.fillStyle(0x000000, 0.8);
    this.healthBarBg.fillRect(-barWidth / 2, barY, barWidth, barHeight);
    this.add(this.healthBarBg);
    
    // Health bar
    this.healthBar = this.scene.add.graphics();
    this.updateHealthBar();
    this.add(this.healthBar);
  }

  private updateHealthBar(): void {
    if (!this.healthBar) return;
    
    this.healthBar.clear();
    
    const barWidth = 24;
    const barHeight = 4;
    const barY = -18;
    const healthPercent = this.health / this.maxHealth;
    const currentWidth = barWidth * healthPercent;
    
    // Health bar color based on health percentage
    let color = 0x00ff00; // Green
    if (healthPercent < 0.6) color = 0xffff00; // Yellow
    if (healthPercent < 0.3) color = 0xff0000; // Red
    
    this.healthBar.fillStyle(color);
    this.healthBar.fillRect(-barWidth / 2, barY, currentWidth, barHeight);
  }

  override update(_time: number, delta: number, player: Player, enemies: Enemy[]): void {
    if (!this.active || this.health <= 0) return;
    
    this.updateJitter(delta);
    this.updateMovement(player, enemies);
    this.updateHealthBar();
  }

  private updateJitter(delta: number): void {
    this.jitterTimer += delta;
    
    if (this.jitterTimer >= this.jitterInterval) {
      // Generate new random jitter direction
      this.jitterDirection = {
        x: (Math.random() - 0.5) * 2, // -1 to 1
        y: (Math.random() - 0.5) * 2  // -1 to 1
      };
      
      this.jitterTimer = 0;
      // Vary the interval slightly to make movement less predictable
      this.jitterInterval = 800 + Math.random() * 400; // 800-1200ms
    }
  }

  private updateMovement(player: Player, enemies: Enemy[]): void {
    const playerPos = player.getPosition();
    const myPos = { x: this.x, y: this.y };
    
    // Calculate distance to player
    const distanceToPlayer = Phaser.Math.Distance.Between(
      myPos.x, myPos.y, playerPos.x, playerPos.y
    );
    
    // Only move if player is within detection range
    if (distanceToPlayer > this.detectionRange) {
      this.setVelocity(0, 0);
      return;
    }
    
    // Calculate movement toward player (boid seek behavior)
    const seekForce = this.calculateSeekForce(playerPos, myPos);
    
    // Calculate separation force from other enemies
    const separationForce = this.calculateSeparationForce(enemies, myPos);
    
    // Apply jitter for unpredictable movement
    const jitterForce = {
      x: this.jitterDirection.x * 20,
      y: this.jitterDirection.y * 20
    };
    
    // Combine all forces
    const totalForceX = seekForce.x + separationForce.x + jitterForce.x;
    const totalForceY = seekForce.y + separationForce.y + jitterForce.y;
    
    // Normalize and apply speed
    const magnitude = Math.sqrt(totalForceX * totalForceX + totalForceY * totalForceY);
    if (magnitude > 0) {
      const normalizedX = (totalForceX / magnitude) * this.moveSpeed;
      const normalizedY = (totalForceY / magnitude) * this.moveSpeed;
      
      this.setVelocity(normalizedX, normalizedY);
    } else {
      this.setVelocity(0, 0);
    }
  }

  private calculateSeekForce(playerPos: Position, myPos: Position): Position {
    const directionX = playerPos.x - myPos.x;
    const directionY = playerPos.y - myPos.y;
    const distance = Math.sqrt(directionX * directionX + directionY * directionY);
    
    if (distance === 0) return { x: 0, y: 0 };
    
    // Normalize direction and apply seek strength
    return {
      x: (directionX / distance) * 100,
      y: (directionY / distance) * 100
    };
  }

  private calculateSeparationForce(enemies: Enemy[], myPos: Position): Position {
    let separationX = 0;
    let separationY = 0;
    let neighborCount = 0;
    
    enemies.forEach(enemy => {
      if (enemy === this || !enemy.active) return;
      
      const distance = Phaser.Math.Distance.Between(
        myPos.x, myPos.y, enemy.x, enemy.y
      );
      
      if (distance < this.separationRadius && distance > 0) {
        // Calculate separation vector (away from neighbor)
        const separationVecX = (myPos.x - enemy.x) / distance;
        const separationVecY = (myPos.y - enemy.y) / distance;
        
        // Weight by inverse distance (closer = stronger separation)
        const weight = (this.separationRadius - distance) / this.separationRadius;
        
        separationX += separationVecX * weight;
        separationY += separationVecY * weight;
        neighborCount++;
      }
    });
    
    if (neighborCount > 0) {
      separationX = (separationX / neighborCount) * this.separationForce;
      separationY = (separationY / neighborCount) * this.separationForce;
    }
    
    return { x: separationX, y: separationY };
  }

  private setVelocity(x: number, y: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setVelocity(x, y);
    }
  }

  takeDamage(damage: number): void {
    this.health = Math.max(0, this.health - damage);
    this.setData('health', this.health);
    
    // Visual feedback for taking damage
    const originalTint = this.sprite.tint;
    this.sprite.setTint(0xffffff);
    
    this.scene.time.delayedCall(100, () => {
      if (this.sprite && this.sprite.scene) {
        this.sprite.setTint(originalTint);
      }
    });
    
    // Remove enemy if health reaches zero
    if (this.health <= 0) {
      this.destroy();
    }
  }

  getHealth(): number {
    return this.health;
  }

  getMaxHealth(): number {
    return this.maxHealth;
  }

  getEnemyType(): number {
    return this.enemyType;
  }

  isAlive(): boolean {
    return this.health > 0;
  }

  getPosition(): Position {
    return { x: this.x, y: this.y };
  }
}