# Requirements Document

## Introduction

QuestBuddies is a Reddit-integrated game where users can create custom levels using a built-in level editor and share them as interactive posts. Players can then play these user-generated levels directly within Reddit posts, featuring simple combat mechanics with orbiting weapons and enemy AI.

## Requirements

### Requirement 1

**User Story:** As a game creator, I want to build custom levels using a visual tilemap editor, so that I can design unique gameplay experiences for other players.

#### Acceptance Criteria

1. WHEN the user opens the level builder THEN the system SHALL display a grid-based tilemap editor interface
2. WHEN the user selects a tile type from the toolbar THEN the system SHALL allow placement of that tile on the grid
3. WHEN the user drags tiles THEN the system SHALL snap tiles to grid positions for consistent placement
4. WHEN the user places tiles THEN the system SHALL update the level data structure in real-time
5. IF the user places an enemy THEN the system SHALL store the enemy position in the level data
6. IF the user places a spawn point THEN the system SHALL store the player spawn location in the level data

### Requirement 2

**User Story:** As a game creator, I want to save and share my levels on Reddit, so that other players can discover and play my creations.

#### Acceptance Criteria

1. WHEN the user clicks "Save & Post" THEN the system SHALL serialize the level data to JSON format
2. WHEN the level data is serialized THEN the system SHALL include tiles array, enemies array, and spawn point object
3. WHEN the save request is made THEN the system SHALL send the level data to the Devvit backend
4. WHEN the backend receives level data THEN the system SHALL create a new interactive Reddit post
5. WHEN the post is created THEN the system SHALL embed the level JSON in the post metadata
6. IF the post creation fails THEN the system SHALL display an error message to the user

### Requirement 3

**User Story:** As a player, I want to control a character with smooth movement and camera follow, so that I can navigate through user-created levels effectively.

#### Acceptance Criteria

1. WHEN the player presses movement keys THEN the system SHALL move the player character smoothly
2. WHEN the player uses touch input THEN the system SHALL respond to touch-based movement controls
3. WHEN the player moves THEN the camera SHALL follow the player smoothly if the map is larger than screen
4. WHEN the player reaches map boundaries THEN the camera SHALL stop at the map edges
5. IF the map is smaller than screen THEN the camera SHALL remain centered and stationary

### Requirement 4

**User Story:** As a player, I want to use an orbiting weapon system to defend against enemies, so that I can engage in combat gameplay.

#### Acceptance Criteria

1. WHEN the game starts THEN the system SHALL display a weapon sprite orbiting around the player
2. WHEN the weapon orbits THEN the system SHALL rotate the weapon continuously around the player
3. WHEN enemies are within weapon range THEN the system SHALL deal damage to those enemies
4. WHEN damage is dealt THEN the system SHALL use simple radius collision detection
5. WHEN an enemy takes damage THEN the system SHALL reduce the enemy's health accordingly

### Requirement 5

**User Story:** As a player, I want to face intelligent enemies that pursue me, so that the gameplay provides an engaging challenge.

#### Acceptance Criteria

1. WHEN enemies are spawned THEN the system SHALL implement simplified boid behavior for movement
2. WHEN enemies move THEN the system SHALL direct them toward the player's position
3. WHEN multiple enemies are near each other THEN the system SHALL add random jitter to prevent clustering
4. WHEN an enemy collides with the player THEN the system SHALL deal damage to the player
5. WHEN an enemy takes damage THEN the system SHALL update the enemy's health bar display

### Requirement 6

**User Story:** As a player, I want to see health information for myself and enemies, so that I can track combat status during gameplay.

#### Acceptance Criteria

1. WHEN the game starts THEN the system SHALL display a fixed health bar at the top of the screen for the player
2. WHEN enemies are present THEN the system SHALL display small red health bars above each enemy sprite
3. WHEN player health changes THEN the system SHALL update the player health bar display
4. WHEN enemy health changes THEN the system SHALL update the corresponding enemy health bar
5. IF an enemy's health reaches zero THEN the system SHALL remove the enemy and its health bar

### Requirement 7

**User Story:** As a Reddit user, I want to play levels directly from Reddit posts, so that I can experience user-generated content seamlessly within the platform.

#### Acceptance Criteria

1. WHEN a Reddit post with level data loads THEN the system SHALL extract the level JSON from post metadata
2. WHEN level JSON is extracted THEN the Phaser scene SHALL load the tilemap from that data
3. WHEN the tilemap loads THEN the system SHALL initialize all gameplay mechanics
4. WHEN gameplay initializes THEN the system SHALL spawn the player at the designated spawn point
5. WHEN gameplay initializes THEN the system SHALL spawn all enemies at their designated positions
6. IF level data is corrupted or missing THEN the system SHALL display an error message and fallback level