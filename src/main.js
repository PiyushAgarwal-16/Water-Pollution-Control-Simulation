import Phaser from 'phaser';
import MainScene from './scenes/MainScene';

const config = {
    type: Phaser.AUTO,
    width: 800, // Starting resolution, will be responsive later
    height: 600,
    parent: 'app',
    pixelArt: true, // Important for our style
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [MainScene]
};

const game = new Phaser.Game(config);
