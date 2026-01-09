export default class Factory extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, pollutionSystem) {
        super(scene, x, y, 'factory'); // We'll need a factory texture or use a placeholder
        this.scene = scene;
        this.pollutionSystem = pollutionSystem;
        this.pollutionRate = 0.05; // Default "high" output
        this.setInteractive({ useHandCursor: true });

        // Add a selection indicator (simple ring or tint)
        // Add a selection indicator (simple ring or tint)
        this.on('pointerdown', (pointer, localX, localY, event) => {
            if (event && event.stopPropagation) event.stopPropagation();
            this.scene.selectObject(this);
            this.scene.showFactoryOverlay(this);
        });
    }

    setPollutionLevel(level) {
        // level: 0 to 200 (percentage)
        this.pollutionRate = 0.05 * (level / 100);
        console.log(`Factory pollution set to: ${this.pollutionRate} (${level}%)`);
    }

    update() {
        // Find grid cell below the factory
        const gridSystem = this.pollutionSystem.gridSystem;
        const gridX = Math.floor(this.x / gridSystem.gridSize);
        const gridY = Math.floor(this.y / gridSystem.gridSize);

        // Add pollution to THIS cell or nearby water
        // Search a small radius for water if placed on land
        let targetCell = null;

        // Simple search for nearest water
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                if (gridSystem.isWater(gridX + dx, gridY + dy)) {
                    targetCell = { x: gridX + dx, y: gridY + dy };
                    break;
                }
            }
            if (targetCell) break;
        }

        if (targetCell) {
            this.pollutionSystem.addPollution(targetCell.x, targetCell.y, this.pollutionRate);
        }
    }
}
