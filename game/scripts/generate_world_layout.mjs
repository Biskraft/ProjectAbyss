/**
 * Generate a full 7-Tier world layout LDtk file for scale reference.
 * Based on Hollow Knight room counts (~160 rooms across 7 tiers).
 *
 * Grid: 384px cells, default room: 768×384 (2×1 grid cells)
 *
 * Usage: node game/scripts/generate_world_layout.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { randomUUID } from 'crypto';

const GRID = 384;          // GridVania cell size
const TILE = 16;           // tile grid size
const BASE_W = 768;        // default room width (2 cells)
const BASE_H = 384;        // default room height (1 cell)

// Tier colors for visual identification in LDtk editor
const TIER_COLORS = {
  'T1': '#88FF88',  // Canopy — green (garden)
  'T2': '#FFDD44',  // Concordia — gold (hub)
  'T3': '#AA77CC',  // Necropolis — purple (death)
  'T4': '#4488CC',  // Veinway — blue (water)
  'T5': '#CC8844',  // Memoria Arcana — amber (ruins)
  'T6': '#88CCFF',  // Cryo-Archive — ice blue
  'T7': '#FF4444',  // Abyss Sphere — red (final)
  'BH': '#FF8800',  // Bulkhead — orange
};

/**
 * Room layout definition.
 * Each room: [relativeGridX, relativeGridY, widthInCells, heightInCells, suffix?]
 * All positions relative to tier's anchor point.
 */
