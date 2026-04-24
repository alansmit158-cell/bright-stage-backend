/**
 * LED Calculation Service
 * Handles logic for physical dimensions, weight, power, and pixel mapping.
 */

const calculateLedConfig = (
    tileWidth,
    tileHeight,
    pixelPitch,
    weightPerTile,
    powerPerTile,
    faceA_Cols,
    faceA_Rows,
    faceB_Cols = 0,
    faceB_Rows = 0,
    configType = 'Flat',
    screenElements = []
) => {
    // 1. Resolution per Tile
    const pixelsPerTileW = Math.round(tileWidth / pixelPitch);
    const pixelsPerTileH = Math.round(tileHeight / pixelPitch);

    if (configType === 'Complex' && screenElements.length > 0) {
        let totalTiles = 0;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        const processedElements = screenElements.map(el => {
            const w_mm = el.cols * tileWidth;
            const h_mm = el.rows * tileHeight;
            const resW = el.cols * pixelsPerTileW;
            const resH = el.rows * pixelsPerTileH;

            totalTiles += (el.cols * el.rows);

            // X and Y are in pixels (based on cabinet size for alignment)
            // But we might receive them as physical mm. Let's assume mm for mapping.
            const curMaxX = el.x + w_mm;
            const curMaxY = el.y + h_mm;

            if (el.x < minX) minX = el.x;
            if (el.y < minY) minY = el.y;
            if (curMaxX > maxX) maxX = curMaxX;
            if (curMaxY > maxY) maxY = curMaxY;

            return {
                ...el,
                dimensions: { w: w_mm, h: h_mm },
                resolution: { w: resW, h: resH }
            };
        });

        // Bounding Box (Physical)
        const boundingWidth_mm = maxX - minX;
        const boundingHeight_mm = maxY - minY;

        // Global Resolution (Pixels)
        const totalW = Math.round(boundingWidth_mm / pixelPitch);
        const totalH = Math.round(boundingHeight_mm / pixelPitch);

        const totalWeight = totalTiles * weightPerTile;
        const totalPower = totalTiles * powerPerTile;

        return {
            configType: 'Complex',
            resolution: { totalW, totalH },
            dimensions: { totalWidth_mm: boundingWidth_mm, totalHeight_mm: boundingHeight_mm },
            hardware: {
                totalTiles,
                totalWeightKg: parseFloat(totalWeight.toFixed(2)),
                totalPowerW: totalPower,
                ampsAssuming240V: parseFloat((totalPower / 240).toFixed(1))
            },
            screenElements: processedElements,
            boundingBox: { minX, minY, maxX, maxY },
            specs: { pixelsPerTileW, pixelsPerTileH }
        };
    }

    // Standard Dual Face logic (Flat / L-Shape)
    const resA_W = faceA_Cols * pixelsPerTileW;
    const resA_H = faceA_Rows * pixelsPerTileH;
    const resB_W = faceB_Cols * pixelsPerTileW;
    const resB_H = faceB_Rows * pixelsPerTileH;

    const totalTiles = (faceA_Cols * faceA_Rows) + (faceB_Cols * faceB_Rows);
    const totalWeight = totalTiles * weightPerTile;
    const totalPower = totalTiles * powerPerTile;

    return {
        resolution: {
            totalW: resA_W + resB_W,
            totalH: Math.max(resA_H, resB_H),
            faceA: { w: resA_W, h: resA_H },
            faceB: { w: resB_W, h: resB_H }
        },
        dimensions: {
            faceA_mm: { w: faceA_Cols * tileWidth, h: faceA_Rows * tileHeight },
            faceB_mm: { w: faceB_Cols * tileWidth, h: faceB_Rows * tileHeight },
            totalWidth_mm: (faceA_Cols + faceB_Cols) * tileWidth
        },
        hardware: {
            totalTiles,
            totalWeightKg: parseFloat(totalWeight.toFixed(2)),
            totalPowerW: totalPower,
            ampsAssuming240V: parseFloat((totalPower / 240).toFixed(1))
        },
        specs: { pixelsPerTileW, pixelsPerTileH }
    };
};

module.exports = { calculateLedConfig };
