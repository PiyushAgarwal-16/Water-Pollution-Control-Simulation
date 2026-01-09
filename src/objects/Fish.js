export default class Fish extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, bounds, pollutionSystem) {
        super(scene, x, y, 'fish', 0);
        this.scene = scene;
        this.bounds = bounds; // {x, y, width, height} or Polygon
        this.pollutionSystem = pollutionSystem;

        this.health = 100;
        this.isDead = false;
        this.speed = 0.5;
        this.moveTarget = null;

        this.setOrigin(0.5, 0.5);
        this.scene.add.existing(this);

        // Native 16x16 size
        this.setScale(1.0);

        // Random initial target
        this.pickNewTarget();

        // Create Animations if not exist
        /*
        if (!this.scene.anims.exists('fish-swim')) {
            this.scene.anims.create({
                key: 'fish-swim',
                frames: this.scene.anims.generateFrameNumbers('fish', { start: 0, end: 2 }),
                frameRate: 8,
                repeat: -1
            });
        }
        this.play('fish-swim');
        */

        // Simple wiggle tween
        this.scene.tweens.add({
            targets: this,
            scaleX: 0.6, // Slight squish
            scaleY: 0.8,
            duration: 200,
            yoyo: true,
            repeat: -1
        });
    }

    update(time, delta) {
        if (this.isDead) return;

        // 1. Check Pollution
        const gridSystem = this.pollutionSystem.gridSystem;
        const gridX = Math.floor(this.x / gridSystem.gridSize);
        const gridY = Math.floor(this.y / gridSystem.gridSize);
        const cell = gridSystem.getCell(gridX, gridY);

        if (cell && cell.pollution > 0.1) {
            // Take damage based on pollution
            this.health -= cell.pollution * 0.1;

            // Visual feedback: Tint red/green/sickly
            const tint = Phaser.Display.Color.Interpolate.ColorWithColor(
                new Phaser.Display.Color(255, 255, 255),
                new Phaser.Display.Color(50, 200, 50),
                100,
                this.health
            );
            this.setTint(Phaser.Display.Color.GetColor(tint.r, tint.g, tint.b));

            // Slow down
            this.speed = Math.max(0.1, 0.5 * (this.health / 100));
        } else {
            // Recover slightly if clean water (optional) or just clear tint
            this.clearTint();
            this.speed = 0.5;
        }

        if (this.health <= 0) {
            this.die();
            return;
        }

        // 2. Movement
        if (this.moveTarget) {
            const distance = Phaser.Math.Distance.Between(this.x, this.y, this.moveTarget.x, this.moveTarget.y);
            if (distance < 2) {
                this.pickNewTarget();
            } else {
                const angle = Phaser.Math.Angle.Between(this.x, this.y, this.moveTarget.x, this.moveTarget.y);
                const velocity = this.scene.physics.velocityFromRotation(angle, this.speed * delta);

                this.x += velocity.x;
                this.y += velocity.y;

                // Rotation
                this.rotation = angle + Math.PI / 2; // Adjust based on sprite orientation
            }
        }
    }

    pickNewTarget() {
        // Pick a random point within bounds
        // Simple rectangle bounds for now
        const bx = Phaser.Math.Between(this.bounds.x, this.bounds.x + this.bounds.width);
        const by = Phaser.Math.Between(this.bounds.y, this.bounds.y + this.bounds.height);

        // Ensure it's water
        const gridSystem = this.pollutionSystem.gridSystem;
        const gx = Math.floor(bx / gridSystem.gridSize);
        const gy = Math.floor(by / gridSystem.gridSize);

        if (gridSystem.isWater(gx, gy)) {
            this.moveTarget = { x: bx, y: by };
        } else {
            // Retry
            this.moveTarget = { x: this.x, y: this.y };
        }
    }

    die() {
        this.isDead = true;
        this.setTint(0xaaaaaa);
        this.rotation = Math.PI;
        this.setDepth(10);
    }
}
