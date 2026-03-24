// Pre-load PixiJS browser environment statically to avoid
// dynamic-import hang in Vite production builds
import 'pixi.js/browser';

import { Container, Ticker, WebGLRenderer } from 'pixi.js';
import { SceneManager } from '@core/SceneManager';
import { InputManager } from '@core/InputManager';
import { AssetLoader } from '@core/AssetLoader';
import { Camera } from '@core/Camera';

export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;
const FIXED_STEP = 1000 / 60; // 16.6667ms
const MAX_ACCUMULATED = FIXED_STEP * 5;

export class Game {
  app!: {
    stage: Container;
    canvas: HTMLCanvasElement;
    ticker: Ticker;
  };
  sceneManager!: SceneManager;
  input!: InputManager;
  assetLoader!: AssetLoader;
  camera!: Camera;
  gameContainer!: Container;

  hitstopFrames = 0;
  private accumulated = 0;

  async init(): Promise<void> {
    // Create WebGLRenderer directly (bypasses autoDetectRenderer's
    // dynamic import that hangs in Vite production builds)
    const renderer = new WebGLRenderer();
    await renderer.init({
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      backgroundColor: 0x1a1a2e,
      resolution: 1,
      autoDensity: false,
      antialias: false,
      manageImports: false,
    });

    const stage = new Container();
    const ticker = new Ticker();
    ticker.add(() => renderer.render(stage));
    ticker.start();

    this.app = {
      stage,
      canvas: renderer.canvas as HTMLCanvasElement,
      ticker,
    };

    const container = document.getElementById('game-container');
    if (!container) throw new Error('game-container not found');
    container.appendChild(this.app.canvas);

    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());

    this.gameContainer = new Container();
    this.app.stage.addChild(this.gameContainer);

    this.input = new InputManager();
    this.assetLoader = new AssetLoader();
    this.camera = new Camera(GAME_WIDTH, GAME_HEIGHT);
    this.sceneManager = new SceneManager(this);

    this.app.ticker.add((ticker) => {
      this.accumulated += ticker.deltaMS;
      if (this.accumulated > MAX_ACCUMULATED) {
        this.accumulated = MAX_ACCUMULATED;
      }

      while (this.accumulated >= FIXED_STEP) {
        if (this.hitstopFrames > 0) {
          this.hitstopFrames--;
        } else {
          this.sceneManager.update(FIXED_STEP);
        }
        this.accumulated -= FIXED_STEP;
      }

      // Advance input state AFTER all fixed updates so isJustPressed
      // remains true for the entire frame's physics ticks
      this.input.update();

      const alpha = this.accumulated / FIXED_STEP;
      this.sceneManager.render(alpha);

      this.gameContainer.x = -this.camera.renderX + GAME_WIDTH / 2;
      this.gameContainer.y = -this.camera.renderY + GAME_HEIGHT / 2;
    });
  }

  private handleResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const canvas = this.app.canvas;

    // On touch devices, fill the screen (fractional scale allowed)
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isMobile) {
      const scale = Math.min(w / GAME_WIDTH, h / GAME_HEIGHT);
      canvas.style.width = `${Math.floor(GAME_WIDTH * scale)}px`;
      canvas.style.height = `${Math.floor(GAME_HEIGHT * scale)}px`;
    } else {
      const scale = Math.max(1, Math.floor(Math.min(w / GAME_WIDTH, h / GAME_HEIGHT)));
      canvas.style.width = `${GAME_WIDTH * scale}px`;
      canvas.style.height = `${GAME_HEIGHT * scale}px`;
    }
  }
}
