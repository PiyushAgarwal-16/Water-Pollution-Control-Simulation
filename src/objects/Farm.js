import Phaser from 'phaser';

export default class Farm extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, pollutionSystem) {
        super(scene, x, y, 'farm');
        this.scene = scene;
        this.pollutionSystem = pollutionSystem;
        this.pollutionRate = 0.02; // Default "Standard" output
        this.setInteractive({ useHandCursor: true });

        // Add a selection indicator
        this.on('pointerdown', (pointer, localX, localY, event) => {
            if (event && event.stopPropagation) event.stopPropagation();
            this.scene.selectObject(this);
        });
    }

    setPollutionLevel(level) {
        // level: 0 to 100 representing policy strictness/farming intensity
        // 0 = Sustainable/Organic (Very Low)
        // 50 = Standard
        // 100 = Intensive (High)
        this.pollutionRate = 0.01 + (0.04 * (level / 100)); // Range 0.01 to 0.05
        console.log(`Farm pollution set to: ${this.pollutionRate} (Level ${level})`);
    }

    update() {
        const gridSystem = this.pollutionSystem.gridSystem;
        const gridX = Math.floor(this.x / gridSystem.gridSize);
        const gridY = Math.floor(this.y / gridSystem.gridSize);

        // Agricultural Runoff Logic:
        // Unlike factories which dump into a single pipe/point,
        // Farms cause runoff spread over a wider area nearby.

        // Find water cells within a radius
        const radius = 3;
        let waterCells = [];

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (gridSystem.isWater(gridX + dx, gridY + dy)) {
                    waterCells.push({ x: gridX + dx, y: gridY + dy });
                }
            }
        }

        if (waterCells.length > 0) {
            // Distribute pollution across found water cells
            // "Runoff" is widespread but less concentrated per cell than a pipe
            const pollutionPerCell = this.pollutionRate / Math.min(waterCells.length, 5); // Cap divisor to prevent dilution being too strong

            waterCells.forEach(cell => {
                this.pollutionSystem.addPollution(cell.x, cell.y, pollutionPerCell);
            });
        }
    }
}
