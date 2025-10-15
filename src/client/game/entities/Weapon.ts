import * as Phaser from 'phaser';
import { Position } from '../../../shared/types/level';

export class Weapon extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Image;
  private damage: number = 10;
  private range: number = 64;
  private weaponAngle: number = 0;
  private rotationSpeed: number = 2; // radians per second
  private orbitRadius: number = 40;
  private lastDamageTime: Map<string, number> = new Map();
  private damageCooldown: number = 500; // milliseconds
  private weaponType: 'sword' | 'axe';

  constructor(scene: Phaser.Scene, x: number, y: number, weaponType: 'sword' | 'axe' = 'sword') {
    super(scene, x, y);
    
    this.weaponType = weaponType;
    this.createSprite();
    scene.add.existing(this);
  }

  private createSprite(): void {
    // Create weapon sprite based on weapon type
    const weaponTexture = `weapon-${this.weaponType}`;
    this.sprite = this.scene.add.image(0, 0, weaponTexture);
    this.sprite.setScale(0.3); // Scale down to appropriate size
    this.add(this.sprite);
  }

  updateWeapon(delta: number, enemies?: any[]): void {
    this.updateRotation(delta);
    if (enemies) {
      this.checkEnemyCollisions(enemies);
    }
  }

  private updateRotation(delta: number): void {
    // Update angle based on rotation speed
    this.weaponAngle += (this.rotationSpeed * delta) / 1000;
    
    // Keep angle in 0-2π range
    if (this.weaponAngle > Math.PI * 2) {
      this.weaponAngle -= Math.PI * 2;
    }
    
    // Calculate orbital position relative to parent (player)
    const offsetX = Math.cos(this.weaponAngle) * this.orbitRadius;
    const offsetY = Math.sin(this.weaponAngle) * this.orbitRadius;
    
    // Update position relative to container
    this.sprite.setPosition(offsetX, offsetY);
    
    // Rotate the weapon sprite to face the direction of movement
    this.sprite.setRotation(this.weaponAngle + Math.PI / 2);
  }

  checkEnemyCollisions(enemies: any[]): void {
    // Get weapon world position
    const weaponWorldPos = this.getWeaponWorldPosition();
    
    enemies.forEach(enemy => {
      if (!enemy.active || !enemy.isAlive()) return;
      
      const enemyId = enemy.getData('enemyId');
      const distance = Phaser.Math.Distance.Between(
        weaponWorldPos.x, weaponWorldPos.y,
        enemy.x, enemy.y
      );

      // Check if enemy is within weapon range
      if (distance <= this.range) {
        this.dealDamageToEnemy(enemy, enemyId);
      }
    });
  }

  private dealDamageToEnemy(enemy: any, enemyId: string): void {
    const currentTime = Date.now();
    const lastDamage = this.lastDamageTime.get(enemyId) || 0;

    // Check cooldown
    if (currentTime - lastDamage >= this.damageCooldown) {
      // Deal damage using enemy's takeDamage method
      enemy.takeDamage(this.damage);
      
      // Update last damage time
      this.lastDamageTime.set(enemyId, currentTime);
      
      // Visual feedback for damage
      this.createDamageEffect(enemy.x, enemy.y);
      
      // Clean up damage time tracking if enemy is destroyed
      if (!enemy.isAlive()) {
        this.lastDamageTime.delete(enemyId);
      }
    }
  }

  private createDamageEffect(x: number, y: number): void {
    // Create a small explosion effect
    const effect = this.scene.add.arc(x, y, 8, 0, 360, false, 0xffff00, 0.8);
    
    // Animate the effect
    this.scene.tweens.add({
      targets: effect,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        effect.destroy();
      }
    });
  }

  private getWeaponWorldPosition(): Position {
    // Transform local position to world coordinates
    const worldX = this.x + this.sprite.x;
    const worldY = this.y + this.sprite.y;
    
    return { x: worldX, y: worldY };
  }

  getDamage(): number {
    return this.damage;
  }

  getRange(): number {
    return this.range;
  }

  setRotationSpeed(speed: number): void {
    this.rotationSpeed = speed;
  }

  setOrbitRadius(radius: number): void {
    this.orbitRadius = radius;
  }
}