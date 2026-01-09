import Phaser from 'phaser';

export default class Filter extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, pollutionSystem) {
        super(scene, x, y, 'filter');
        this.scene = scene;
        this.pollutionSystem = pollutionSystem; // Reference to the pollution system

        this.setOrigin(0.5, 0.5);
        this.setScale(0.8); // Adjust scale as needed
        this.scene.add.existing(this);

        // Visual spin animation or similar to show it's working
        this.scene.tweens.add({
            targets: this,
            angle: 360,
            duration: 3000,
            repeat: -1,
            ease: 'Linear'
        });
    }

    update() {
        // Actively remove pollution from nearby cells
        // Filter radius: 3 tiles (approx 24 pixels if grid size is 8)
        // Let's affect a 5x5 grid area around the filter

        const gridSystem = this.pollutionSystem.gridSystem;
        const gridX = Math.floor(this.x / gridSystem.gridSize);
        const gridY = Math.floor(this.y / gridSystem.gridSize);
        const radius = 3;

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                // Remove pollution
                // Amount: 0.05 per frame (stronger than factory emission to actually clean)
                this.pollutionSystem.removePollution(gridX + dx, gridY + dy, 0.05);
            }
        }
    }
}
