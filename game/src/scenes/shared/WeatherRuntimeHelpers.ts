import type { WeatherSystem } from '@effects/WeatherSystem';
import { isOneWay, isSolid } from '@core/Physics';
import { GAME_HEIGHT, GAME_WIDTH, type Game } from '../../Game';
import type { Container } from 'pixi.js';

export function isWeatherCollisionSolid(tile: number): boolean {
  return isSolid(tile) || isOneWay(tile);
}

export function updateWeatherForCamera(weather: WeatherSystem, game: Game, dt: number): void {
  const cam = game.camera;
  const width = GAME_WIDTH / cam.zoom;
  const height = GAME_HEIGHT / cam.zoom;
  weather.update(dt, {
    x: cam.renderX - width / 2,
    y: cam.renderY - height / 2,
    width,
    height,
  });
}

export function attachWeatherToLayer(weather: WeatherSystem, layer: Container): void {
  layer.addChild(weather.container);
}

export function destroyWeather(weather: WeatherSystem | null): null {
  weather?.destroy();
  return null;
}
