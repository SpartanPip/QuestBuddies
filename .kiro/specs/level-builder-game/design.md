# Design Document

## Overview

QuestBuddies implements a level builder and gameplay system using Phaser.js for the client-side game engine and Devvit for Reddit integration. The architecture separates concerns between level creation, gameplay mechanics, and Reddit post management while maintaining simple, modular code structure.

## Architecture

### Client-Side Architecture
```
src/client/
├── game/
│   ├── scenes/
│   │   ├── LevelBuilder.ts    # Level creation interface
│   │   ├── GamePlay.ts        # Main gameplay scene
│   │   └── UI.ts              # Shared UI components
│   ├── entities/
│   │   ├── Player.ts          # Player character logic
│   │   ├── Enemy.ts           # Enemy AI and behavior
│   │   └── Weapon.ts          # Orbiting weapon system
│   ├── managers/
│   │   ├── LevelManager.ts    # Level data handling
│   │   └── InputManager.ts    # Input handling abstraction
│   └── utils/
│       ├── GridUtils.ts       # Grid snapping utilities
│       └── CollisionUtils.ts  # Collision detection helpers
```

### Server-Side Architecture
```
src/server/
├── handlers/
│   ├── levelHandler.ts        # Level CRUD operations
│   └── postHandler.ts         # Reddit post management
├── types/
│   └── levelTypes.ts          # Level data type definitions
└── utils/
    └── validation.ts          # Level data validation
```

## Components and Interfaces

### Level Data Structure
```typescript
interface LevelData {
  tiles: number[][];           // 2D array of tile IDs
  enemies: EnemySpawn[];       // Enemy spawn positions
  spawn: Position;             // Player spawn point
  metadata: {
    name: string;
    author: string;
    created: number;
  };
}

interface EnemySpawn {
  x: number;
  y: number;
  type: number;               // Enemy type ID
}

interface Position {
  x: number;
  y: number;
}
```

### Core Game Classes

#### Player Class
- Position and movement state
- Health management
- Input handling integration
- Camera follow target

#### Enemy Class
- AI behavior using simplified boids
- Health and damage system
- Collision detection with player
- Health bar rendering

#### Weapon Class
- Orbital movement around player
- Damage radius calculation
- Enemy collision detection
- Visual rotation effects

#### LevelBuilder Class
- Grid-based tile placement
- Drag and drop functionality
- Toolbar UI management
- Level serialization

## Data Models

### Tile System
- Tile types: Empty (0), Wall (1), Floor (2), Decoration (3+)
- Grid size: 32x32 pixels per tile
- Level dimensions: Configurable, default 50x50 tiles

### Combat System
- Player health: 100 HP
- Enemy health: Variable by type (20-50 HP)
- Weapon damage: 10 HP per hit
- Weapon range: 64 pixels radius
- Damage cooldown: 500ms per enemy

### Input Mapping
- Movement: WASD keys or arrow keys
- Touch: Virtual joystick for mobile
- Builder: Mouse drag for tile placement
- Save: Dedicated save button in builder UI

## Error Handling

### Client-Side Error Handling
- Invalid level data: Display error message and load default level
- Network failures: Show retry button and cache level locally
- Input validation: Prevent invalid tile placements
- Performance issues: Implement object pooling for enemies

### Server-Side Error Handling
- Malformed level data: Return validation errors
- Reddit API failures: Implement retry logic with exponential backoff
- Storage limits: Enforce maximum level size constraints
- Authentication: Validate user permissions before post creation

### Error Recovery Strategies
- Graceful degradation: Core gameplay continues even if features fail
- Local storage: Cache levels locally as backup
- Default content: Provide fallback levels if user content fails
- User feedback: Clear error messages with actionable solutions

## Testing Strategy

### Core Functionality Validation
- Level serialization and deserialization accuracy
- Player movement and collision detection
- Enemy AI pathfinding and behavior
- Weapon damage calculation and timing
- Reddit integration data flow

### User Experience Testing
- Level builder usability and responsiveness
- Touch input accuracy on mobile devices
- Performance with large levels and many enemies
- Visual feedback for all user interactions
- Error message clarity and helpfulness

### Integration Testing
- Client-server communication reliability
- Reddit post creation and metadata embedding
- Level loading from Reddit post data
- Cross-browser compatibility
- Mobile device compatibility

## Implementation Notes

### Performance Considerations
- Use Phaser's object pooling for enemies and projectiles
- Implement viewport culling for large levels
- Optimize collision detection with spatial partitioning
- Limit maximum enemies per level (50)

### Mobile Optimization
- Touch-friendly UI elements (minimum 44px touch targets)
- Virtual joystick for movement input
- Responsive layout for different screen sizes
- Optimized asset loading for mobile networks

### Reddit Integration Flow
1. User creates level in builder
2. Level data serialized to JSON
3. Client sends data to Devvit backend
4. Backend creates Reddit post with embedded metadata
5. Other users load post and extract level data
6. Game initializes with loaded level data