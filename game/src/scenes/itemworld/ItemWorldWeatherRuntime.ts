import type { Container } from 'pixi.js';
import { getAreaPalette, getAreaPaletteAtlas } from '@data/areaPalettes';
import { WeatherSystem, type StratumProfileInput } from '@effects/WeatherSystem';
import {
  attachWeatherToLayer,
  destroyWeather,
  isWeatherCollisionSolid,
  updateWeatherForCamera,
} from '@scenes/shared/WeatherRuntimeHelpers';
import type { Game } from '../../Game';

interface ItemWorldWeatherRuntimeOptions {
  game: Game;
  tileSize: number;
  getWeatherLayer: () => Container;
  getThemeSlug: () => string;
  getCollisionGrid: () => number[][];
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
        grid: this.options.getCollisionGrid(),
        tileSize: this.options.tileSize,
        isSolid: isWeatherCollisionSolid,
      },
    });
    attachWeatherToLayer(this.weather, this.options.getWeatherLayer());
  }

  update(dt: number): void {
    if (!this.weather) return;
    updateWeatherForCamera(this.weather, this.options.game, dt);
  }

  destroy(): void {
    this.weather = destroyWeather(this.weather);
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
