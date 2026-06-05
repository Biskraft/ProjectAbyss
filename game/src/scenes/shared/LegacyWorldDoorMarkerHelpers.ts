import { Graphics } from 'pixi.js';

interface LegacyWorldDoorMarkerCell {
  exits: {
    left?: boolean;
    right?: boolean;
    up?: boolean;
    down?: boolean;
  };
}

export function createLegacyWorldDoorMarkers(
  cell: LegacyWorldDoorMarkerCell,
  {
    roomWidth,
    roomHeight,
    tileSize,
  }: {
    roomWidth: number;
    roomHeight: number;
    tileSize: number;
  },
): Graphics[] {
  const markers: Graphics[] = [];
  const floorY = (roomHeight - 3) * tileSize;
  const doorH = 4 * tileSize;
  const markerW = 4;

  if (cell.exits.left) {
    const marker = new Graphics();
    marker.rect(0, 0, markerW, doorH).fill({ color: 0x44ff44, alpha: 0.6 });
    marker.rect(-6, doorH / 2 - 3, 6, 6).fill({ color: 0x44ff44, alpha: 0.8 });
    marker.x = 0;
    marker.y = floorY - doorH;
    markers.push(marker);
  }

  if (cell.exits.right) {
    const marker = new Graphics();
    marker.rect(0, 0, markerW, doorH).fill({ color: 0x44ff44, alpha: 0.6 });
    marker.rect(markerW, doorH / 2 - 3, 6, 6).fill({ color: 0x44ff44, alpha: 0.8 });
    marker.x = (roomWidth - 1) * tileSize;
    marker.y = floorY - doorH;
    markers.push(marker);
  }

  if (cell.exits.down) {
    const cx = Math.floor(roomWidth / 2) * tileSize;
    const marker = new Graphics();
    marker.rect(0, 0, 3 * tileSize, markerW).fill({ color: 0x44ff44, alpha: 0.6 });
    marker.rect(tileSize, markerW, tileSize, 6).fill({ color: 0x44ff44, alpha: 0.8 });
    marker.x = cx - tileSize;
    marker.y = (roomHeight - 1) * tileSize - markerW;
    markers.push(marker);
  }

  if (cell.exits.up) {
    const cx = Math.floor(roomWidth / 2) * tileSize;
    const marker = new Graphics();
    marker.rect(0, 0, 3 * tileSize, markerW).fill({ color: 0x44ff44, alpha: 0.6 });
    marker.rect(tileSize, -6, tileSize, 6).fill({ color: 0x44ff44, alpha: 0.8 });
    marker.x = cx - tileSize;
    marker.y = 0;
    markers.push(marker);
  }

  return markers;
}
