import { Scene, GameObjects } from 'phaser';
import { StorageUtils, CustomizationData } from '../utils/StorageUtils';
import { MenuButton } from '../ui/MenuButton';
import { ColorTheme } from '../utils/ColorTheme';

interface CustomizationCarousel {
  type: 'avatar' | 'weapon';
  title: GameObjects.Text;
  container: GameObjects.Container;
  leftArrow: MenuButton;
  rightArrow: MenuButton;
  currentImage: GameObjects.Image;
  currentIndex: number;
  options: string[];
}

export class Customize extends Scene {
  private background: GameObjects.Image | null = null;
  private title: GameObjects.Text | null = null;
  private currentCustomization: CustomizationData;
  private originalCustomization: CustomizationData;
  
  // Layout containers
  private headerContainer: GameObjects.Container | null = null;
  private scrollContainer: GameObjects.Container | null = null;
  private footerContainer: GameObjects.Container | null = null;
  
  // Customization carousels
  private avatarCarousel: CustomizationCarousel | null = null;
  private weaponCarousel: CustomizationCarousel | null = null;
  private carousels: CustomizationCarousel[] = [];
  
  // Navigation buttons
  private backButton: MenuButton | null = null;
  private saveButton: MenuButton | null = null;
  
  // Scroll management
  private scrollY: number = 0;
  private maxScrollY: number = 0;
  private contentHeight: number = 0;
  private scrollAreaHeight: number = 0;
  
  // Keyboard navigation
  private keyboardEnabled: boolean = false;

  constructor() {
    super('Customize');
  }

  init(data?: { customization?: CustomizationData }): void {
    // Reset cached GameObject references
    this.background = null;
    this.title = null;
    
    // Reset containers
    this.headerContainer?.destroy();
    this.scrollContainer?.destroy();
    this.footerContainer?.destroy();
    this.headerContainer = null;
    this.scrollContainer = null;
    this.footerContainer = null;
    
    // Clear existing carousels
    this.carousels.forEach(carousel => {
      carousel.container?.destroy();
      carousel.leftArrow?.destroy();
      carousel.rightArrow?.destroy();
    });
    this.carousels = [];
    this.avatarCarousel = null;
    this.weaponCarousel = null;
    
    // Destroy existing navigation buttons
    this.backButton?.destroy();
    this.saveButton?.destroy();
    this.backButton = null;
    this.saveButton = null;
    
    // Reset scroll state
    this.scrollY = 0;
    this.maxScrollY = 0;
    this.contentHeight = 0;
    this.scrollAreaHeight = 0;
    
    // Load customization data - always ensure we have valid defaults
    this.originalCustomization = data?.customization || StorageUtils.loadCustomization();
    this.currentCustomization = { ...this.originalCustomization };
    
    // Ensure we have valid defaults if no customization exists
    if (!StorageUtils.hasCustomization()) {
      const defaults = StorageUtils.getDefaultCustomization();
      this.currentCustomization = { ...defaults };
      this.originalCustomization = { ...defaults };
    }
  }

  create(): void {
    this.refreshLayout();
    
    // Re-calculate positions whenever the game canvas is resized
    this.scale.on('resize', () => this.refreshLayout());
    
    // Setup keyboard navigation
    this.setupKeyboardNavigation();
    
    // Setup scroll input
    this.setupScrollInput();
  }

  private refreshLayout(): void {
    const { width, height } = this.scale;
    
    // Resize camera to new viewport
    this.cameras.resize(width, height);
    
    // Background
    if (!this.background) {
      this.background = this.add.image(0, 0, 'background').setOrigin(0);
    }
    this.background.setDisplaySize(width, height);
    
    // Create layout containers if they don't exist
    if (!this.headerContainer) {
      this.createLayoutContainers();
    }
    
    // Update layout
    this.updateLayout();
    
    // Create customization UI if not exists
    if (this.carousels.length === 0) {
      this.createCustomizationUI();
    } else {
      this.layoutCustomizationUI();
    }
  }

  private createLayoutContainers(): void {
    // Create header container for title
    this.headerContainer = this.add.container(0, 0);
    
    // Create scrollable content container
    this.scrollContainer = this.add.container(0, 0);
    
    // Create footer container for navigation buttons
    this.footerContainer = this.add.container(0, 0);
  }

