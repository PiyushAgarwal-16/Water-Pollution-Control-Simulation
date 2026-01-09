import Phaser from 'phaser';
import GridSystem from '../systems/GridSystem';
import PollutionSystem from '../systems/PollutionSystem';
import Factory from '../objects/Factory';

export default class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
    }

    preload() {
        this.load.image('world-map', '/assets/world-map.png');
        this.load.image('factory', '/assets/factory.png');
    }

    create() {
        const map = this.add.image(0, 0, 'world-map').setOrigin(0, 0);
        this.physics.world.setBounds(0, 0, map.width, map.height);

        // Initialize Systems - small delay to ensure texture data is ready if needed, 
        // but in Phaser preload handles it.
        this.gridSystem = new GridSystem(this, 'world-map', 8); // 8px grid
        this.pollutionSystem = new PollutionSystem(this.gridSystem);

        this.pollutionGraphics = this.add.graphics();
        this.pollutionGraphics.setAlpha(0.6); // Semi-transparent for overlay

        // Cameras
        this.cameras.main.setBounds(0, 0, map.width, map.height);
        this.cameras.main.centerOn(map.width / 2, map.height / 2);
        this.cameras.main.setZoom(1);

        this.add.text(16, 16, 'Water Pollution Simulation\nPollution spreads from factories...', {
            fontSize: '18px',
            padding: { x: 10, y: 5 },
            backgroundColor: '#000000',
            fill: '#ffffff'
        }).setScrollFactor(0).setDepth(100);

        this.cursors = this.input.keyboard.createCursorKeys();

        // Input to place factories
        // Place invisible factories over the map's visual factories
        // Coordinates estimated from the pixel art map
        const factoryLocations = [
            { x: 380, y: 300 }, // Top factory
            { x: 260, y: 450 }, // Left factory
            { x: 560, y: 560 }  // Right factory
        ];

        factoryLocations.forEach(loc => {
            const factory = new Factory(this, loc.x, loc.y, this.pollutionSystem);
            factory.setVisible(false); // Hidden, as they are already on the map
            this.add.existing(factory);
        });
    }

    update(time, delta) {
        // Update Camera
        const speed = 10;
        if (this.cursors.left.isDown) this.cameras.main.scrollX -= speed;
        if (this.cursors.right.isDown) this.cameras.main.scrollX += speed;
        if (this.cursors.up.isDown) this.cameras.main.scrollY -= speed;
        if (this.cursors.down.isDown) this.cameras.main.scrollY += speed;

        // Update Simulation
        this.pollutionSystem.update();

        // Update Factories
        this.children.list.forEach(child => {
            if (child.update && child instanceof Factory) child.update();
        });

        // Draw Pollution
        this.drawPollution();
    }

    drawPollution() {
        this.pollutionGraphics.clear();
        const grid = this.gridSystem.grid;
        const size = this.gridSystem.gridSize;

        if (!grid) return;

        for (let y = 0; y < this.gridSystem.height; y++) {
            for (let x = 0; x < this.gridSystem.width; x++) {
                const cell = grid[y][x];
                // Only draw if polluted
                if (cell && cell.pollution > 0.05) {
                    const alpha = Phaser.Math.Clamp(cell.pollution, 0, 0.8);
                    // Dark Brown/Green Sludge color: 0x554400
                    this.pollutionGraphics.fillStyle(0x554400, alpha);
                    this.pollutionGraphics.fillRect(cell.worldX, cell.worldY, size, size);
                }
            }
        }
    }
}
