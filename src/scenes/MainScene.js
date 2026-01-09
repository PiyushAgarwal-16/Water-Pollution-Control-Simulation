import Phaser from 'phaser';
import GridSystem from '../systems/GridSystem';
import PollutionSystem from '../systems/PollutionSystem';
import Factory from '../objects/Factory';
import Filter from '../objects/Filter';
import Farm from '../objects/Farm';

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
        // Generate Farm Texture (Green Square)
        const farmGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        farmGraphics.fillStyle(0x44aa44, 1);
        farmGraphics.fillRect(0, 0, 32, 32); // 32x32 farm
        farmGraphics.lineStyle(2, 0x226622);
        farmGraphics.strokeRect(0, 0, 32, 32);
        farmGraphics.generateTexture('farm', 32, 32);
        farmGraphics.destroy();

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
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });

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
            factory.setAlpha(0.01); // Almost invisible but interactable (visible=false disables input)
            this.add.existing(factory);
        });

        // Place Farms (Visible)
        // Locate them near water but on land
        const farmLocations = [
            { x: 180, y: 220 }, // Top Left
            { x: 650, y: 500 }  // Bottom Right near pond
        ];

        farmLocations.forEach(loc => {
            const farm = new Farm(this, loc.x, loc.y, this.pollutionSystem);
            // Farms are visible "new" structures, unlike the pre-painted factories
            this.add.existing(farm);
        });


        // UI Toolbar
        this.createToolbar();

        // Input Handling for Placement
        this.input.on('pointerdown', (pointer) => {
            // Ensure focus on click
            window.focus();

            if (this.currentTool === 'filter') {
                const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
                this.placeFilter(worldPoint.x, worldPoint.y);
            }
        });
    }

    update(time, delta) {
        try {
            // Update Camera
            const speed = 10;
            if (this.cursors.left.isDown || this.wasd.left.isDown) this.cameras.main.scrollX -= speed;
            if (this.cursors.right.isDown || this.wasd.right.isDown) this.cameras.main.scrollX += speed;
            if (this.cursors.up.isDown || this.wasd.up.isDown) this.cameras.main.scrollY -= speed;
            if (this.cursors.down.isDown || this.wasd.down.isDown) this.cameras.main.scrollY += speed;

            // Update Simulation
            this.pollutionSystem.update();
        } catch (e) {
            console.error("Error in MainScene update loop:", e);
        }

        // Update Factories & Filters
        this.children.list.forEach(child => {
            if (child.update && (child instanceof Factory || child instanceof Filter || child instanceof Farm)) child.update();
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
                if (!cell) continue;

                // Draw Long Term Pollution (Greenish Sludge / Algae)
                if (cell.longTermPollution > 0.01) {
                    const alpha = Phaser.Math.Clamp(cell.longTermPollution, 0, 0.9);
                    this.pollutionGraphics.fillStyle(0x004400, alpha); // Deep Green
                    this.pollutionGraphics.fillRect(cell.worldX, cell.worldY, size, size);
                }

                // Draw Active Pollution (Brownish tint) on top
                if (cell.pollution > 0.05) {
                    const alpha = Phaser.Math.Clamp(cell.pollution, 0, 0.8);
                    this.pollutionGraphics.fillStyle(0x654321, alpha); // Brown
                    this.pollutionGraphics.fillRect(cell.worldX, cell.worldY, size, size);
                }
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
        const hudBg = this.add.rectangle(16, 16, 220, 55, 0x000000, 0.7).setOrigin(0, 0).setScrollFactor(0).setDepth(100);
        this.hudText = this.add.text(26, 26, 'Loading stats...', {
            fontSize: '14px',
            fill: '#ffffff'
        }).setScrollFactor(0).setDepth(101);

        // Force initial update
        this.updateHUD(0);
    }

    updateHUD(time) {
        if (this.hudText) {
            const stats = this.pollutionSystem.getStatistics();
            const liveFish = this.fishGroup.filter(f => !f.isDead).length;
            const totalFish = this.fishGroup.length;

            // Calculate "River Health" as inverse of long-term pollution
            const health = Math.max(0, 100 - stats.avgLongTerm).toFixed(1);

            this.hudText.setText(
                `Pollution (Active): ${stats.avgPollution.toFixed(1)}%\n` +
                `River Health: ${health}%\n` +
                `Fish: ${liveFish}/${totalFish}`
            );
        }
    }

    selectObject(object) {
        // Deselect previous
        if (this.selectedObject) {
            this.selectedObject.clearTint();
        }

        this.selectedObject = object;
        this.selectedObject.setTint(0xffff00); // Highlight Yellow

        this.updateInspectorUI();
    }

    updateInspectorUI() {
        if (!this.inspectorContainer) {
            this.createInspectorUI();
        }

        this.inspectorContainer.setVisible(true);
        this.inspectorTitle.setText(this.selectedObject instanceof Factory ? 'Factory Control' : 'Filter Control');

        // Clear previous controls
        this.inspectorControls.removeAll(true);

        if (this.selectedObject instanceof Factory) {
            const rate = this.selectedObject.pollutionRate;

            // Factory UI - "Discharge Policy"
            const title = this.add.text(0, -15, 'Industrial Policy:', { fontSize: '10px', fill: '#aaaaaa' });

            const isApprox = (val) => Math.abs(rate - val) < 0.005;

            // Strict (Low - 0.01)
            const strictBtn = this.createButton(0, 10, 'Strict', 0x00aa00, () => {
                this.selectedObject.setPollutionLevel(20); // 0.01
                this.updateInspectorUI();
            }, isApprox(0.01));

            // Standard (Med - 0.025)
            const stdBtn = this.createButton(50, 10, 'Std', 0xaaaa00, () => {
                this.selectedObject.setPollutionLevel(50); // 0.025
                this.updateInspectorUI();
            }, isApprox(0.025));

            // Lax (High - 0.05)
            const laxBtn = this.createButton(100, 10, 'Lax', 0xaa0000, () => {
                this.selectedObject.setPollutionLevel(100); // 0.05
                this.updateInspectorUI();
            }, isApprox(0.05));

            const valText = this.add.text(0, 40, `Discharge: ${(rate * 2000).toFixed(0)}%`, { fontSize: '10px' });

            this.inspectorControls.add([title, strictBtn, stdBtn, laxBtn, valText]);

        } else if (this.selectedObject instanceof Farm) {
            const rate = this.selectedObject.pollutionRate;

            // Farm UI - "Farming Practice"
            const title = this.add.text(0, -15, 'Farming Practice:', { fontSize: '10px', fill: '#aaaaaa' });

            const isApprox = (val) => Math.abs(rate - val) < 0.005;

            // Sustainable (Low - 0.01)
            const sustBtn = this.createButton(0, 10, 'Org', 0x00aa00, () => {
                this.selectedObject.setPollutionLevel(0); // Sustainable
                this.updateInspectorUI();
            }, isApprox(0.01));

            // Standard (Med - 0.03)
            const stdBtn = this.createButton(50, 10, 'Std', 0xaaaa00, () => {
                this.selectedObject.setPollutionLevel(50); // Standard
                this.updateInspectorUI();
            }, isApprox(0.03));

            // Intensive (High - 0.05)
            const intBtn = this.createButton(100, 10, 'Int', 0xaa0000, () => {
                this.selectedObject.setPollutionLevel(100); // Intensive
                this.updateInspectorUI();
            }, isApprox(0.05));

            const valText = this.add.text(0, 40, `Runoff Index: ${(rate * 2000).toFixed(0)}`, { fontSize: '10px' });

            this.inspectorControls.add([title, sustBtn, stdBtn, intBtn, valText]);

        } else if (this.selectedObject instanceof Filter) {
            const label = this.add.text(0, 0, 'Status:', { fontSize: '12px', fill: '#ffffff' });

            const color = this.selectedObject.isActive ? 0x00aa00 : 0xaa0000;
            const text = this.selectedObject.isActive ? 'Active' : 'Inactive';

            const toggleBtn = this.createButton(0, 25, text, color, () => {
                this.selectedObject.toggle(!this.selectedObject.isActive);
                this.updateInspectorUI();
            }, true);

            this.inspectorControls.add([label, toggleBtn]);
        }
    }

    createInspectorUI() {
        // Place inspector on the right side
        const x = this.cameras.main.width ? this.cameras.main.width - 170 : 630;
        this.inspectorContainer = this.add.container(x, 60).setScrollFactor(0).setDepth(100);

        // Make background interactive to block clicks
        const bg = this.add.rectangle(0, 0, 160, 100, 0x222222, 0.9)
            .setOrigin(0, 0)
            .setInteractive();

        this.inspectorTitle = this.add.text(10, 10, 'Inspector', { fontSize: '14px', fill: '#ffcc00' });
        this.inspectorControls = this.add.container(10, 40);

        this.inspectorContainer.add([bg, this.inspectorTitle, this.inspectorControls]);
        this.inspectorContainer.setVisible(false);
    }

    createButton(x, y, text, color, callback, isActive = false) {
        const container = this.add.container(x, y);

        // Bigger button
        const width = 45;
        const height = 25;

        const baseColor = isActive ? color : 0x555555;
        const hoverColor = 0x777777;

        const bg = this.add.rectangle(0, 0, width, height, baseColor)
            .setOrigin(0, 0)
            .setStrokeStyle(isActive ? 2 : 0, 0xffffff);

        bg.setInteractive({ useHandCursor: true });

        const txt = this.add.text(width / 2, height / 2, text, { fontSize: '12px', fill: '#ffffff' })
            .setOrigin(0.5, 0.5);

        bg.on('pointerdown', (pointer, localX, localY, event) => {
            // Stop propagation to prevent clicking through to the map
            // In Phaser 3, stopPropagation on the event object might not be enough if the scene input is also listening.
            // We need to stop the pointer event from bubbling.
            if (event && event.stopPropagation) event.stopPropagation();

            // Visual Feedback
            bg.setAlpha(0.5);
            this.time.delayedCall(100, () => {
                if (bg.scene) { // Check if still active/existing in scene
                    bg.setAlpha(1);
                }
            });

            console.log(`Button clicked: ${text}`);

            // Defer the callback to the next frame to allow the input event to finish processing
            // before we potentially destroy this button (which happens in updateInspectorUI).
            this.time.delayedCall(0, () => {
                callback();
            });
        });

        container.add([bg, txt]);
        return container;
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
}
