# Design Document

## Overview

The main menu enhancement transforms the current single-tap interface into a structured three-button menu system. This design maintains the existing visual style while adding clear navigation options and a new customization system. The solution leverages Phaser's UI capabilities and integrates with the existing storage and scene management systems.

## Architecture

### Scene Structure
- **MainMenu Scene**: Enhanced with button-based navigation
- **Customize Scene**: New scene for character customization
- **Existing Scenes**: GamePlay and LevelBuilder remain unchanged but receive customization data

### Data Flow
```
MainMenu → StorageUtils (load preferences) → Display with customizations
MainMenu → Customize Scene → StorageUtils (save preferences) → MainMenu
MainMenu → GamePlay/LevelBuilder (with customization data)
```

## Components and Interfaces

### Enhanced MainMenu Scene
```typescript
interface MenuButton {
  gameObject: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
  enabled: boolean;
}

interface PlayerCustomization {
  avatar: 'boy' | 'girl';
  weapon: 'sword' | 'axe';
}
```

**Key Methods:**
- `createMenuButtons()`: Creates the three main buttons
- `updateButtonStates()`: Enables/disables buttons based on available data
- `loadCustomizations()`: Retrieves saved player preferences
- `handlePlayButton()`: Manages play functionality with level checking
- `handleBuildButton()`: Transitions to level builder
- `handleCustomizeButton()`: Opens customization scene

### New Customize Scene
```typescript
interface CustomizationOption {
  type: 'avatar' | 'weapon';
  value: string;
  preview: Phaser.GameObjects.Image;
  button: Phaser.GameObjects.Container;
}
```

**Key Methods:**
- `createCustomizationUI()`: Builds the customization interface
- `createAvatarOptions()`: Displays avatar selection
- `createWeaponOptions()`: Displays weapon selection
- `updatePreview()`: Shows current selections
- `saveCustomizations()`: Persists choices to storage
- `returnToMenu()`: Transitions back to main menu

### Storage Integration
Extends existing StorageUtils with:
```typescript
interface CustomizationData {
  avatar: 'boy' | 'girl';
  weapon: 'sword' | 'axe';
}

// New methods
saveCustomization(data: CustomizationData): void
loadCustomization(): CustomizationData | null
```

## Data Models

### Player Customization Model
```typescript
class PlayerCustomization {
  avatar: 'boy' | 'girl' = 'boy';
  weapon: 'sword' | 'axe' = 'sword';
  
  static fromStorage(): PlayerCustomization
  static getDefault(): PlayerCustomization
  toStorage(): CustomizationData
}
```

### Menu Button Model
```typescript
class MenuButton {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    callback: () => void
  )
  
  setEnabled(enabled: boolean): void
  setStyle(style: ButtonStyle): void
  destroy(): void
}
```

## User Interface Design

### Main Menu Layout
```
┌─────────────────────────┐
│        Logo             │
│                         │
│    ┌─────────────┐     │
│    │    PLAY     │     │
│    └─────────────┘     │
│                         │
│    ┌─────────────┐     │
│    │ BUILD LEVEL │     │
│    └─────────────┘     │
│                         │
│    ┌─────────────┐     │
│    │  CUSTOMIZE  │     │
│    └─────────────┘     │
└─────────────────────────┘
```

### Customization Screen Layout
```
┌─────────────────────────┐
│      CUSTOMIZE          │
│                         │
│  Avatar:                │
│  ┌─────┐ ┌─────┐       │
│  │ BOY │ │GIRL │       │
│  └─────┘ └─────┘       │
│                         │
│  Weapon:                │
│  ┌─────┐ ┌─────┐       │
│  │SWORD│ │ AXE │       │
│  └─────┘ └─────┘       │
│                         │
│  ┌─────┐ ┌─────┐       │
│  │ BACK│ │ SAVE│       │
│  └─────┘ └─────┘       │
└─────────────────────────┘
```

## Error Handling

### Level Loading Errors
- Display user-friendly message when level data is unavailable
- Disable Play button when no level exists
- Provide fallback options (suggest building a level)

### Storage Errors
- Gracefully handle corrupted customization data
- Reset to defaults when storage fails
- Continue functioning without customization if needed

### Scene Transition Errors
- Implement timeout handling for scene transitions
- Provide visual feedback during loading
- Handle failed scene loads with error messages

## Testing Strategy

### Manual Testing Approach
1. **Button Functionality**: Verify each button performs correct action
2. **Customization Persistence**: Test save/load across game sessions
3. **Responsive Design**: Test on different screen sizes
4. **Error Scenarios**: Test with missing level data, corrupted storage
5. **Integration**: Verify customizations appear in gameplay and level builder

### Key Test Scenarios
- Fresh install (no saved data)
- Existing player with saved customizations
- Network errors during level loading
- Screen rotation/resize events
- Rapid button clicking (prevent double-actions)

## Performance Considerations

### Asset Loading
- Preload all customization assets in Preloader scene
- Use sprite atlases for UI elements to reduce draw calls
- Cache button textures to avoid recreation

### Memory Management
- Properly destroy UI elements when transitioning scenes
- Reuse button containers where possible
- Clean up event listeners on scene shutdown

### Responsive Updates
- Throttle resize events to prevent excessive recalculation
- Use object pooling for frequently created/destroyed UI elements
- Optimize button hit areas for touch devices