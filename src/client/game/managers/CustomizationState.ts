import { StorageUtils, CustomizationData } from '../utils/StorageUtils';

export interface CustomizationCarousel {
  type: 'avatar' | 'weapon';
  currentIndex: number;
  options: string[];
}

export interface CustomizationStateData {
  currentCustomization: CustomizationData;
  originalCustomization: CustomizationData;
  avatarCarousel: CustomizationCarousel | null;
  weaponCarousel: CustomizationCarousel | null;
  scrollY: number;
  maxScrollY: number;
  contentHeight: number;
  scrollAreaHeight: number;
  keyboardEnabled: boolean;
  hasUnsavedChanges: boolean;
}

export class CustomizationState {
  private currentCustomization: CustomizationData;
  private originalCustomization: CustomizationData;
  private avatarCarousel: CustomizationCarousel | null = null;
  private weaponCarousel: CustomizationCarousel | null = null;
  private scrollY: number = 0;
  private maxScrollY: number = 0;
  private contentHeight: number = 0;
  private scrollAreaHeight: number = 0;
  private keyboardEnabled: boolean = false;
  private hasUnsavedChanges: boolean = false;

  constructor() {
    // Load customization data - always ensure we have valid defaults
    this.originalCustomization = StorageUtils.loadCustomization();
    this.currentCustomization = { ...this.originalCustomization };
    
    // Ensure we have valid defaults if no customization exists
    if (!StorageUtils.hasCustomization()) {
      const defaults = StorageUtils.getDefaultCustomization();
      this.currentCustomization = { ...defaults };
      this.originalCustomization = { ...defaults };
    }
  }

  /**
   * Initialize with provided customization data
   */
  initialize(customization?: CustomizationData): void {
    // Load customization data - always ensure we have valid defaults
    this.originalCustomization = customization || StorageUtils.loadCustomization();
    this.currentCustomization = { ...this.originalCustomization };
    
    // Ensure we have valid defaults if no customization exists
    if (!StorageUtils.hasCustomization()) {
      const defaults = StorageUtils.getDefaultCustomization();
      this.currentCustomization = { ...defaults };
      this.originalCustomization = { ...defaults };
    }

    // Reset UI state
    this.resetUIState();
  }

  /**
   * Reset UI state
   */
  resetUIState(): void {
    this.avatarCarousel = null;
    this.weaponCarousel = null;
    this.scrollY = 0;
    this.maxScrollY = 0;
    this.contentHeight = 0;
    this.scrollAreaHeight = 0;
    this.keyboardEnabled = false;
    this.hasUnsavedChanges = false;
  }

  /**
   * Get current customization data
   */
  getCurrentCustomization(): CustomizationData {
    return this.currentCustomization;
  }

  /**
   * Get original customization data
   */
  getOriginalCustomization(): CustomizationData {
    return this.originalCustomization;
  }

  /**
   * Update current customization
   */
  updateCustomization(customization: CustomizationData): void {
    this.currentCustomization = { ...customization };
    this.hasUnsavedChanges = !this.isCustomizationEqual(this.currentCustomization, this.originalCustomization);
  }

  /**
   * Update avatar selection
   */
  updateAvatar(avatar: string): void {
    this.currentCustomization = { ...this.currentCustomization, avatar };
    this.hasUnsavedChanges = !this.isCustomizationEqual(this.currentCustomization, this.originalCustomization);
  }

  /**
   * Update weapon selection
   */
  updateWeapon(weapon: string): void {
    this.currentCustomization = { ...this.currentCustomization, weapon };
    this.hasUnsavedChanges = !this.isCustomizationEqual(this.currentCustomization, this.originalCustomization);
  }

  /**
   * Get avatar carousel state
   */
  getAvatarCarousel(): CustomizationCarousel | null {
    return this.avatarCarousel;
  }

  /**
   * Set avatar carousel state
   */
  setAvatarCarousel(carousel: CustomizationCarousel | null): void {
    this.avatarCarousel = carousel;
  }

  /**
   * Get weapon carousel state
   */
  getWeaponCarousel(): CustomizationCarousel | null {
    return this.weaponCarousel;
  }

  /**
   * Set weapon carousel state
   */
  setWeaponCarousel(carousel: CustomizationCarousel | null): void {
    this.weaponCarousel = carousel;
  }

  /**
   * Update scroll position
   */
  updateScrollPosition(scrollY: number): void {
    this.scrollY = Math.max(0, Math.min(scrollY, this.maxScrollY));
  }

  /**
   * Get scroll position
   */
  getScrollPosition(): number {
    return this.scrollY;
  }

  /**
   * Set scroll bounds
   */
  setScrollBounds(maxScrollY: number, contentHeight: number, scrollAreaHeight: number): void {
    this.maxScrollY = maxScrollY;
    this.contentHeight = contentHeight;
    this.scrollAreaHeight = scrollAreaHeight;
  }

  /**
   * Get scroll bounds
   */
  getScrollBounds(): { maxScrollY: number; contentHeight: number; scrollAreaHeight: number } {
    return {
      maxScrollY: this.maxScrollY,
      contentHeight: this.contentHeight,
      scrollAreaHeight: this.scrollAreaHeight
    };
  }