function defineTierLayouts() {
  const tiers = [];

  // ─── Tier 1: Canopy (천공의 정원) ─── 15 rooms, y_anchor = -20
  // Late-game area above hub. Reverse gravity. Scattered, vertical.
  tiers.push({
    name: 'T1_Canopy', tier: 'T1', anchorY: -22,
    rooms: [
      // Central column
      [0, 0, 2, 1],  [0, 1, 2, 1],  [0, 2, 2, 2],  // vertical shaft down
      // Left branch
      [-2, 0, 2, 1], [-4, 0, 2, 1], [-4, 1, 2, 1],
      // Right branch
      [2, 0, 2, 1],  [4, 0, 3, 1],  [4, 1, 2, 1],
      // Upper platforms
      [-2, -1, 2, 1], [0, -1, 2, 1], [2, -1, 2, 1],
      // Secret areas
      [-4, -1, 2, 1], [7, 0, 2, 1], [7, 1, 2, 1],
    ]
  });

  // ─── Tier 2: Concordia (중앙 성채 / Hub) ─── 25 rooms, y_anchor = 0
  // Starting area. Wide horizontal spread with vertical connectors.
  tiers.push({
    name: 'T2_Concordia', tier: 'T2', anchorY: 0,
    rooms: [
      // Main hub corridor (wide)
      [-3, 0, 3, 1], [0, 0, 3, 1], [3, 0, 3, 1],
      // Upper level
      [-2, -1, 2, 1], [0, -1, 2, 1], [2, -1, 2, 1], [4, -1, 2, 1],
      // Lower level
      [-2, 1, 2, 1], [0, 1, 2, 1], [2, 1, 2, 1], [4, 1, 2, 1],
      // Left wing
      [-5, 0, 2, 1], [-7, 0, 2, 1], [-7, 1, 2, 1], [-5, 1, 2, 1],
      // Right wing
      [6, 0, 2, 1], [8, 0, 2, 1], [8, 1, 2, 1],
      // Vertical connectors
      [-3, -2, 2, 1], [0, -2, 2, 1], // up to Canopy
      [-1, 2, 2, 1], [1, 2, 2, 1],   // down to Necropolis
      // NPC areas
      [-5, -1, 2, 1], [6, -1, 2, 1], [6, 1, 2, 1],
    ]
  });

  // ─── Bulkhead 1 ─── 2 rooms
  tiers.push({
    name: 'BH1', tier: 'BH', anchorY: 4,
    rooms: [
      [0, 0, 2, 1], [0, 1, 2, 2], // bulkhead gate + shaft
    ]
  });

  // ─── Tier 3: Necropolis (묘지/카타콤) ─── 28 rooms, y_anchor = 7
  // First real tier. Double jump unlock. Dense catacombs.
  tiers.push({
    name: 'T3_Necropolis', tier: 'T3', anchorY: 7,
    rooms: [
      // Entry from bulkhead
      [0, 0, 2, 2],
      // Main corridor east
      [2, 0, 2, 1], [4, 0, 2, 1], [6, 0, 2, 1], [8, 0, 2, 1],
      // Main corridor west
      [-2, 0, 2, 1], [-4, 0, 2, 1], [-6, 0, 2, 1], [-8, 0, 2, 1],
      // Lower catacombs east
      [2, 1, 2, 1], [4, 1, 3, 1], [7, 1, 2, 1], [4, 2, 2, 1],
      // Lower catacombs west
      [-2, 1, 2, 1], [-4, 1, 2, 1], [-6, 1, 2, 1], [-6, 2, 2, 1],
      // Deep section
      [0, 2, 2, 1], [2, 2, 2, 1], [-2, 2, 2, 1],
      // Boss area
      [-4, 2, 2, 2],
      // Upper tombs
      [2, -1, 2, 1], [4, -1, 2, 1], [-2, -1, 2, 1], [-4, -1, 2, 1],
      // Secret passages
      [9, 1, 2, 1], [-8, 1, 2, 1],
      // Double Jump relic room
      [6, 2, 2, 1],
    ]
  });

  // ─── Bulkhead 2 ─── 2 rooms
  tiers.push({
    name: 'BH2', tier: 'BH', anchorY: 14,
    rooms: [
      [0, 0, 2, 1], [0, 1, 2, 2],
    ]
  });

  // ─── Tier 4: Veinway (지하 수로) ─── 25 rooms, y_anchor = 17
  // Water passages. Wall climb unlock. Horizontal with vertical drops.
  tiers.push({
    name: 'T4_Veinway', tier: 'T4', anchorY: 17,
    rooms: [
      // Entry
      [0, 0, 2, 2],
      // East waterway
      [2, 0, 2, 1], [4, 0, 2, 1], [6, 0, 2, 1], [8, 0, 2, 1],
      // West waterway
      [-2, 0, 2, 1], [-4, 0, 2, 1], [-6, 0, 2, 1], [-6, 1, 2, 1],
      // Central depths
      [0, 2, 2, 1], [0, 3, 2, 1],
      // Flooded chambers east
      [4, 1, 2, 1], [4, 2, 2, 2], [6, 1, 2, 1],
      // Flooded chambers west
      [-4, 1, 2, 1], [-4, 2, 2, 1], [-8, 0, 2, 1],
      // Vertical shafts (waterfalls)
      [2, 1, 2, 2], [-2, 1, 2, 2],
      // Wall climb relic room
      [-8, 1, 2, 1],
      // Boss area
      [8, 1, 3, 2],
      // Secret
      [10, 0, 2, 1], [-10, 0, 2, 1],
    ]
  });

  // ─── Bulkhead 3 ─── 2 rooms
  tiers.push({
    name: 'BH3', tier: 'BH', anchorY: 25,
    rooms: [
      [0, 0, 2, 1], [0, 1, 2, 2],
    ]
  });

  // ─── Tier 5: Memoria Arcana (연구소 폐허) ─── 22 rooms, y_anchor = 28
  // Research ruins. Mist form unlock. Maze-like.
  tiers.push({
    name: 'T5_MemoriaArcana', tier: 'T5', anchorY: 28,
    rooms: [
      // Entry
      [0, 0, 2, 1],
      // East wing (labs)
      [2, 0, 2, 1], [4, 0, 2, 1], [6, 0, 2, 1],
      [2, 1, 2, 1], [4, 1, 2, 1], [6, 1, 2, 2],
      // West wing (archives)
      [-2, 0, 2, 1], [-4, 0, 2, 1], [-6, 0, 2, 1],
      [-2, 1, 2, 1], [-4, 1, 2, 1], [-6, 1, 2, 1],
      // Deep section
      [0, 1, 2, 1], [0, 2, 2, 1], [2, 2, 2, 1],
      // Mist form relic
      [4, 2, 2, 1],
      // Boss area
      [-4, 2, 2, 2],
      // Secret
      [8, 0, 2, 1], [-8, 0, 2, 1], [-8, 1, 2, 1],
    ]
  });

  // ─── Bulkhead 4 ─── 2 rooms
  tiers.push({
    name: 'BH4', tier: 'BH', anchorY: 35,
    rooms: [
      [0, 0, 2, 1], [0, 1, 2, 2],
    ]
  });

  // ─── Tier 6: Cryo-Archive (빙결 보존소) ─── 18 rooms, y_anchor = 38
  // Frozen depths. Water breathing unlock. Compact but tall.
  tiers.push({
    name: 'T6_CryoArchive', tier: 'T6', anchorY: 38,
    rooms: [
      // Entry
      [0, 0, 2, 2],
      // East frozen halls
      [2, 0, 2, 1], [4, 0, 2, 1], [4, 1, 2, 1], [2, 1, 2, 1],
      // West frozen halls
      [-2, 0, 2, 1], [-4, 0, 2, 1], [-4, 1, 2, 1], [-2, 1, 2, 1],
      // Deep freeze
      [0, 2, 2, 1], [-2, 2, 2, 1], [2, 2, 2, 1],
      // Water breathing relic
      [-4, 2, 2, 1],
      // Boss area
      [4, 2, 2, 2],
      // Vertical ice shafts
      [6, 0, 2, 2], [-6, 0, 2, 2],
      // Secret
      [6, 2, 2, 1],
    ]
  });

  // ─── Bulkhead 5 (Grand Bulkhead) ─── 3 rooms
  tiers.push({
    name: 'BH5_Grand', tier: 'BH', anchorY: 44,
    rooms: [
      [0, 0, 2, 1], [0, 1, 2, 2], [0, 3, 2, 1], // longer bulkhead
    ]
  });

  // ─── Tier 7: Abyss Sphere (심연의 구) ─── 10 rooms, y_anchor = 48
  // Final area. Compact, intense. No new ability.
  tiers.push({
    name: 'T7_AbyssSphere', tier: 'T7', anchorY: 48,
    rooms: [
      // Entry
      [0, 0, 2, 2],
      // Approach
      [-2, 0, 2, 1], [2, 0, 2, 1],
      [-2, 1, 2, 1], [2, 1, 2, 1],
      // Inner sphere
      [0, 2, 3, 1], [-2, 2, 2, 1], [3, 2, 2, 1],
      // Final boss chamber
      [0, 3, 3, 2],
      // The Abyss (post-boss)
      [0, 5, 2, 1],
    ]
  });

  return tiers;
}