  private updateLayout(): void {
    const { width, height } = this.scale;
    const scaleFactor = Math.min(width / 1024, height / 768);
    
    // Define layout areas
    const headerHeight = Math.max(80, height * 0.12);
    const footerHeight = Math.max(120, height * 0.18);
    this.scrollAreaHeight = height - headerHeight - footerHeight;
    
    // Position containers
    if (this.headerContainer) {
      this.headerContainer.setPosition(0, 0);
    }
    
    if (this.scrollContainer) {
      this.scrollContainer.setPosition(0, headerHeight);
    }
    
    if (this.footerContainer) {
      this.footerContainer.setPosition(0, height - footerHeight);
    }
    
    // Create or update title in header
    if (!this.title) {
      this.title = this.add.text(width / 2, headerHeight / 2, 'CUSTOMIZE', {
        ...ColorTheme.getTextStyle('xlarge'),
        align: 'center',
      }).setOrigin(0.5);
      this.headerContainer?.add(this.title);
    } else {
      this.title.setPosition(width / 2, headerHeight / 2);
      this.title.setScale(scaleFactor);
    }
  }

  private setupScrollInput(): void {
    // Mouse wheel scrolling
    this.input.on('wheel', (_pointer: any, _gameObjects: any, _deltaX: number, deltaY: number) => {
      this.scroll(deltaY * 0.5);
    });
    
    // Touch scrolling
    let startY = 0;
    let isDragging = false;
    
    this.input.on('pointerdown', (pointer: any) => {
      startY = pointer.y;
      isDragging = true;
    });
    
    this.input.on('pointermove', (pointer: any) => {
      if (isDragging) {
        const deltaY = startY - pointer.y;
        this.scroll(deltaY * 0.3);
        startY = pointer.y;
      }
    });
    
    this.input.on('pointerup', () => {
      isDragging = false;
    });
  }

  private scroll(deltaY: number): void {
    if (this.contentHeight <= this.scrollAreaHeight) return;
    
    this.scrollY = Math.max(0, Math.min(this.maxScrollY, this.scrollY + deltaY));
    
    if (this.scrollContainer) {
      this.scrollContainer.setY(this.scrollContainer.y - deltaY);
    }
  }

  private updateScrollBounds(): void {
    this.maxScrollY = Math.max(0, this.contentHeight - this.scrollAreaHeight);
  }

  private setupKeyboardNavigation(): void {
    if (!this.input.keyboard) return;
    
    // Detect if user is on desktop (has keyboard)
    this.keyboardEnabled = !this.sys.game.device.input.touch;
    
    if (this.keyboardEnabled) {
      // Keyboard shortcuts for navigation
      const escKey = this.input.keyboard.addKey('ESC');
      const enterKey = this.input.keyboard.addKey('ENTER');
      const upKey = this.input.keyboard.addKey('UP');
      const downKey = this.input.keyboard.addKey('DOWN');
      const leftKey = this.input.keyboard.addKey('LEFT');
      const rightKey = this.input.keyboard.addKey('RIGHT');
      
      escKey.on('down', () => this.handleBackButton());
      enterKey.on('down', () => this.handleSaveButton());
      upKey.on('down', () => this.scroll(-50));
      downKey.on('down', () => this.scroll(50));
      leftKey.on('down', () => this.cyclePrevious());
      rightKey.on('down', () => this.cycleNext());
    }
  }

  private createCustomizationUI(): void {
    const { width } = this.scale;
    
    let currentY = 40; // Start with some padding
    
    // Create avatar carousel
    this.avatarCarousel = this.createCarousel('avatar', 'Avatar', ['boy', 'girl'], currentY);
    this.carousels.push(this.avatarCarousel);
    currentY += 200; // Space for carousel
    
    currentY += 60; // Space between sections
    
    // Create weapon carousel
    this.weaponCarousel = this.createCarousel('weapon', 'Weapon', ['sword', 'axe'], currentY);
    this.carousels.push(this.weaponCarousel);
    currentY += 200; // Space for carousel
    
    currentY += 40; // Final padding
    
    // Set content height and update scroll bounds
    this.contentHeight = currentY;
    this.updateScrollBounds();
    
    // Create navigation buttons in footer
    this.createNavigationButtons();
    
    // Add entrance animations
    this.animateUIEntrance();
  }

