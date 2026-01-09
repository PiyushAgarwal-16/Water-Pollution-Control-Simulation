export default class GridSystem {
    constructor(scene, textureKey, gridSize = 8) {
        this.scene = scene;
        this.gridSize = gridSize;
        this.width = 0;
        this.height = 0;
        this.grid = []; // 2D array: null (land) or { x, y, pollution, flowX, flowY } (water)

        this.initGrid(textureKey);
    }

    initGrid(textureKey) {
        const texture = this.scene.textures.get(textureKey);
        const image = texture.getSourceImage();

        // Create a temporary canvas to read pixel data
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imgData.data;

        this.width = Math.ceil(canvas.width / this.gridSize);
        this.height = Math.ceil(canvas.height / this.gridSize);

        // Identify water vs land
        // We'll sample the center pixel of each grid cell
        for (let y = 0; y < this.height; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.width; x++) {
                const px = x * this.gridSize + Math.floor(this.gridSize / 2);
                const py = y * this.gridSize + Math.floor(this.gridSize / 2);

                const index = (py * canvas.width + px) * 4;
                const r = pixels[index];
                const g = pixels[index + 1];
                const b = pixels[index + 2];

                // Simple water detection: Blue is dominant
                // Adjust these thresholds based on the actual art
                const isWater = b > r && b > g && b > 100;

                if (isWater) {
                    this.grid[y][x] = {
                        x: x,
                        y: y,
                        pollution: 0,
                        longTermPollution: 0,
                        worldX: x * this.gridSize,
                        worldY: y * this.gridSize
                    };
                } else {
                    this.grid[y][x] = null; // Land
                }
            }
        }

        console.log(`Grid system initialized. Size: ${this.width}x${this.height}`);
    }

    isWater(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
        return this.grid[y][x] !== null;
    }

    getCell(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
        return this.grid[y][x];
    }
}
