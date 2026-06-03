import type { Container } from 'pixi.js';
import { isOneWay, isSolid } from '@core/Physics';
import { getAreaPalette, getAreaPaletteAtlas } from '@data/areaPalettes';
import { WeatherSystem, type StratumProfileInput } from '@effects/WeatherSystem';
import { GAME_HEIGHT, GAME_WIDTH, type Game } from '../../Game';

interface ItemWorldWeatherRuntimeOptions {
  game: Game;
  tileSize: number;
  getWeatherLayer: () => Container;
  getThemeSlug: () => string;
  getFullGrid: () => number[][];
  getTemperament: () => string | null | undefined;
}

export class ItemWorldWeatherRuntime {
  private weather: WeatherSystem | null = null;

  constructor(private readonly options: ItemWorldWeatherRuntimeOptions) {}

  init(): void {
    this.destroy();

    const areaId = `iw_${this.options.getThemeSlug()}_bg`;
    const entry = getAreaPaletteAtlas().rowIndex.has(areaId) ? getAreaPalette(areaId) : null;
    if (!entry || entry.weather !== 'stratum') return;

    const params = entry.weatherParams;
    this.weather = new WeatherSystem({
      mode: 'stratum',
      stratumIntensity: params.density,
      stratumProfile: this.resolveProfile(entry.weatherProfile),
      coverageCheckTiles: 0,
      collision: {
        grid: this.options.getFullGrid(),
        tileSize: this.options.tileSize,
        isSolid: (tile) => isSolid(tile) || isOneWay(tile),
      },
    });
    this.options.getWeatherLayer().addChild(this.weather.container);
  }

  update(dt: number): void {
    if (!this.weather) return;
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

  destroy(): void {
    this.weather?.destroy();
    this.weather = null;
  }

  private resolveProfile(fallback: StratumProfileInput): StratumProfileInput {
    switch (this.options.getTemperament()) {
      case 'forge': return 'ash';
      case 'iron': return 'cyro';
      case 'rust': return 'rust';
      case 'spark': return 'spark';
      case 'shadow': return 'shadow';
      default: return fallback;
    }
  }
}