  private createCarousel(type: 'avatar' | 'weapon', titleText: string, options: string[], yPosition: number): CustomizationCarousel {
    const { width } = this.scale;
    const scaleFactor = Math.min(width / 1024, this.scale.height / 768);
    
    // Create container for the entire carousel
    const container = this.add.container(0, yPosition);
    this.scrollContainer?.add(container);
    
    // Create title
    const title = this.add.text(width / 2, 0, titleText, {
      ...ColorTheme.getTextStyle('large'),
      fontSize: `${Math.floor(32 * scaleFactor)}px`,
    }).setOrigin(0.5);
    container.add(title);
    
    // Get current selection index
    const currentValue = type === 'avatar' ? this.currentCustomization.avatar : this.currentCustomization.weapon;
    const currentIndex = options.indexOf(currentValue);
    
    // Create current image
    const imageKey = type === 'avatar' 
      ? (currentValue === 'boy' ? 'player-boy' : 'player-girl')
      : `weapon-${currentValue}`;
    
    const currentImage = this.add.image(width / 2, 100, imageKey);
    currentImage.setScale(Math.max(0.8, scaleFactor * 1.0));
    container.add(currentImage);
    
    // Arrow button dimensions
    const arrowSize = Math.max(40, Math.min(60, width * 0.08));
    const arrowY = 100; // Same Y as image
    const arrowSpacing = Math.max(120, width * 0.25);
    
    // Create left arrow
    const leftArrow = new MenuButton(
      this,
      width / 2 - arrowSpacing,
      arrowY,
      '◀',
      () => this.cyclePreviousOption(type),
      {
        ...ColorTheme.getButtonStyle('primary'),
        width: arrowSize,
        height: arrowSize
      }
    );
    container.add(leftArrow.getContainer());
    
    // Create right arrow
    const rightArrow = new MenuButton(
      this,
      width / 2 + arrowSpacing,
      arrowY,
      '▶',
      () => this.cycleNextOption(type),
      {
        ...ColorTheme.getButtonStyle('primary'),
        width: arrowSize,
        height: arrowSize
      }
    );
    container.add(rightArrow.getContainer());
    
    return {
      type,
      title,
      container,
      leftArrow,
      rightArrow,
      currentImage,
      currentIndex: currentIndex >= 0 ? currentIndex : 0,
      options
    };
  }

  private cyclePreviousOption(type: 'avatar' | 'weapon'): void {
    const carousel = type === 'avatar' ? this.avatarCarousel : this.weaponCarousel;
    if (!carousel) return;
    
    carousel.currentIndex = (carousel.currentIndex - 1 + carousel.options.length) % carousel.options.length;
    this.updateCarouselImage(carousel);
    const selectedValue = carousel.options[carousel.currentIndex];
    if (selectedValue) {
      this.updateSelection(type, selectedValue);
    }
  }

  private cycleNextOption(type: 'avatar' | 'weapon'): void {
    const carousel = type === 'avatar' ? this.avatarCarousel : this.weaponCarousel;
    if (!carousel) return;
    
    carousel.currentIndex = (carousel.currentIndex + 1) % carousel.options.length;
    this.updateCarouselImage(carousel);
    const selectedValue = carousel.options[carousel.currentIndex];
    if (selectedValue) {
      this.updateSelection(type, selectedValue);
    }
  }

  private updateCarouselImage(carousel: CustomizationCarousel): void {
    const currentOption = carousel.options[carousel.currentIndex];
    
    // Determine the correct texture key
    let textureKey: string;
    if (carousel.type === 'avatar') {
      textureKey = currentOption === 'boy' ? 'player-boy' : 'player-girl';
    } else {
      textureKey = `weapon-${currentOption}`;
    }
    
    // Update the image with smooth transition
    this.tweens.add({
      targets: carousel.currentImage,
      scaleX: 0,
      duration: 150,
      ease: 'Power2',
      onComplete: () => {
        carousel.currentImage.setTexture(textureKey);
        this.tweens.add({
          targets: carousel.currentImage,
          scaleX: carousel.currentImage.scaleY,
          duration: 150,
          ease: 'Power2'
        });
      }
    });
  }

