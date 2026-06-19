import { Container } from 'pixi.js';
import type { Game } from '../../Game';
import { TilemapRenderer, type TilemapTheme } from '@level/TilemapRenderer';
import { CollisionDebugOverlay } from '@level/CollisionDebugOverlay';
import { TileMutatorRenderer } from '@systems/TileMutatorRenderer';
import { FluidSystem } from '@effects/FluidSystem';
import { FluidSpawnerManager } from '@systems/FluidSpawner';
import { FluidCrestFoamManager } from '@effects/FluidCrestFoam';
import { UpdraftSystem } from '@systems/UpdraftSystem';
import { ParallaxBackground } from '@level/ParallaxBackground';
import {
  getAreaPalette,
  getAreaPaletteAtlas,
  getAreaPaletteRow,
} from '@data/areaPalettes';
import {
  TILE_SIZE as IW_TILE_SIZE,
  IW_ROOM_W_PX,
  IW_ROOM_H_PX,
} from './ItemWorldMapController';
import {
  createItemWorldPaletteFilters,
  type ItemWorldPaletteFilters,
} from './ItemWorldPaletteSetup';

export interface ItemWorldRenderLayerSetupResult extends ItemWorldPaletteFilters {
  tilemap: TilemapRenderer;
  parallaxBG: ParallaxBackground;
  buildingLayer: Container;
  residentsLayer: Container;
  entityLayer: Container;
  collisionDebug: CollisionDebugOverlay;
  tileMutatorRenderer: TileMutatorRenderer;
  fluidLayer: Container;
  fluidSystem: FluidSystem;
  fluidSpawners: FluidSpawnerManager;
  fluidCrestFoam: FluidCrestFoamManager;
  aboveFluidLayer: Container;
  weatherLayer: Container;
  updraftSystem: UpdraftSystem;
}

export function setupItemWorldRenderLayers(args: {
  game: Game;
  sceneContainer: Container;
  stratumTheme: TilemapTheme;
  themeSlug: string;
  visualSeedId: string;
  totalCols: number;
  totalRows: number;
  setFireLayer: (layer: Container) => void;
}): ItemWorldRenderLayerSetupResult {
  const tilemap = new TilemapRenderer(IW_TILE_SIZE);
  tilemap.setTheme(args.stratumTheme);
  args.sceneContainer.addChild(tilemap.container);

  const paletteFilters = createItemWorldPaletteFilters(args.themeSlug, args.visualSeedId);

  const parallaxBG = new ParallaxBackground();
  args.game.backgroundContainer.addChild(parallaxBG.container);
  const bgEntry = getAreaPalette(`iw_${args.themeSlug}_bg`);
  const atlas = getAreaPaletteAtlas();
  parallaxBG.setup(bgEntry, args.totalCols * IW_ROOM_W_PX, args.totalRows * IW_ROOM_H_PX, {
    texture: atlas.texture,
    rowCount: atlas.rowCount,
    row: getAreaPaletteRow(bgEntry.id),
  });

  args.sceneContainer.sortableChildren = true;

  const buildingLayer = new Container();
  buildingLayer.zIndex = -1;
  args.sceneContainer.addChild(buildingLayer);

  const residentsLayer = new Container();
  args.sceneContainer.addChild(residentsLayer);

  const entityLayer = new Container();
  args.sceneContainer.addChild(entityLayer);
  args.setFireLayer(entityLayer);

  const collisionDebug = new CollisionDebugOverlay(args.game.uiScale);
  args.sceneContainer.addChild(collisionDebug.container);
  args.game.app.stage.addChild(collisionDebug.hud);

  const tileMutatorRenderer = new TileMutatorRenderer(entityLayer);

  const fluidLayer = new Container();
  args.sceneContainer.addChild(fluidLayer);
  const fluidSystem = new FluidSystem(fluidLayer);
  const debugEnabled = new URLSearchParams(window.location.search).has('debug');
  const fluidSpawners = new FluidSpawnerManager(fluidLayer, debugEnabled ? entityLayer : null);
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const fluidCrestFoam = new FluidCrestFoamManager(fluidLayer, reduceMotion);

  const aboveFluidLayer = new Container();
  args.sceneContainer.addChild(aboveFluidLayer);
  tileMutatorRenderer.setAboveFluidLayer(aboveFluidLayer);

  const weatherLayer = new Container();
  args.sceneContainer.addChild(weatherLayer);

  const updraftSystem = new UpdraftSystem(entityLayer);

  return {
    ...paletteFilters,
    tilemap,
    parallaxBG,
    buildingLayer,
    residentsLayer,
    entityLayer,
    collisionDebug,
    tileMutatorRenderer,
    fluidLayer,
    fluidSystem,
    fluidSpawners,
    fluidCrestFoam,
    aboveFluidLayer,
    weatherLayer,
    updraftSystem,
  };
}
