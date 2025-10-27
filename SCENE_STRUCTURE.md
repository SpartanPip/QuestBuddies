# QuestBuddies Scene Structure & User Flow

## Scene Registration Order

The game's main.ts registers scenes in the following order:

1. Boot
2. Preloader
3. MainMenu
4. GameOver
5. LevelBuilder
6. GamePlay
7. Customize
8. GridSelectionScene

## Scene Descriptions

### Boot

- Initial scene loaded on game start.
- Loads a background image.
- Immediately starts the Preloader scene.

### Preloader

- Displays a loading bar while game assets are loaded.
- Loads player avatars, enemy sprites, weapon sprites, and ground tiles.
- Starts the MainMenu scene when loading is complete.

### MainMenu

- Central hub of the game.
- Provides buttons to start gameplay, customize player, build levels, and quit.
- Handles navigation to other scenes.

### GamePlay

- Main gameplay scene where players play levels.
- Can be entered from MainMenu or LevelBuilder (for testing).
- Handles player movement, enemy AI, collisions, and game state.
- Shows game over or victory screens based on game outcome.
- Returns to MainMenu or LevelBuilder depending on how it was entered.

### GameOver

- Simple scene displaying "Game Over" text.
- Returns to MainMenu when clicked.

### LevelBuilder

- Scene for creating and editing levels.
- Allows placing tiles, enemies, and spawn points.
- Can test the level by entering GamePlay.
- Can save and post levels.
- Returns to MainMenu when done.

### Customize

- Scene for customizing player avatar and weapon.
- Uses carousels for selection.
- Returns to MainMenu when done.

### GridSelectionScene

- A utility scene for selecting options (e.g., tiles or enemies) in a grid layout.
- Used by LevelBuilder for tile and enemy selection.
- Returns to the previous scene with the selected option.

## User Flow

### Typical Play Flow

1. Boot → Preloader → MainMenu
2. MainMenu → Customize (optional) → MainMenu
3. MainMenu → GamePlay → GameOver → MainMenu
4. MainMenu → LevelBuilder → MainMenu

### Level Builder Flow

1. MainMenu → LevelBuilder
2. LevelBuilder → GridSelectionScene (for tile/enemy selection) → LevelBuilder
3. LevelBuilder → MainMenu (when done)

### Customization Flow

1. MainMenu → Customize → MainMenu

## Notes for Future Cursor Prompts

- The game uses Phaser 3 and is set up for both desktop and mobile.
- Scenes are managed by Phaser's scene manager, and transitions are handled via scene.start().
- The LevelBuilder and GamePlay scenes are tightly integrated for testing levels.
- The GridSelectionScene is a reusable component for selection dialogs.
- All scenes are registered in main.ts and can be referenced by their string names.