function generateLdtk() {
  // Read original file for defs
  const originalPath = 'game/public/assets/World_ProjectAbyss_Layout.ldtk';
  const original = JSON.parse(readFileSync(originalPath, 'utf-8'));

  const tiers = defineTierLayouts();

  // Count total rooms
  let totalRooms = 0;
  for (const t of tiers) totalRooms += t.rooms.length;
  console.log(`Total rooms: ${totalRooms}`);

  // Generate levels
  const levels = [];
  let uid = 500; // start above existing UIDs

  for (const tier of tiers) {
    const color = TIER_COLORS[tier.tier];
    for (let i = 0; i < tier.rooms.length; i++) {
      const [gx, gy, wCells, hCells] = tier.rooms[i];
      const worldX = gx * GRID;
      const worldY = (tier.anchorY + gy) * GRID;
      const pxWid = wCells * GRID;
      const pxHei = hCells * GRID;
      const cWid = pxWid / TILE;
      const cHei = pxHei / TILE;

      const levelIid = randomUUID();
      const identifier = `${tier.name}_${String(i).padStart(2, '0')}`;

      levels.push({
        identifier,
        iid: levelIid,
        uid: uid++,
        worldX,
        worldY,
        worldDepth: 0,
        pxWid,
        pxHei,
        __bgColor: '#171717',
        bgColor: color,
        useAutoIdentifier: false,
        bgRelPath: null,
        bgPos: null,
        bgPivotX: 0.5,
        bgPivotY: 0.5,
        __smartColor: color,
        __bgPos: null,
        externalRelPath: null,
        fieldInstances: [{
          __identifier: 'roomType',
          __type: 'LocalEnum.RoomType',
          __value: null,
          __tile: null,
          defUid: 99,
          realEditorValues: []
        }],
        layerInstances: [
          {
            __identifier: 'Entities',
            __type: 'Entities',
            __cWid: cWid,
            __cHei: cHei,
            __gridSize: TILE,
            __opacity: 1,
            __pxTotalOffsetX: 0,
            __pxTotalOffsetY: 0,
            __tilesetDefUid: null,
            __tilesetRelPath: null,
            iid: randomUUID(),
            levelId: uid - 1,
            layerDefUid: 77,
            pxOffsetX: 0,
            pxOffsetY: 0,
            visible: true,
            optionalRules: [],
            intGridCsv: [],
            autoLayerTiles: [],
            seed: Math.floor(Math.random() * 9999999),
            overrideTilesetUid: null,
            gridTiles: [],
            entityInstances: []
          },
          {
            __identifier: 'Wall_shadows',
            __type: 'AutoLayer',
            __cWid: cWid,
            __cHei: cHei,
            __gridSize: TILE,
            __opacity: 0.53,
            __pxTotalOffsetX: 0,
            __pxTotalOffsetY: 0,
            __tilesetDefUid: 6,
            __tilesetRelPath: 'atlas/SunnyLand_by_Ansimuz-extended.png',
            iid: randomUUID(),
            levelId: uid - 1,
            layerDefUid: 24,
            pxOffsetX: 0,
            pxOffsetY: 0,
            visible: true,
            optionalRules: [],
            intGridCsv: [],
            autoLayerTiles: [],
            seed: Math.floor(Math.random() * 9999999),
            overrideTilesetUid: null,
            gridTiles: [],
            entityInstances: []
          },
          {
            __identifier: 'Collisions',
            __type: 'IntGrid',
            __cWid: cWid,
            __cHei: cHei,
            __gridSize: TILE,
            __opacity: 1,
            __pxTotalOffsetX: 0,
            __pxTotalOffsetY: 0,
            __tilesetDefUid: 6,
            __tilesetRelPath: 'atlas/SunnyLand_by_Ansimuz-extended.png',
            iid: randomUUID(),
            levelId: uid - 1,
            layerDefUid: 1,
            pxOffsetX: 0,
            pxOffsetY: 0,
            visible: true,
            optionalRules: [],
            intGridCsv: new Array(cWid * cHei).fill(0),
            autoLayerTiles: [],
            seed: Math.floor(Math.random() * 9999999),
            overrideTilesetUid: null,
            gridTiles: [],
            entityInstances: []
          }
        ],
        __neighbours: []
      });
    }
  }

  // Validate no overlaps
  const occupied = new Map(); // "gx,gy" -> identifier
  let hasOverlap = false;
  for (const level of levels) {
    const gx0 = level.worldX / GRID;
    const gy0 = level.worldY / GRID;
    const gw = level.pxWid / GRID;
    const gh = level.pxHei / GRID;
    for (let dx = 0; dx < gw; dx++) {
      for (let dy = 0; dy < gh; dy++) {
        const key = `${gx0 + dx},${gy0 + dy}`;
        if (occupied.has(key)) {
          console.error(`OVERLAP: ${level.identifier} and ${occupied.get(key)} at grid (${gx0 + dx}, ${gy0 + dy})`);
          hasOverlap = true;
        } else {
          occupied.set(key, level.identifier);
        }
      }
    }
  }
  if (hasOverlap) {
    console.error('\nFix overlaps before using this file!');
  }

  // Build new LDtk file using original defs
  const newLdtk = {
    __header__: original.__header__,
    iid: randomUUID(),
    jsonVersion: original.jsonVersion,
    appBuildId: original.appBuildId,
    nextUid: uid + 1,
    identifierStyle: original.identifierStyle,
    toc: [],
    worldLayout: 'GridVania',
    worldGridWidth: GRID,
    worldGridHeight: GRID,
    defaultLevelWidth: BASE_W,
    defaultLevelHeight: BASE_H,
    defaultPivotX: 0,
    defaultPivotY: 0,
    defaultGridSize: TILE,
    defaultEntityWidth: 16,
    defaultEntityHeight: 16,
    bgColor: '#0A0A1A',
    defaultLevelBgColor: '#171717',
    minifyJson: false,
    externalLevels: false,
    exportTiled: false,
    simplifiedExport: false,
    imageExportMode: 'None',
    exportLevelBg: true,
    pngFilePattern: null,
    backupOnSave: false,
    backupLimit: 0,
    backupRelPath: null,
    levelNamePattern: '%world_Level_%idx',
    tutorialDesc: null,
    customCommands: [],
    flags: ['ExportOldTableOfContentData', 'UseMultilinesType'],
    defs: original.defs,
    levels,
    worlds: []
  };

  const outputPath = 'game/public/assets/World_Scale_Reference.ldtk';
  writeFileSync(outputPath, JSON.stringify(newLdtk, null, '\t'), 'utf-8');

  // Print summary
  console.log('\n=== World Scale Reference Generated ===\n');
  console.log(`Output: ${outputPath}`);
  console.log(`Total rooms: ${totalRooms}\n`);

  for (const tier of tiers) {
    console.log(`  ${tier.name}: ${tier.rooms.length} rooms (y=${tier.anchorY})`);
  }

  // Calculate world bounds
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const level of levels) {
    minX = Math.min(minX, level.worldX);
    maxX = Math.max(maxX, level.worldX + level.pxWid);
    minY = Math.min(minY, level.worldY);
    maxY = Math.max(maxY, level.worldY + level.pxHei);
  }

  const worldW = maxX - minX;
  const worldH = maxY - minY;
  console.log(`\n  World bounds: ${worldW}×${worldH} px`);
  console.log(`  = ${worldW / GRID}×${worldH / GRID} grid cells`);
  console.log(`  = ${(worldW / BASE_W).toFixed(1)}×${(worldH / BASE_H).toFixed(1)} standard rooms`);
  console.log(`\n  Hollow Knight reference: ~72,000×33,000 px (~200 rooms)`);
  console.log(`  ECHORIS: ${worldW}×${worldH} px (${totalRooms} rooms)`);
}

generateLdtk();
