import * as Phaser from 'phaser';
import { ColorTheme } from '../utils/ColorTheme';

export class PlayerHealthBar {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Graphics;
  private healthBar: Phaser.GameObjects.Graphics;
  private healthText: Phaser.GameObjects.Text;
  
  private barWidth: number = 200;
  private barHeight: number = 20;
  private maxHealth: number = 100;
  private currentHealth: number = 100;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createHealthBar();
  }

  private createHealthBar(): void {
    // Create container for the health bar
    this.container = this.scene.add.container(0, 0);
    this.container.setScrollFactor(0); // Fixed to camera
    
    // Position at top center of screen
    const camera = this.scene.cameras.main;
    this.container.setPosition(camera.width / 2, 30);
    
    // Create background
    this.background = this.scene.add.graphics();
    this.background.fillStyle(ColorTheme.HEALTH_BACKGROUND, 0.9);
    this.background.fillRect(-this.barWidth / 2 - 2, -this.barHeight / 2 - 2, this.barWidth + 4, this.barHeight + 4);
    this.container.add(this.background);
    
    // Create health bar
    this.healthBar = this.scene.add.graphics();
    this.container.add(this.healthBar);
    
    // Create health text
    this.healthText = this.scene.add.text(0, 0, '', {
      fontSize: '14px',
      color: ColorTheme.TEXT_PRIMARY,
      fontFamily: 'Arial Black',
      stroke: '#000000',
      strokeThickness: 2
    });
    this.healthText.setOrigin(0.5, 0.5);
    this.container.add(this.healthText);
    
    this.updateDisplay();
  }

  updateHealth(currentHealth: number, maxHealth: number): void {
    this.currentHealth = Math.max(0, currentHealth);
    this.maxHealth = maxHealth;
    this.updateDisplay();
  }

  private updateDisplay(): void {
    if (!this.healthBar || !this.healthText) return;
    
    // Clear and redraw health bar
    this.healthBar.clear();
    
    const healthPercent = this.currentHealth / this.maxHealth;
    const currentWidth = this.barWidth * healthPercent;
    
    // Health bar color based on health percentage using theme colors
    const color = ColorTheme.getHealthColor(healthPercent);
    
    this.healthBar.fillStyle(color);
    this.healthBar.fillRect(-this.barWidth / 2, -this.barHeight / 2, currentWidth, this.barHeight);
    
    // Update text
    this.healthText.setText(`${this.currentHealth} / ${this.maxHealth}`);
  }

  destroy(): void {
    if (this.container) {
      this.container.destroy();
    }
  }

  setVisible(visible: boolean): void {
    if (this.container) {
      this.container.setVisible(visible);
    }
  }
}