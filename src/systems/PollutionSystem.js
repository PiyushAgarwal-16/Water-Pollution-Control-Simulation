export default class PollutionSystem {
    constructor(gridSystem) {
        this.gridSystem = gridSystem;
        this.decayRate = 0.005; // Natural cleanup over time (optional)
        this.flowRate = 0.4;    // How fast it moves downhill/downstream
        this.diffusionRate = 0.1; // How fast it spreads to calm water
    }

    update() {
        // We need a buffer to store next frame's values to avoid order-dependency bias
        // For performance in JS, we might modify in place with some care or use a dirty flag
        // But for correct fluid sim, double buffering is better. 
        // Let's use a simplified approach: calculate changes, then apply.

        const height = this.gridSystem.height;
        const width = this.gridSystem.width;
        const grid = this.gridSystem.grid;

        // A simple way to simulate flow without vector fields:
        // Pollution wants to move to neighbors with LOWER pollution (diffusion)
        // AND neighbors that are "downstream" (if we had height/flow data).
        // For now, we'll assume general diffusion + a slight bias if we can determine flow.
        // If no flow map, we just do diffusion.

        // Let's iterate and spread high concentrations
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const cell = grid[y][x];
                if (!cell || cell.pollution <= 0.01) continue;

                // Spread to neighbors
                const neighbors = [
                    { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
                    { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
                ];

                let totalSpread = 0;

                for (const n of neighbors) {
                    const nx = x + n.dx;
                    const ny = y + n.dy;
                    const neighbor = this.gridSystem.getCell(nx, ny);

                    if (neighbor && neighbor.pollution < cell.pollution) {
                        // Diffusion: Move from high to low
                        const transfer = (cell.pollution - neighbor.pollution) * this.diffusionRate;
                        neighbor.pollution += transfer;
                        totalSpread += transfer;
                    }
                }

                cell.pollution -= totalSpread;
                // Cap at 0
                if (cell.pollution < 0) cell.pollution = 0;
            }
        }
    }

    addPollution(gridX, gridY, amount) {
        const cell = this.gridSystem.getCell(gridX, gridY);
        if (cell) {
            cell.pollution += amount;
            if (cell.pollution > 1) cell.pollution = 1; // Cap at 100%
        }
    }
}