  private updateSelection(type: 'avatar' | 'weapon', value: string): void {
    if (type === 'avatar') {
      this.currentCustomization.avatar = value as 'boy' | 'girl';
    } else {
      this.currentCustomization.weapon = value as 'sword' | 'axe';
    }
    
    // Save selection immediately
    StorageUtils.saveCustomization(this.currentCustomization);
  }

  // Keyboard navigation helpers
  private cyclePrevious(): void {
    // Cycle through the first carousel for now (could be enhanced for focus management)
    if (this.avatarCarousel) {
      this.cyclePreviousOption('avatar');
    }
  }

  private cycleNext(): void {
    // Cycle through the first carousel for now (could be enhanced for focus management)
    if (this.avatarCarousel) {
      this.cycleNextOption('avatar');
    }
  }

  private createNavigationButtons(): void {
    const { width } = this.scale;
    const scaleFactor = Math.min(width / 1024, this.scale.height / 768);
    
    const buttonWidth = Math.min(180, width * 0.4);
    const buttonHeight = Math.max(50, Math.floor(60 * scaleFactor));
    const spacing = 20;
    const footerHeight = Math.max(120, this.scale.height * 0.18);
    
    // Position buttons in footer - always horizontal layout in footer
    const backX = width / 2 - buttonWidth / 2 - spacing / 2;
    const saveX = width / 2 + buttonWidth / 2 + spacing / 2;
    const buttonY = footerHeight / 2;
    
    this.backButton = new MenuButton(
      this,
      backX,
      buttonY,
      this.keyboardEnabled ? 'BACK (ESC)' : 'BACK',
      () => this.handleBackButton(),
      {
        ...ColorTheme.getButtonStyle('secondary'),
        width: buttonWidth,
        height: buttonHeight
      }
    );
    
    this.saveButton = new MenuButton(
      this,
      saveX,
      buttonY,
      this.keyboardEnabled ? 'SAVE (ENTER)' : 'SAVE',
      () => this.handleSaveButton(),
      {
        ...ColorTheme.getButtonStyle('warning'),
        width: buttonWidth,
        height: buttonHeight
      }
    );
    
    // Add buttons to footer container
    this.footerContainer?.add([this.backButton.getContainer(), this.saveButton.getContainer()]);
  }

  private layoutCustomizationUI(): void {
    // For the scrollable layout, we just need to update the layout containers
    // The content positioning is handled in createCustomizationUI
    this.updateLayout();
  }



  private handleBackButton(): void {
    // Return to main menu without saving changes
    this.scene.start('MainMenu');
  }

  private handleSaveButton(): void {
    // Save customization and return to main menu
    StorageUtils.saveCustomization(this.currentCustomization);
    this.scene.start('MainMenu');
  }

  /**
   * Animates UI elements entrance for visual polish
   */
  private animateUIEntrance(): void {
    // Animate title
    if (this.title) {
      this.title.setAlpha(0);
      this.title.setY(this.title.y - 50);
      this.tweens.add({
        targets: this.title,
        alpha: 1,
        y: this.title.y + 50,
        duration: 800,
        ease: 'Back.easeOut'
      });
    }

    // Animate carousels
    this.carousels.forEach((carousel, index) => {
      carousel.container.setAlpha(0);
      carousel.container.setY(carousel.container.y + 50);
      
      this.tweens.add({
        targets: carousel.container,
        alpha: 1,
        y: carousel.container.y - 50,
        duration: 600,
        delay: 200 + index * 200,
        ease: 'Back.easeOut'
      });
    });

    // Animate navigation buttons
    [this.backButton, this.saveButton].forEach((button, index) => {
      if (button) {
        const container = button.getContainer();
        container.setAlpha(0);
        container.setY(container.y + 30);
        this.tweens.add({
          targets: container,
          alpha: 1,
          y: container.y - 30,
          duration: 500,
          delay: 800 + index * 100,
          ease: 'Back.easeOut'
        });
      }
    });
  }
}