import Phaser from 'phaser';
import GridSystem from '../systems/GridSystem';
import PollutionSystem from '../systems/PollutionSystem';
import EcosystemHealthSystem from '../systems/EcosystemHealthSystem';
import Factory from '../objects/Factory';
import Filter from '../objects/Filter';
import Farm from '../objects/Farm';

import Fish from '../objects/Fish';

export default class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
        this.currentTool = 'none'; // 'none', 'filter'
        this.pollutionHistory = [];
        this.lastPollutionCheck = 0;
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
        this.ecosystemHealth = new EcosystemHealthSystem();
        this.pollutionGraphics = this.add.graphics();
        this.pollutionGraphics.setAlpha(0.6);

        // Setup ecosystem state change callback
        this.ecosystemHealth.onStateChange((newState, oldState, score) => {
            this.showEcosystemNotification(newState, oldState, score);
        });

        // Initialize intervention feedback message queue
        this.messageQueue = [];
        this.currentFeedbackMessage = null;

        // Time-based message tracking
        this.lastTimeMessage = 0;
        this.timeMessageInterval = 45000; // 45 seconds
        this.timeMessageIndex = 0;

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
            } else {
                // Check if clicked on water/pond for educational overlay
                const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
                this.checkEducationalClick(worldPoint.x, worldPoint.y);
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

        // Check for periodic time-based messages
        this.checkForTimeMessage(time);
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
        this.createHUD();
    }

    createHUD() {
        const hudBg = this.add.rectangle(16, 16, 260, 82, 0x000000, 0.7).setOrigin(0, 0).setScrollFactor(0).setDepth(100);
        this.hudText = this.add.text(26, 26, 'Loading stats...', {
            fontSize: '14px',
            fill: '#ffffff',
            lineSpacing: 2
        }).setScrollFactor(0).setDepth(101);

        this.statusText = this.add.text(26, 74, '', {
            fontSize: '11px',
            fill: '#ffcc00',
            fontStyle: 'italic'
        }).setScrollFactor(0).setDepth(101);

        // Force initial update
        this.updateHUD(0);
    }

    updateHUD(time) {
        if (this.hudText) {
            const stats = this.pollutionSystem.getStatistics();
            const liveFish = this.fishGroup.filter(f => !f.isDead).length;
            const totalFish = this.fishGroup.length;

            // Calculate average fish health
            const aliveFish = this.fishGroup.filter(f => !f.isDead);
            const avgFishHealth = aliveFish.length > 0
                ? aliveFish.reduce((sum, f) => sum + f.health, 0) / aliveFish.length
                : 0;

            // Calculate "River Health" as inverse of long-term pollution
            const riverHealth = Math.max(0, 100 - stats.avgLongTerm);

            // Update ecosystem health
            this.ecosystemHealth.calculateHealth({
                liveFish,
                totalFish,
                avgFishHealth,
                activePollution: stats.avgPollution,
                riverHealth
            });
            this.ecosystemHealth.updateState();

            const stateInfo = this.ecosystemHealth.getStateInfo();

            this.hudText.setText(
                `Pollution: ${stats.avgPollution.toFixed(1)}% | River Health: ${riverHealth.toFixed(1)}%\n` +
                `Fish: ${liveFish}/${totalFish}\n` +
                `Ecosystem: ${stateInfo.icon} ${stateInfo.name} (${this.ecosystemHealth.healthScore.toFixed(0)})`
            );

            // Update status text color based on state
            if (this.statusText) {
                this.statusText.setFill(stateInfo.colorHex);
                this.statusText.setText(stateInfo.message);
            }

            // Track pollution trend (update every 2 seconds)
            if (!this.lastPollutionCheck) this.lastPollutionCheck = 0;
            if (!this.pollutionHistory) this.pollutionHistory = [];

            if (time - this.lastPollutionCheck > 2000) {
                this.pollutionHistory.push(stats.avgPollution);
                if (this.pollutionHistory.length > 5) this.pollutionHistory.shift();
                this.lastPollutionCheck = time;
            }
        }
    }

    updateWaterQualityMessage(stats, liveFish, totalFish) {
        if (!this.statusText) return;

        let message = '';
        let color = '#ffcc00';

        // Calculate trend
        let trend = 'stable';
        if (this.pollutionHistory.length >= 3) {
            const recent = this.pollutionHistory.slice(-3);
            const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
            const oldest = recent[0];
            const newest = recent[recent.length - 1];

            if (newest < oldest - 2) trend = 'improving';
            else if (newest > oldest + 2) trend = 'worsening';
        }

        // Determine message based on pollution level, trend, and fish health
        const deathRate = (totalFish - liveFish) / totalFish;

        if (stats.avgPollution < 5 && stats.avgLongTerm < 20) {
            message = '✓ Water quality improving';
            color = '#00ff00';
        } else if (trend === 'improving') {
            message = '↓ Pollution decreasing';
            color = '#88ff88';
        } else if (stats.avgPollution > 30 || stats.avgLongTerm > 60) {
            message = '⚠ Ecosystem under stress';
            color = '#ff4444';
        } else if (trend === 'worsening') {
            message = '↑ Pollution accumulating';
            color = '#ffaa00';
        } else if (deathRate > 0.3) {
            message = '⚠ Fish population declining';
            color = '#ff8800';
        } else if (stats.avgPollution > 15) {
            message = '~ Moderate pollution detected';
            color = '#ffcc00';
        } else {
            message = '~ Water quality stable';
            color = '#aaaaff';
        }

        this.statusText.setText(message);
        this.statusText.setColor(color);
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
            const title = this.add.text(0, -15, 'Industrial Policy:', { fontSize: '10px', fill: '#aaaaaa' })
                .setScrollFactor(0);

            const isApprox = (val) => Math.abs(rate - val) < 0.005;

            // Strict (Low - 0.01)
            const strictBtn = this.createButton(0, 10, 'Strict', 0x00aa00, () => {
                this.selectedObject.setPollutionLevel(20); // 0.01
                this.updateInspectorUI();
                this.showInterventionFeedback('Prevention is better than cleanup - great choice!', 'positive');
            }, isApprox(0.01));

            // Standard (Med - 0.025)
            const stdBtn = this.createButton(50, 10, 'Std', 0xaaaa00, () => {
                this.selectedObject.setPollutionLevel(50); // 0.025
                this.updateInspectorUI();
                this.showInterventionFeedback('Moderate pollution controls applied', 'neutral');
            }, isApprox(0.025));

            // Lax (High - 0.05)
            const laxBtn = this.createButton(100, 10, 'Lax', 0xaa0000, () => {
                this.selectedObject.setPollutionLevel(100); // 0.05
                this.updateInspectorUI();
                this.showInterventionFeedback('Warning: High pollution output will harm ecosystem', 'warning');
            }, isApprox(0.05));

            const valText = this.add.text(0, 40, `Discharge: ${(rate * 2000).toFixed(0)}%`, { fontSize: '10px' })
                .setScrollFactor(0);

            this.inspectorControls.add([title, strictBtn, stdBtn, laxBtn, valText]);

        } else if (this.selectedObject instanceof Farm) {
            const rate = this.selectedObject.pollutionRate;

            // Farm UI - "Farming Practice"
            const title = this.add.text(0, -15, 'Farming Practice:', { fontSize: '10px', fill: '#aaaaaa' })
                .setScrollFactor(0);

            const isApprox = (val) => Math.abs(rate - val) < 0.005;

            // Sustainable (Low - 0.01)
            const sustBtn = this.createButton(0, 10, 'Org', 0x00aa00, () => {
                this.selectedObject.setPollutionLevel(0); // Sustainable
                this.updateInspectorUI();
                this.showInterventionFeedback('Organic methods protect water quality long-term', 'positive');
            }, isApprox(0.01));

            // Standard (Med - 0.03)
            const stdBtn = this.createButton(50, 10, 'Std', 0xaaaa00, () => {
                this.selectedObject.setPollutionLevel(50); // Standard
                this.updateInspectorUI();
                this.showInterventionFeedback('Standard farming practices - moderate runoff expected', 'neutral');
            }, isApprox(0.03));

            // Intensive (High - 0.05)
            const intBtn = this.createButton(100, 10, 'Int', 0xaa0000, () => {
                this.selectedObject.setPollutionLevel(100); // Intensive
                this.updateInspectorUI();
                this.showInterventionFeedback('Warning: High fertilizer runoff will accumulate', 'warning');
            }, isApprox(0.05));

            const valText = this.add.text(0, 40, `Runoff Index: ${(rate * 2000).toFixed(0)}`, { fontSize: '10px' })
                .setScrollFactor(0);

            this.inspectorControls.add([title, sustBtn, stdBtn, intBtn, valText]);

        } else if (this.selectedObject instanceof Filter) {
            const label = this.add.text(0, 0, 'Status:', { fontSize: '12px', fill: '#ffffff' })
                .setScrollFactor(0);

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
            .setInteractive()
            .setScrollFactor(0);

        this.inspectorTitle = this.add.text(10, 10, 'Inspector', { fontSize: '14px', fill: '#ffcc00' })
            .setScrollFactor(0);
        this.inspectorControls = this.add.container(10, 40)
            .setScrollFactor(0);

        this.inspectorContainer.add([bg, this.inspectorTitle, this.inspectorControls]);
        this.inspectorContainer.setVisible(false);
    }

    createButton(x, y, text, color, callback, isActive = false) {
        const container = this.add.container(x, y);
        // CRITICAL: Ensure button is in screen space, not affected by camera
        container.setScrollFactor(0);

        // Bigger button
        const width = 45;
        const height = 25;

        const baseColor = isActive ? color : 0x555555;
        const hoverColor = 0x777777;

        const bg = this.add.rectangle(0, 0, width, height, baseColor)
            .setOrigin(0, 0)
            .setStrokeStyle(isActive ? 2 : 0, 0xffffff)
            .setScrollFactor(0);

        bg.setInteractive({ useHandCursor: true });

        const txt = this.add.text(width / 2, height / 2, text, { fontSize: '12px', fill: '#ffffff' })
            .setOrigin(0.5, 0.5)
            .setScrollFactor(0);

        bg.on('pointerdown', (pointer, localX, localY, event) => {
            // Stop propagation to prevent clicking through to the map
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

            // Find nearest pollution source for location-based feedback
            let minDistance = Infinity;
            let nearestSource = null;

            // Check all factories and farms
            this.children.list.forEach(child => {
                if (child instanceof Factory || child instanceof Farm) {
                    const dist = Phaser.Math.Distance.Between(x, y, child.x, child.y);
                    if (dist < minDistance) {
                        minDistance = dist;
                        nearestSource = child;
                    }
                }
            });

            // Location-based feedback
            if (minDistance < 150) {
                this.showInterventionFeedback(
                    'Excellent! Upstream filtering is most effective',
                    'positive'
                );
            } else if (minDistance < 300) {
                this.showInterventionFeedback(
                    'Filter activated! Reduces downstream pollution over time',
                    'neutral'
                );
            } else {
                this.showInterventionFeedback(
                    'Filter placed. Upstream locations work better',
                    'neutral'
                );
            }
        } else {
            console.log("Can only place filters on water!");
            this.showInterventionFeedback(
                'Filters must be placed on water',
                'warning'
            );
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

    checkEducationalClick(worldX, worldY) {
        // Check if clicked on water/pond
        const gx = Math.floor(worldX / this.gridSystem.gridSize);
        const gy = Math.floor(worldY / this.gridSystem.gridSize);

        if (this.gridSystem.isWater(gx, gy)) {
            this.showPondOverlay(worldX, worldY, gx, gy);
        }
    }

    showFactoryOverlay(factory) {
        this.hideEducationalOverlay();

        const x = this.cameras.main.width / 2;
        const y = this.cameras.main.height - 200;

        this.educationalOverlay = this.add.container(x, y).setScrollFactor(0).setDepth(200);

        const width = 380;
        const height = 180;

        // Interactive background that closes on click
        const bg = this.add.rectangle(0, 0, width, height, 0x1a1a1a, 0.95)
            .setOrigin(0.5, 0.5)
            .setStrokeStyle(3, 0x4488ff)
            .setInteractive();

        // Close on background click (with stopPropagation to prevent map interaction)
        bg.on('pointerdown', (pointer, localX, localY, event) => {
            if (event && event.stopPropagation) event.stopPropagation();
            this.hideEducationalOverlay();
        });

        // Close button (X)
        const closeBtn = this.add.text(width / 2 - 15, -height / 2 + 10, '✕', {
            fontFamily: 'Inter, Arial, sans-serif',
            fontSize: '20px',
            fill: '#888888',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0.5)
            .setInteractive({ useHandCursor: true });

        closeBtn.on('pointerdown', (pointer, localX, localY, event) => {
            if (event && event.stopPropagation) event.stopPropagation();
            this.hideEducationalOverlay();
        });

        closeBtn.on('pointerover', () => closeBtn.setFill('#ffffff'));
        closeBtn.on('pointerout', () => closeBtn.setFill('#888888'));

        const title = this.add.text(0, -70, '🏭 Factory Information', {
            fontFamily: 'Inter, Arial, sans-serif',
            fontSize: '18px',
            fill: '#4488ff',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0.5);

        const pollutionLevel = factory.pollutionRate >= 0.04 ? 'High' : factory.pollutionRate >= 0.02 ? 'Medium' : 'Low';
        const pollutionColor = factory.pollutionRate >= 0.04 ? '#ff4444' : factory.pollutionRate >= 0.02 ? '#ffaa44' : '#44ff44';

        const info = this.add.text(0, -20,
            `Pollution Output: ${pollutionLevel}\n` +
            `Rate: ${(factory.pollutionRate * 100).toFixed(1)}%/sec\n\n` +
            `This factory releases industrial waste that flows downstream, contaminating rivers and ponds. Reduce output to protect aquatic life.`,
            {
                fontFamily: 'Inter, Arial, sans-serif',
                fontSize: '13px',
                fill: '#e0e0e0',
                align: 'center',
                lineSpacing: 4,
                wordWrap: { width: 350, useAdvancedWrap: true }
            }
        ).setOrigin(0.5, 0);

        // Highlight pollution level with color
        const levelIndicator = this.add.circle(-100, -18, 6, parseInt(pollutionColor.replace('#', '0x')));

        const footer = this.add.text(0, 70, 'Click anywhere to close', {
            fontFamily: 'Inter, Arial, sans-serif',
            fontSize: '11px',
            fill: '#666666',
            fontStyle: 'italic'
        }).setOrigin(0.5, 0.5);

        this.educationalOverlay.add([bg, closeBtn, title, info, levelIndicator, footer]);
    }

    showPondOverlay(worldX, worldY, gx, gy) {
        this.hideEducationalOverlay();

        const cell = this.gridSystem.getCell(gx, gy);
        if (!cell) return;

        // Get fish in this area
        const nearbyFish = this.fishGroup.filter(fish => {
            const distance = Phaser.Math.Distance.Between(fish.x, fish.y, worldX, worldY);
            return distance < 100;
        });

        const liveFish = nearbyFish.filter(f => !f.isDead).length;
        const avgHealth = liveFish > 0 ?
            nearbyFish.filter(f => !f.isDead).reduce((sum, f) => sum + f.health, 0) / liveFish : 0;

        const x = this.cameras.main.width / 2;
        const y = this.cameras.main.height - 220;

        this.educationalOverlay = this.add.container(x, y).setScrollFactor(0).setDepth(200);

        const width = 400;
        const height = 220;

        // Interactive background that closes on click
        const bg = this.add.rectangle(0, 0, width, height, 0x1a1a1a, 0.95)
            .setOrigin(0.5, 0.5)
            .setStrokeStyle(3, 0x44aaff)
            .setInteractive();

        bg.on('pointerdown', (pointer, localX, localY, event) => {
            if (event && event.stopPropagation) event.stopPropagation();
            this.hideEducationalOverlay();
        });

        // Close button (X)
        const closeBtn = this.add.text(width / 2 - 15, -height / 2 + 10, '✕', {
            fontFamily: 'Inter, Arial, sans-serif',
            fontSize: '20px',
            fill: '#888888',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0.5)
            .setInteractive({ useHandCursor: true });

        closeBtn.on('pointerdown', (pointer, localX, localY, event) => {
            if (event && event.stopPropagation) event.stopPropagation();
            this.hideEducationalOverlay();
        });

        closeBtn.on('pointerover', () => closeBtn.setFill('#ffffff'));
        closeBtn.on('pointerout', () => closeBtn.setFill('#888888'));

        const title = this.add.text(0, -95, '💧 Water Body Information', {
            fontFamily: 'Inter, Arial, sans-serif',
            fontSize: '18px',
            fill: '#44aaff',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0.5);

        const pollution = cell.pollution * 100;
        const longTermPollution = cell.longTermPollution * 100;
        const waterQuality = pollution < 5 ? 'Clean' : pollution < 20 ? 'Fair' : pollution < 40 ? 'Poor' : 'Toxic';
        const waterColor = pollution < 5 ? '#44ff44' : pollution < 20 ? '#88ff44' : pollution < 40 ? '#ffaa44' : '#ff4444';

        const fishStatus = avgHealth > 80 ? 'Healthy' : avgHealth > 50 ? 'Stressed' : avgHealth > 20 ? 'Sick' : 'Critical';
        const fishColor = avgHealth > 80 ? '#44ff44' : avgHealth > 50 ? '#ffaa44' : '#ff4444';

        let explanation = '';
        if (pollution > 30) {
            explanation = 'High pollution is poisoning fish and degrading the ecosystem. Place filters or reduce factory output to save wildlife.';
        } else if (pollution > 10) {
            explanation = 'Moderate pollution is building up. Fish are showing signs of stress. Act now to prevent long-term damage.';
        } else if (longTermPollution > 20) {
            explanation = 'Water appears clean now, but residual pollutants remain in sediment. Continued care is needed for recovery.';
        } else {
            explanation = 'Water quality is good! Fish are thriving. Keep pollution low to maintain a healthy ecosystem.';
        }

        const info = this.add.text(0, -30,
            `Water Quality: ${waterQuality}\n` +
            `Active Pollution: ${pollution.toFixed(1)}%\n` +
            `River Health: ${(100 - longTermPollution).toFixed(1)}%\n` +
            `Fish Nearby: ${liveFish} (${fishStatus})\n\n` +
            `${explanation}`,
            {
                fontFamily: 'Inter, Arial, sans-serif',
                fontSize: '13px',
                fill: '#e0e0e0',
                align: 'center',
                lineSpacing: 4,
                wordWrap: { width: 370, useAdvancedWrap: true }
            }
        ).setOrigin(0.5, 0);

        // Color indicators
        const waterIndicator = this.add.circle(-145, -28, 6, parseInt(waterColor.replace('#', '0x')));
        const fishIndicator = liveFish > 0 ? this.add.circle(-145, 7, 6, parseInt(fishColor.replace('#', '0x'))) : null;

        const footer = this.add.text(0, 95, 'Click anywhere to close', {
            fontFamily: 'Inter, Arial, sans-serif',
            fontSize: '11px',
            fill: '#666666',
            fontStyle: 'italic'
        }).setOrigin(0.5, 0.5);

        const elements = [bg, closeBtn, title, info, waterIndicator, footer];
        if (fishIndicator) elements.push(fishIndicator);

        this.educationalOverlay.add(elements);
    }

    hideEducationalOverlay() {
        if (this.educationalOverlay) {
            this.educationalOverlay.destroy();
            this.educationalOverlay = null;
        }
    }

    showEcosystemNotification(newState, oldState, score) {
        // Hide any existing notification
        this.hideEcosystemNotification();

        const explanation = this.ecosystemHealth.getStateChangeExplanation(newState, oldState);
        const stateInfo = this.ecosystemHealth.getStateInfo();

        const x = this.cameras.main.width / 2;
        const y = 100;

        this.ecosystemNotification = this.add.container(x, y).setScrollFactor(0).setDepth(250);

        const width = 420;
        const height = 200;

        // Background with state color border
        const bg = this.add.rectangle(0, 0, width, height, 0x1a1a1a, 0.95)
            .setOrigin(0.5, 0.5)
            .setStrokeStyle(4, stateInfo.color)
            .setInteractive();

        // Prevent clicks from going through
        bg.on('pointerdown', (pointer, localX, localY, event) => {
            if (event && event.stopPropagation) event.stopPropagation();
            this.hideEcosystemNotification();
        });

        // Title with icon
        const title = this.add.text(0, -80, explanation.title, {
            fontFamily: 'Inter, Arial, sans-serif',
            fontSize: '18px',
            fill: stateInfo.colorHex,
            fontStyle: 'bold',
            align: 'center'
        }).setOrigin(0.5, 0.5);

        // Cause explanation
        const cause = this.add.text(0, -45, explanation.cause, {
            fontFamily: 'Inter, Arial, sans-serif',
            fontSize: '13px',
            fill: '#ffffff',
            align: 'center',
            wordWrap: { width: 380, useAdvancedWrap: true }
        }).setOrigin(0.5, 0.5);

        // Actions header
        const actionsHeader = this.add.text(0, 0, 'Actions:', {
            fontFamily: 'Inter, Arial, sans-serif',
            fontSize: '12px',
            fill: '#ffcc00',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0.5);

        // Action items
        const actionsList = explanation.actions.map((action, i) => `• ${action}`).join('\n');
        const actions = this.add.text(0, 35, actionsList, {
            fontFamily: 'Inter, Arial, sans-serif',
            fontSize: '12px',
            fill: '#e0e0e0',
            align: 'left'
        }).setOrigin(0.5, 0.5);

        // Close instruction
        const closeText = this.add.text(0, 85, 'Click anywhere to dismiss', {
            fontFamily: 'Inter, Arial, sans-serif',
            fontSize: '11px',
            fill: '#666666',
            fontStyle: 'italic'
        }).setOrigin(0.5, 0.5);

        this.ecosystemNotification.add([bg, title, cause, actionsHeader, actions, closeText]);

        // Auto-dismiss after 10 seconds
        this.time.delayedCall(10000, () => {
            this.hideEcosystemNotification();
        });
    }

    hideEcosystemNotification() {
        if (this.ecosystemNotification) {
            this.ecosystemNotification.destroy();
            this.ecosystemNotification = null;
        }
    }

    /**
     * Show intervention feedback message with fade animation
     * @param {string} message - The message to display
     * @param {string} type - 'positive', 'neutral', or 'warning'
     */
    showInterventionFeedback(message, type = 'neutral') {
        // Add to queue
        this.messageQueue.push({ message, type });

        // Process queue if no message currently showing
        if (!this.currentFeedbackMessage) {
            this.processMessageQueue();
        }
    }

    processMessageQueue() {
        if (this.messageQueue.length === 0) {
            this.currentFeedbackMessage = null;
            return;
        }

        const { message, type } = this.messageQueue.shift();

        const x = this.cameras.main.width / 2;
        const y = this.cameras.main.height - 100;

        this.currentFeedbackMessage = this.add.container(x, y)
            .setScrollFactor(0)
            .setDepth(200)
            .setAlpha(0); // Start invisible for fade in

        const width = 400;
        const height = 80;

        // Color coding based on type
        const colors = {
            positive: 0x44ff44,
            neutral: 0x4488ff,
            warning: 0xff4444
        };
        const borderColor = colors[type] || colors.neutral;

        // Background
        const bg = this.add.rectangle(0, 0, width, height, 0x1a1a1a, 0.9)
            .setOrigin(0.5, 0.5)
            .setStrokeStyle(3, borderColor);

        // Icon based on type
        const icons = {
            positive: '✓',
            neutral: '🔧',
            warning: '⚠'
        };
        const icon = icons[type] || icons.neutral;

        // Message text
        const msgText = this.add.text(0, 0, `${icon} ${message}`, {
            fontFamily: 'Inter, Arial, sans-serif',
            fontSize: '14px',
            fill: '#ffffff',
            align: 'center',
            wordWrap: { width: 360, useAdvancedWrap: true }
        }).setOrigin(0.5, 0.5);

        this.currentFeedbackMessage.add([bg, msgText]);

        // Fade in animation
        this.tweens.add({
            targets: this.currentFeedbackMessage,
            alpha: 1,
            duration: 200,
            ease: 'Power2'
        });

        // Auto-hide after 4 seconds
        this.time.delayedCall(4000, () => {
            this.hideInterventionFeedback();
        });
    }

    hideInterventionFeedback() {
        if (this.currentFeedbackMessage) {
            // Fade out animation
            this.tweens.add({
                targets: this.currentFeedbackMessage,
                alpha: 0,
                duration: 800,
                ease: 'Power2',
                onComplete: () => {
                    if (this.currentFeedbackMessage) {
                        this.currentFeedbackMessage.destroy();
                        this.currentFeedbackMessage = null;

                        // Process next message in queue
                        this.processMessageQueue();
                    }
                }
            });
        }
    }

    /**
     * Check if it's time to show a periodic environmental message
     */
    checkForTimeMessage(time) {
        if (time - this.lastTimeMessage > this.timeMessageInterval) {
            this.showTimeBasedMessage();
            this.lastTimeMessage = time;
        }
    }

    /**
     * Show a time-based environmental message
     */
    showTimeBasedMessage() {
        const messages = this.getTimeMessagePool();
        if (messages.length === 0) return;

        const message = messages[this.timeMessageIndex % messages.length];
        this.timeMessageIndex++;

        this.showInterventionFeedback(message, 'neutral');
    }

    /**
     * Get context-aware message pool based on ecosystem state
     */
    getTimeMessagePool() {
        const state = this.ecosystemHealth.currentState;

        const generalMessages = [
            'Environmental damage accumulates over time',
            'Recovery takes longer than pollution',
            'Each decision has lasting consequences',
            'Natural healing is a slow process',
            'Small pollution sources add up to big problems'
        ];

        const criticalMessages = [
            'Your ecosystem is in crisis. Recovery will take time',
            'Severe damage has accumulated. Restoration is urgent',
            'Clean water took time to pollute, will take longer to restore',
            'Environmental damage accumulates over time',
            'Recovery takes longer than pollution'
        ];

        const stressedMessages = [
            'Your ecosystem is degrading. Act before it\'s too late',
            'Pollution accumulates faster when ecosystem is stressed',
            'Prevention now is easier than restoration later',
            'Environmental damage accumulates over time',
            'Recovery takes longer than pollution'
        ];

        const healthyMessages = [
            'Maintaining balance requires constant vigilance',
            'Good management today prevents crises tomorrow',
            'Ecosystems are fragile. Protect what you have',
            'Each decision has lasting consequences',
            'Natural healing is a slow process'
        ];

        // Return context-appropriate messages
        if (state === 'CRITICAL') {
            return criticalMessages;
        } else if (state === 'STRESSED') {
            return stressedMessages;
        } else if (state === 'HEALTHY') {
            return healthyMessages;
        }

        return generalMessages;
    }
}