  /**
   * Enable/disable keyboard navigation
   */
  setKeyboardEnabled(enabled: boolean): void {
    this.keyboardEnabled = enabled;
  }

  /**
   * Check if keyboard is enabled
   */
  isKeyboardEnabled(): boolean {
    return this.keyboardEnabled;
  }

  /**
   * Check if there are unsaved changes
   */
  hasUnsavedChanges(): boolean {
    return this.hasUnsavedChanges;
  }

  /**
   * Save customization changes
   */
  saveCustomization(): void {
    StorageUtils.saveCustomization(this.currentCustomization);
    this.originalCustomization = { ...this.currentCustomization };
    this.hasUnsavedChanges = false;
  }

  /**
   * Reset customization to original
   */
  resetCustomization(): void {
    this.currentCustomization = { ...this.originalCustomization };
    this.hasUnsavedChanges = false;
  }

  /**
   * Check if customization has changed from original
   */
  isCustomizationEqual(custom1: CustomizationData, custom2: CustomizationData): boolean {
    return custom1.avatar === custom2.avatar && custom1.weapon === custom2.weapon;
  }

  /**
   * Get available avatar options
   */
  getAvatarOptions(): string[] {
    return ['Boy', 'Girl']; // This should match the actual available options
  }

  /**
   * Get available weapon options
   */
  getWeaponOptions(): string[] {
    return ['sword', 'axe']; // This should match the actual available options
  }

  /**
   * Get current avatar index
   */
  getCurrentAvatarIndex(): number {
    const options = this.getAvatarOptions();
    const currentIndex = options.indexOf(this.currentCustomization.avatar);
    return currentIndex >= 0 ? currentIndex : 0;
  }

  /**
   * Get current weapon index
   */
  getCurrentWeaponIndex(): number {
    const options = this.getWeaponOptions();
    const currentIndex = options.indexOf(this.currentCustomization.weapon);
    return currentIndex >= 0 ? currentIndex : 0;
  }

  /**
   * Navigate to next avatar
   */
  nextAvatar(): void {
    const options = this.getAvatarOptions();
    const currentIndex = this.getCurrentAvatarIndex();
    const nextIndex = (currentIndex + 1) % options.length;
    this.updateAvatar(options[nextIndex]);
  }

  /**
   * Navigate to previous avatar
   */
  previousAvatar(): void {
    const options = this.getAvatarOptions();
    const currentIndex = this.getCurrentAvatarIndex();
    const prevIndex = currentIndex === 0 ? options.length - 1 : currentIndex - 1;
    this.updateAvatar(options[prevIndex]);
  }

  /**
   * Navigate to next weapon
   */
  nextWeapon(): void {
    const options = this.getWeaponOptions();
    const currentIndex = this.getCurrentWeaponIndex();
    const nextIndex = (currentIndex + 1) % options.length;
    this.updateWeapon(options[nextIndex]);
  }

  /**
   * Navigate to previous weapon
   */
  previousWeapon(): void {
    const options = this.getWeaponOptions();
    const currentIndex = this.getCurrentWeaponIndex();
    const prevIndex = currentIndex === 0 ? options.length - 1 : currentIndex - 1;
    this.updateWeapon(options[prevIndex]);
  }

  /**
   * Get complete state data
   */
  getStateData(): CustomizationStateData {
    return {
      currentCustomization: this.currentCustomization,
      originalCustomization: this.originalCustomization,
      avatarCarousel: this.avatarCarousel,
      weaponCarousel: this.weaponCarousel,
      scrollY: this.scrollY,
      maxScrollY: this.maxScrollY,
      contentHeight: this.contentHeight,
      scrollAreaHeight: this.scrollAreaHeight,
      keyboardEnabled: this.keyboardEnabled,
      hasUnsavedChanges: this.hasUnsavedChanges
    };
  }

  /**
   * Restore state from data
   */
  restoreStateData(data: Partial<CustomizationStateData>): void {
    if (data.currentCustomization) {
      this.currentCustomization = data.currentCustomization;
    }
    if (data.originalCustomization) {
      this.originalCustomization = data.originalCustomization;
    }
    if (data.avatarCarousel !== undefined) {
      this.avatarCarousel = data.avatarCarousel;
    }
    if (data.weaponCarousel !== undefined) {
      this.weaponCarousel = data.weaponCarousel;
    }
    if (data.scrollY !== undefined) {
      this.scrollY = data.scrollY;
    }
    if (data.maxScrollY !== undefined) {
      this.maxScrollY = data.maxScrollY;
    }
    if (data.contentHeight !== undefined) {
      this.contentHeight = data.contentHeight;
    }
    if (data.scrollAreaHeight !== undefined) {
      this.scrollAreaHeight = data.scrollAreaHeight;
    }
    if (data.keyboardEnabled !== undefined) {
      this.keyboardEnabled = data.keyboardEnabled;
    }
    if (data.hasUnsavedChanges !== undefined) {
      this.hasUnsavedChanges = data.hasUnsavedChanges;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.avatarCarousel = null;
    this.weaponCarousel = null;
  }
}
