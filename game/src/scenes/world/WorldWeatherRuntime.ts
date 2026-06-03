import { Debug } from '@core/Debug';
import { isOneWay, isSolid } from '@core/Physics';
import { WeatherSystem, type WeatherDynamicCollider, type WeatherMode } from '@effects/WeatherSystem';
import type { LdtkLevel } from '@level/LdtkLoader';
import type { Container } from 'pixi.js';
import { GAME_HEIGHT, GAME_WIDTH, type Game } from '../../Game';

interface WorldWeatherRuntimeOptions {
  game: Game;
  tileSize: number;
  debug: boolean;
  getWeatherLayer: () => Container;
  getCollisionGrid: () => number[][];
  getDynamicColliders: () => WeatherDynamicCollider[];
  isIgnoredCell: (col: number, row: number) => boolean;
}

export class WorldWeatherRuntime {
  private weather: WeatherSystem | null = null;

  constructor(private readonly options: WorldWeatherRuntimeOptions) {}

  configureForLevel(level: LdtkLevel): void {
    this.destroy();

    const weatherEnts = level.entities.filter(e => e.type === 'Weather');
    const ent = weatherEnts[0];
    if (!ent) return;

    const fields = ent.fields ?? {};
    const mode = this.readMode(fields['WeatherType']);
    const density = this.readNumber(fields, 'Density', 0.5, 0, 1);
    const wind = this.readNumber(fields, 'Wind', mode === 'rain' ? -0.18 : 0, -1, 1);
    const streakLength = this.readNumber(fields, 'StreakLength', 6, 1, 64);
    const streakWidth = this.readNumber(fields, 'StreakWidth', 0.8, 0.25, 8);

    this.weather = new WeatherSystem({
      mode,
      intensity: density,
      wind,
      streakLength,
      streakWidth,
      coverageCheckTiles: 3,
      collision: {
        grid: this.options.getCollisionGrid(),
        tileSize: this.options.tileSize,
        isSolid: (tile) => isSolid(tile) || isOneWay(tile),
        ignoreCell: (col, row) => this.options.isIgnoredCell(col, row),
      },
    });
    this.options.getWeatherLayer().addChild(this.weather.container);

    if (weatherEnts.length > 1) {
      console.warn(`[Weather] level="${level.identifier}" has ${weatherEnts.length} Weather entities; using the first one.`);
    }
    if (this.options.debug) {
      Debug.log(`[Weather] level="${level.identifier}" mode=${mode} density=${density} wind=${wind} streak=${streakLength}/${streakWidth}`);
    }
  }

  update(dt: number): void {
    if (!this.weather) return;

    this.weather.setDynamicColliders(this.options.getDynamicColliders());
    const cam = this.options.game.camera;
    const width = GAME_WIDTH / cam.zoom;
    const height = GAME_HEIGHT / cam.zoom;
    this.weather.update(dt, {
      x: cam.renderX - width / 2,
      y: cam.renderY - height / 2,
      width,
      height,
    });
  }

  clearDynamicColliders(): void {
    this.weather?.clearDynamicColliders();
  }

  destroy(): void {
    this.weather?.destroy();
    this.weather = null;
  }

  private readMode(value: unknown): WeatherMode {
    return typeof value === 'string' && value.toLowerCase() === 'snow' ? 'snow' : 'rain';
  }

  private readNumber(
    fields: Record<string, unknown>,
    key: string,
    fallback: number,
    min: number,
    max: number,
  ): number {
    const raw = fields[key];
    const parsed = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : fallback;
    const value = Number.isFinite(parsed) ? parsed : fallback;
    return Math.max(min, Math.min(max, value));
  }
}
