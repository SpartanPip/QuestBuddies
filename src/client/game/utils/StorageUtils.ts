import { LevelData } from '../../../shared/types/level';

export interface CustomizationData {
  avatar: 'boy' | 'girl';
  weapon: 'sword' | 'axe';
}

export class StorageUtils {
  private static readonly LEVEL_BACKUP_KEY = 'questbuddies_level_backup';
  private static readonly CUSTOMIZATION_KEY = 'questbuddies_customization';
  private static readonly AUTOSAVE_INTERVAL = 30000; // 30 seconds

  /**
   * Saves level data to local storage as backup
   */
  static saveToLocalStorage(levelData: LevelData): void {
    try {
      const serialized = JSON.stringify(levelData);
      localStorage.setItem(this.LEVEL_BACKUP_KEY, serialized);
      console.log('Level backed up to local storage');
    } catch (error) {
      console.warn('Failed to save level to local storage:', error);
    }
  }

  /**
   * Loads level data from local storage backup
   */
  static loadFromLocalStorage(): LevelData | null {
    try {
      const stored = localStorage.getItem(this.LEVEL_BACKUP_KEY);
      if (stored) {
        return JSON.parse(stored) as LevelData;
      }
    } catch (error) {
      console.warn('Failed to load level from local storage:', error);
    }
    return null;
  }

  /**
   * Clears the local storage backup
   */
  static clearLocalStorage(): void {
    try {
      localStorage.removeItem(this.LEVEL_BACKUP_KEY);
      console.log('Level backup cleared from local storage');
    } catch (error) {
      console.warn('Failed to clear level backup:', error);
    }
  }

  /**
   * Checks if there's a backup available
   */
  static hasBackup(): boolean {
    try {
      return localStorage.getItem(this.LEVEL_BACKUP_KEY) !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Downloads level data as JSON file
   */
  static downloadLevelAsFile(levelData: LevelData, filename?: string): void {
    try {
      const serialized = JSON.stringify(levelData, null, 2);
      const blob = new Blob([serialized], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `${levelData.metadata.name.replace(/[^a-z0-9]/gi, '_')}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      console.log('Level downloaded as file');
    } catch (error) {
      console.error('Failed to download level file:', error);
    }
  }

  /**
   * Creates an autosave timer that periodically saves to local storage
   */
  static createAutosaveTimer(getLevelData: () => LevelData | null): number {
    return window.setInterval(() => {
      const levelData = getLevelData();
      if (levelData) {
        this.saveToLocalStorage(levelData);
      }
    }, this.AUTOSAVE_INTERVAL);
  }

  /**
   * Clears an autosave timer
   */
  static clearAutosaveTimer(timerId: number): void {
    clearInterval(timerId);
  }

  /**
   * Gets default customization values
   */
  static getDefaultCustomization(): CustomizationData {
    return {
      avatar: 'boy',
      weapon: 'sword'
    };
  }

  /**
   * Saves customization data to local storage
   */
  static saveCustomization(customization: CustomizationData): void {
    try {
      const serialized = JSON.stringify(customization);
      localStorage.setItem(this.CUSTOMIZATION_KEY, serialized);
      console.log('Customization saved to local storage');
    } catch (error) {
      console.warn('Failed to save customization to local storage:', error);
    }
  }

  /**
   * Loads customization data from local storage
   * Returns default values if no data exists or if data is corrupted
   */
  static loadCustomization(): CustomizationData {
    try {
      const stored = localStorage.getItem(this.CUSTOMIZATION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CustomizationData;
        
        // Validate the loaded data
        if (this.isValidCustomization(parsed)) {
          return parsed;
        } else {
          console.warn('Invalid customization data found, using defaults');
          return this.getDefaultCustomization();
        }
      }
    } catch (error) {
      console.warn('Failed to load customization from local storage:', error);
    }
    
    // Return defaults if no data exists or on error
    return this.getDefaultCustomization();
  }

  /**
   * Validates customization data structure and values
   */
  private static isValidCustomization(data: any): data is CustomizationData {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const validAvatars = ['boy', 'girl'];
    const validWeapons = ['sword', 'axe'];

    return (
      typeof data.avatar === 'string' &&
      validAvatars.includes(data.avatar) &&
      typeof data.weapon === 'string' &&
      validWeapons.includes(data.weapon)
    );
  }

  /**
   * Clears customization data from local storage
   */
  static clearCustomization(): void {
    try {
      localStorage.removeItem(this.CUSTOMIZATION_KEY);
      console.log('Customization data cleared from local storage');
    } catch (error) {
      console.warn('Failed to clear customization data:', error);
    }
  }

  /**
   * Checks if customization data exists in storage
   */
  static hasCustomization(): boolean {
    try {
      return localStorage.getItem(this.CUSTOMIZATION_KEY) !== null;
    } catch (error) {
      return false;
    }
  }
}