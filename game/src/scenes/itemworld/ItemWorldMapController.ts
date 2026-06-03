// Shared constants for Item World room geometry.
export const TILE_SIZE = 16;
export const IW_GRID_W = 4;
export const IW_GRID_H = 4;
export const IW_ROOM_W_TILES = 48;
export const IW_ROOM_H_TILES = 32;
export const IW_ROOM_W_PX = IW_ROOM_W_TILES * TILE_SIZE;
export const IW_ROOM_H_PX = IW_ROOM_H_TILES * TILE_SIZE;
export const IW_FULL_W_TILES = IW_GRID_W * IW_ROOM_W_TILES;
export const IW_FULL_H_TILES = IW_GRID_H * IW_ROOM_H_TILES;

// Door geometry constants. These must match LDtk corridor template paint.
export const IW_DOOR_DEPTH = 4;
export const IW_DOOR_V_WIDTH = 6;
export const IW_DOOR_FLOOR_ROW = 18;

// Outer boundary wall thickness around the unified grid. This controls the
// world frame, not door geometry.
export const IW_BOUNDARY_THICKNESS = 3;
