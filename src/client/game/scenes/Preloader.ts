import { Scene } from 'phaser';

export class Preloader extends Scene {
  constructor() {
    super('Preloader');
  }

  init() {
    //  We loaded this image in our Boot Scene, so we can display it here
    this.add.image(512, 384, 'background');

    //  A simple progress bar. This is the outline of the bar.
    this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

    //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
    const bar = this.add.rectangle(512 - 230, 384, 4, 28, 0xffffff);

    //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
    this.load.on('progress', (progress: number) => {
      //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
      bar.width = 4 + 460 * progress;
    });
  }

  preload() {
    //  Load the assets for the game - Replace with your own assets
    this.load.setPath('assets');

    this.load.image('logo', 'logo.png');

    // Load player avatars
    this.load.image('player-boy', 'players/Boy.png');
    this.load.image('player-girl', 'players/Girl.png');

    // Load enemy sprites
    this.load.image('enemy-bug1', 'enemies/bug 1.png');
    this.load.image('enemy-bug2', 'enemies/bug 2.png');
    this.load.image('enemy-bug3', 'enemies/bug 3.png');

    // Load weapon sprites
    this.load.image('weapon-sword', 'weapons/sword.png');
    this.load.image('weapon-axe', 'weapons/axe.png');

    // Load ground tiles
    this.load.image('tile-dirt1', 'tiles/dirt ground 1.png');
    this.load.image('tile-dirt2', 'tiles/dirt ground 2.png');
    this.load.image('tile-dirt3', 'tiles/dirt ground 3.png');
    this.load.image('tile-dirt4', 'tiles/dirt ground 4.png');
    this.load.image('tile-dirt5', 'tiles/dirt ground 5.png');
    this.load.image('tile-dirt6', 'tiles/dirt ground 6.png');
    this.load.image('tile-dirt7', 'tiles/dirt ground 7.png');
    this.load.image('tile-dirt8', 'tiles/dirt ground 8.png');
    this.load.image('tile-dirt9', 'tiles/dirt ground 9.png');
    
    this.load.image('tile-grass1', 'tiles/grass ground 1.png');
    this.load.image('tile-grass2', 'tiles/grass ground 2.png');
    this.load.image('tile-grass3', 'tiles/grass ground 3.png');
    this.load.image('tile-grass4', 'tiles/grass ground 4.png');
    this.load.image('tile-grass5', 'tiles/grass ground 5.png');
    this.load.image('tile-grass6', 'tiles/grass ground 6.png');
    this.load.image('tile-grass7', 'tiles/grass ground 7.png');
    this.load.image('tile-grass8', 'tiles/grass ground 8.png');
    this.load.image('tile-grass9', 'tiles/grass ground 9.png');
  }

  create() {
    //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
    //  For example, you can define global animations here, so we can use them in other scenes.

    //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
    this.scene.start('MainMenu');
  }
}
