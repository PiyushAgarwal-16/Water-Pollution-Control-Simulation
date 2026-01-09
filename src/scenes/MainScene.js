import Phaser from 'phaser';
import GridSystem from '../systems/GridSystem';
import PollutionSystem from '../systems/PollutionSystem';
import Factory from '../objects/Factory';
import Filter from '../objects/Filter';

import Fish from '../objects/Fish';

export default class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
        this.currentTool = 'none'; // 'none', 'filter'
    }
    // ... existing imports ...

    preload() {
        this.load.image('world-map', '/assets/world-map.png');
        this.load.image('factory', '/assets/factory.png');
        this.load.image('filter', '/assets/filter.png');
    }

    create() {
        // Generate a clean 16x16 fish texture programmatically
        // This ensures the fish has a transparent background and perfect sizing
        const fishGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        fishGraphics.fillStyle(0xff8800, 1); // Orange
        fishGraphics.fillCircle(8, 8, 6); // Body
        fishGraphics.fillStyle(0xffffff, 1); // White eye
        fishGraphics.fillCircle(10, 6, 2); // Eye
        fishGraphics.fillStyle(0xff8800, 1); // Tail
        fishGraphics.fillTriangle(0, 8, 4, 4, 4, 12);

        fishGraphics.generateTexture('fish', 16, 16);
        fishGraphics.destroy();

        // ... existing map and system setup ...
        const map = this.add.image(0, 0, 'world-map').setOrigin(0, 0);
        this.physics.world.setBounds(0, 0, map.width, map.height);

        this.gridSystem = new GridSystem(this, 'world-map', 8);
        this.pollutionSystem = new PollutionSystem(this.gridSystem);
        this.pollutionGraphics = this.add.graphics();
        this.pollutionGraphics.setAlpha(0.6);

        // Define Ponds (approximate rectangles based on map)
        const ponds = [
            { x: 550, y: 350, width: 150, height: 150 }, // Top Right Pond
            { x: 550, y: 650, width: 120, height: 100 }  // Bottom Right Pond (approx)
            // Note: coordinates need to match the visual map 1:1. 
            // I'll use safer generic bounds for "Pond Areas"
        ];

        // Let's debug-draw ponds to verify location (temporary)
        // Or better, just spawn fish in "Water" areas near specific points

        this.fishGroup = [];

        // Spawn Fish in Top Right Pond
        this.spawnFishInArea(680, 200, 100, 10); // x, y, radius, count

        // Spawn Fish in Bottom Right Pond
        this.spawnFishInArea(680, 400, 80, 10);

        // Use previous factory logic...

        // ... factory loop


        // Spawn Fish in Ponds
        // Top Right Pond
        this.spawnFishInArea(680, 200, 100, 15);
        // Bottom Right Pond
        this.spawnFishInArea(680, 480, 80, 10);
        // Central Pond
        this.spawnFishInArea(430, 680, 60, 8);


        // Cameras
        this.cameras.main.setBounds(0, 0, map.width, map.height);
        this.cameras.main.centerOn(map.width / 2, map.height / 2);
        this.cameras.main.setZoom(1);



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

        // UI Toolbar
        this.createToolbar();

        // Input Handling for Placement
        this.input.on('pointerdown', (pointer) => {
            if (this.currentTool === 'filter') {
                const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
                this.placeFilter(worldPoint.x, worldPoint.y);
            }
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

        // Update Factories & Filters
        this.children.list.forEach(child => {
            if (child.update && (child instanceof Factory || child instanceof Filter)) child.update();
        });

        // Update Fish
        this.fishGroup.forEach(fish => fish.update(time, delta));

        // Draw Pollution
        this.drawPollution();

        // Update HUD
        if (this.hudText) this.updateHUD(time);
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

    spawnFishInArea(centerX, centerY, radius, count) {
        if (!this.fishGroup) this.fishGroup = [];
        for (let i = 0; i < count; i++) {
            // Random point in circle
            const angle = Math.random() * Math.PI * 2;
            const r = Math.sqrt(Math.random()) * radius;
            const x = centerX + r * Math.cos(angle);
            const y = centerY + r * Math.sin(angle);

            // Check if water
            const gx = Math.floor(x / this.gridSystem.gridSize);
            const gy = Math.floor(y / this.gridSystem.gridSize);

            if (this.gridSystem.isWater(gx, gy)) {
                // Create fish bounded to this area
                const bounds = { x: centerX - radius, y: centerY - radius, width: radius * 2, height: radius * 2 };
                const fish = new Fish(this, x, y, bounds, this.pollutionSystem);
                this.fishGroup.push(fish);
            }
        }
    }

    createToolbar() {
        // Simple UI container
        const toolbar = this.add.container(16, 60);
        toolbar.setScrollFactor(0).setDepth(100);

        // Filter Button (Background)
        const bg = this.add.rectangle(0, 0, 140, 40, 0x444444)
            .setOrigin(0, 0)
            .setInteractive({ useHandCursor: true });

        // Filter Text
        const text = this.add.text(10, 10, 'Place Filter', { fontSize: '16px', fill: '#ffffff' });

        toolbar.add([bg, text]);

        // Interaction
        bg.on('pointerdown', () => {
            this.currentTool = this.currentTool === 'filter' ? 'none' : 'filter';
            // Update Visual State
            if (this.currentTool === 'filter') {
                bg.setFillStyle(0x00aa00); // Green when active
                text.setText('Click to Place');
            } else {
                bg.setFillStyle(0x444444); // Gray when inactive
                text.setText('Place Filter');
            }
        });

        this.createHUD();
    }

    createHUD() {
        const hudBg = this.add.rectangle(16, 16, 200, 40, 0x000000, 0.7).setOrigin(0, 0).setScrollFactor(0).setDepth(100);
        this.hudText = this.add.text(26, 26, 'Loading stats...', {
            fontSize: '14px',
            fill: '#ffffff'
        }).setScrollFactor(0).setDepth(101);
    }

    updateHUD(time) {
        const stats = this.pollutionSystem.getStatistics();
        const liveFish = this.fishGroup.filter(f => !f.isDead).length;
        const totalFish = this.fishGroup.length;

        this.hudText.setText(
            `Pollution: ${stats.avgPollution.toFixed(1)}%\n` +
            `Fish: ${liveFish}/${totalFish}`
        );

        // Game Over / Win check
        if (liveFish === 0) {
            this.hudText.setColor('#ff0000');
            this.hudText.setText('GAME OVER: All fish died!');
        } else if (stats.avgPollution < 2 && time > 5000) { // Require < 2% pollution and some time passed
            this.hudText.setColor('#00ff00');
            this.hudText.setText(`VICTORY! Water Clean\nPollution: ${stats.avgPollution.toFixed(1)}%`);
        } else {
            this.hudText.setColor('#ffffff');
        }
    }

    placeFilter(x, y) {
        // Check grid if water
        const gx = Math.floor(x / this.gridSystem.gridSize);
        const gy = Math.floor(y / this.gridSystem.gridSize);

        if (this.gridSystem.isWater(gx, gy)) {
            const filter = new Filter(this, x, y, this.pollutionSystem);
            this.add.existing(filter);
        } else {
            console.log("Can only place filters on water!");
        }
    }
}
