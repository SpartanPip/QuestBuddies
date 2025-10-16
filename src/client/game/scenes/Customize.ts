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
  private background: GameObjects.Graphics | null = null;
  private title: GameObjects.Text | null = null;
  private currentCustomization: CustomizationData;
  private originalCustomization: CustomizationData;
  
  // Layout containers
  private headerContainer: GameObjects.Container | null = null;
  private scrollContainer: GameObjects.Container | null = null;
  private footerContainer: GameObjects.Container | null = null;
  
  // Background elements
  private headerBackground: GameObjects.Rectangle | null = null;
  private footerBackground: GameObjects.Rectangle | null = null;
  private scrollMask: GameObjects.Graphics | null = null;
  
  // Customization carousels
  private avatarCarousel: CustomizationCarousel | null = null;
  private weaponCarousel: CustomizationCarousel | null = null;
  private carousels: CustomizationCarousel[] = [];
  
  // Navigation buttons
  private backButton: MenuButton | null = null;
  
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
    
    // Reset background elements
    this.headerBackground?.destroy();
    this.footerBackground?.destroy();
    this.scrollMask?.destroy();
    this.headerBackground = null;
    this.footerBackground = null;
    this.scrollMask = null;
    
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
    this.backButton = null;
    
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
    // Set camera background to match our gradient theme
    this.cameras.main.setBackgroundColor(ColorTheme.BACKGROUND_DARK);
    
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
    
    // Create or update gradient background using common utility
    if (!this.background) {
      this.background = ColorTheme.createMenuGradientBackground(this, width, height);
    } else {
      ColorTheme.updateMenuGradientBackground(this.background, width, height);
    }
    
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
    
    // Create scrollable content container (transparent)
    this.scrollContainer = this.add.container(0, 0);
    this.scrollContainer.setAlpha(1.0); // Ensure container is fully visible but transparent background
    
    // Create footer container for navigation buttons
    this.footerContainer = this.add.container(0, 0);
    
    // Create backgrounds and masking
    this.createBackgroundsAndMask();
  }

  private createBackgroundsAndMask(): void {
    const { width, height } = this.scale;
    
    // Define layout areas
    const headerHeight = Math.max(80, height * 0.12);
    const footerHeight = Math.max(120, height * 0.18);
    this.scrollAreaHeight = height - headerHeight - footerHeight;
    
    // Create header background with semi-transparent overlay
    this.headerBackground = this.add.rectangle(
      width / 2, 
      headerHeight / 2, 
      width, 
      headerHeight, 
      ColorTheme.SECONDARY_DARK
    );
    this.headerBackground.setAlpha(0.95); // Semi-transparent for depth
    this.headerBackground.setStrokeStyle(2, ColorTheme.BORDER_PRIMARY);
    this.headerBackground.setDepth(10); // Above scroll content
    
    // Create footer background with semi-transparent overlay
    this.footerBackground = this.add.rectangle(
      width / 2, 
      height - footerHeight / 2, 
      width, 
      footerHeight, 
      ColorTheme.SECONDARY_DARK
    );
    this.footerBackground.setAlpha(0.95); // Semi-transparent for depth
    this.footerBackground.setStrokeStyle(2, ColorTheme.BORDER_PRIMARY);
    this.footerBackground.setDepth(10); // Above scroll content
    
    // Create scroll area mask to hide content outside bounds
    this.scrollMask = this.add.graphics();
    this.scrollMask.fillStyle(0x000000, 0); // Transparent mask
    this.scrollMask.fillRect(0, headerHeight, width, this.scrollAreaHeight);
    
    // Apply mask to scroll container
    if (this.scrollContainer) {
      this.scrollContainer.setMask(this.scrollMask.createGeometryMask());
    }
  }

  private updateLayout(): void {
    const { width, height } = this.scale;
    const scaleFactor = Math.min(width / 1024, height / 768);
    
    // Define layout areas
    const headerHeight = Math.max(80, height * 0.12);
    const footerHeight = Math.max(120, height * 0.18);
    this.scrollAreaHeight = height - headerHeight - footerHeight;
    
    // Update background elements
    if (this.headerBackground) {
      this.headerBackground.setPosition(width / 2, headerHeight / 2);
      this.headerBackground.setSize(width, headerHeight);
    }
    
    if (this.footerBackground) {
      this.footerBackground.setPosition(width / 2, height - footerHeight / 2);
      this.footerBackground.setSize(width, footerHeight);
    }
    
    // Update scroll mask
    if (this.scrollMask) {
      this.scrollMask.clear();
      this.scrollMask.fillStyle(0x000000, 0); // Transparent mask
      this.scrollMask.fillRect(0, headerHeight, width, this.scrollAreaHeight);
    }
    
    // Position containers
    if (this.headerContainer) {
      this.headerContainer.setPosition(0, 0);
      this.headerContainer.setDepth(15); // Above backgrounds
    }
    
    if (this.scrollContainer) {
      this.scrollContainer.setPosition(0, headerHeight);
      this.scrollContainer.setDepth(5); // Below backgrounds
    }
    
    if (this.footerContainer) {
      this.footerContainer.setPosition(0, height - footerHeight);
      this.footerContainer.setDepth(15); // Above backgrounds
    }
    
    // Create or update title in header
    if (!this.title) {
      this.title = this.add.text(width / 2, headerHeight / 2, 'CUSTOMIZE', {
        ...ColorTheme.getTextStyle('xlarge'),
        align: 'center',
      }).setOrigin(0.5);
      this.title.setDepth(20); // Above everything
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
    
    // Calculate new scroll position with clamping
    const oldScrollY = this.scrollY;
    this.scrollY = Math.max(0, Math.min(this.maxScrollY, this.scrollY + deltaY));
    
    // Only move the container by the actual scroll amount (clamped)
    const actualDelta = this.scrollY - oldScrollY;
    
    if (this.scrollContainer && actualDelta !== 0) {
      // Calculate the correct container position based on scroll offset
      const { height } = this.scale;
      const headerHeight = Math.max(80, height * 0.12);
      const baseY = headerHeight;
      
      this.scrollContainer.setY(baseY - this.scrollY);
    }
  }

  private updateScrollBounds(): void {
    // Calculate maximum scroll distance
    // Content can scroll until the bottom of content aligns with bottom of scroll area
    this.maxScrollY = Math.max(0, this.contentHeight - this.scrollAreaHeight);
    
    // Ensure current scroll position is within new bounds
    this.scrollY = Math.max(0, Math.min(this.maxScrollY, this.scrollY));
    
    // Update container position to match clamped scroll position
    if (this.scrollContainer) {
      const { height } = this.scale;
      const headerHeight = Math.max(80, height * 0.12);
      const baseY = headerHeight;
      this.scrollContainer.setY(baseY - this.scrollY);
    }
  }

  private setupKeyboardNavigation(): void {
    if (!this.input.keyboard) return;
    
    // Detect if user is on desktop (has keyboard)
    this.keyboardEnabled = !this.sys.game.device.input.touch;
    
    if (this.keyboardEnabled) {
      // Keyboard shortcuts for navigation
      const escKey = this.input.keyboard.addKey('ESC');
      const upKey = this.input.keyboard.addKey('UP');
      const downKey = this.input.keyboard.addKey('DOWN');
      const leftKey = this.input.keyboard.addKey('LEFT');
      const rightKey = this.input.keyboard.addKey('RIGHT');
      
      escKey.on('down', () => this.handleBackButton());
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
    currentY += 250; // Optimized space for larger carousel
    
    currentY += 40; // Reduced space between sections
    
    // Create weapon carousel
    this.weaponCarousel = this.createCarousel('weapon', 'Weapon', ['sword', 'axe'], currentY);
    this.carousels.push(this.weaponCarousel);
    currentY += 250; // Optimized space for larger carousel
    
    currentY += 30; // Minimal final padding
    
    // Set content height and update scroll bounds
    this.contentHeight = currentY;
    this.updateScrollBounds();
    
    // Initialize scroll position to top
    this.scrollToTop();
    
    // Create navigation buttons in footer
    this.createNavigationButtons();
    
    // Add entrance animations
    this.animateUIEntrance();
  }

  private createCarousel(type: 'avatar' | 'weapon', titleText: string, options: string[], yPosition: number): CustomizationCarousel {
    const { width } = this.scale;
    const scaleFactor = Math.min(width / 1024, this.scale.height / 768);
    
    // Create container for the entire carousel (transparent)
    const container = this.add.container(0, yPosition);
    container.setAlpha(1.0); // Fully visible but no background
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
    currentImage.setScale(Math.max(2.4, scaleFactor * 3.0));
    container.add(currentImage);
    
    // Arrow button dimensions
    const arrowSize = Math.max(40, Math.min(60, width * 0.08));
    const arrowY = 100; // Same Y as image
    const arrowSpacing = Math.max(120, width * 0.25);
    
    // Create left arrow with transparent background
    const leftArrow = new MenuButton(
      this,
      width / 2 - arrowSpacing,
      arrowY,
      '◀',
      () => this.cyclePreviousOption(type),
      {
        ...ColorTheme.getButtonStyle('primary'),
        width: arrowSize,
        height: arrowSize,
        backgroundColor: ColorTheme.SECONDARY_DARK,
        hoverBackgroundColor: ColorTheme.SECONDARY_MEDIUM,
        borderColor: ColorTheme.BORDER_PRIMARY,
        borderWidth: 2
      }
    );
    leftArrow.getContainer().setAlpha(0.8); // Make semi-transparent
    container.add(leftArrow.getContainer());
    
    // Create right arrow with transparent background
    const rightArrow = new MenuButton(
      this,
      width / 2 + arrowSpacing,
      arrowY,
      '▶',
      () => this.cycleNextOption(type),
      {
        ...ColorTheme.getButtonStyle('primary'),
        width: arrowSize,
        height: arrowSize,
        backgroundColor: ColorTheme.SECONDARY_DARK,
        hoverBackgroundColor: ColorTheme.SECONDARY_MEDIUM,
        borderColor: ColorTheme.BORDER_PRIMARY,
        borderWidth: 2
      }
    );
    rightArrow.getContainer().setAlpha(0.8); // Make semi-transparent
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

  // Scroll position helpers
  private scrollToTop(): void {
    this.scrollY = 0;
    if (this.scrollContainer) {
      const { height } = this.scale;
      const headerHeight = Math.max(80, height * 0.12);
      this.scrollContainer.setY(headerHeight);
    }
  }

  private scrollToBottom(): void {
    this.scrollY = this.maxScrollY;
    if (this.scrollContainer) {
      const { height } = this.scale;
      const headerHeight = Math.max(80, height * 0.12);
      this.scrollContainer.setY(headerHeight - this.scrollY);
    }
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
    const footerHeight = Math.max(120, this.scale.height * 0.18);
    
    // Center the single back button in footer
    const buttonY = footerHeight / 2;
    
    this.backButton = new MenuButton(
      this,
      width / 2, // Centered horizontally
      buttonY,
      'BACK',
      () => this.handleBackButton(),
      {
        ...ColorTheme.getButtonStyle('secondary'),
        width: buttonWidth,
        height: buttonHeight
      }
    );
    
    // Add button to footer container
    this.footerContainer?.add(this.backButton.getContainer());
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

    // Animate navigation button
    if (this.backButton) {
      const container = this.backButton.getContainer();
      container.setAlpha(0);
      container.setY(container.y + 30);
      this.tweens.add({
        targets: container,
        alpha: 1,
        y: container.y - 30,
        duration: 500,
        delay: 800,
        ease: 'Back.easeOut'
      });
    }
  }
}