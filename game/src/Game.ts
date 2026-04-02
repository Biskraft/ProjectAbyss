// Pre-load PixiJS browser environment statically to avoid
// dynamic-import hang in Vite production builds
import 'pixi.js/browser';

import { Container, RenderTexture, Sprite, Ticker, WebGLRenderer } from 'pixi.js';
import { SceneManager } from '@core/SceneManager';
import { InputManager } from '@core/InputManager';
import { AssetLoader } from '@core/AssetLoader';
import { Camera } from '@core/Camera';

export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 360;
const FIXED_STEP = 1000 / 60; // 16.6667ms
const MAX_ACCUMULATED = FIXED_STEP * 5;
const MAX_RT_SIZE = 4096;

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
  stats = {
    enemiesKilled: 0,
    itemsCollected: 0,
    gatesBroken: 0,
    playTimeMs: 0,
    firstEchoStrike: false,
    firstItemWorldLanding: false,
    forgeReturnSequenceDone: false,
  };
  private accumulated = 0;
  private renderer!: WebGLRenderer;
  private worldRT!: RenderTexture;
  private worldSprite!: Sprite;

  async init(): Promise<void> {
    // Create WebGLRenderer directly (bypasses autoDetectRenderer's
    // dynamic import that hangs in Vite production builds)
    this.renderer = new WebGLRenderer();
    await this.renderer.init({
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
    ticker.start();

    this.app = {
      stage,
      canvas: this.renderer.canvas as HTMLCanvasElement,
      ticker,
    };

    const container = document.getElementById('game-container');
    if (!container) throw new Error('game-container not found');
    container.appendChild(this.app.canvas);

    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());

    // Game world container — rendered to RT, not added to stage
    this.gameContainer = new Container();

    // RenderTexture pipeline: world renders at 1x → RT → scaled sprite on stage
    this.worldRT = RenderTexture.create({
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      resolution: 1,
      antialias: false,
    });
    this.worldSprite = new Sprite(this.worldRT);
    this.worldSprite.texture.source.scaleMode = 'nearest';
    this.app.stage.addChild(this.worldSprite);

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
          this.stats.playTimeMs += FIXED_STEP;
          this.sceneManager.update(FIXED_STEP);
        }
        this.accumulated -= FIXED_STEP;
      }

      // Advance input state AFTER all fixed updates so isJustPressed
      // remains true for the entire frame's physics ticks
      this.input.update();

      const alpha = this.accumulated / FIXED_STEP;
      this.sceneManager.render(alpha);

      // Zoom via RenderTexture: render world at 1x → scale the result
      // Tiles always at integer positions → zero seams, smooth zoom
      const zoom = this.camera.zoom;
      const rtW = Math.min(Math.ceil(GAME_WIDTH / zoom), MAX_RT_SIZE);
      const rtH = Math.min(Math.ceil(GAME_HEIGHT / zoom), MAX_RT_SIZE);

      if (this.worldRT.width !== rtW || this.worldRT.height !== rtH) {
        this.worldRT.resize(rtW, rtH);
      }

      // Position gameContainer at 1x scale for RT rendering
      this.gameContainer.scale.set(1);
      this.gameContainer.x = Math.round(-this.camera.renderX + rtW / 2);
      this.gameContainer.y = Math.round(-this.camera.renderY + rtH / 2);

      // Render world to offscreen texture
      this.renderer.render({
        container: this.gameContainer,
        target: this.worldRT,
        clear: true,
      });

      // Display RT scaled to fit screen
      this.worldSprite.width = GAME_WIDTH;
      this.worldSprite.height = GAME_HEIGHT;

      // Final render: stage (which contains worldSprite) → screen
      this.renderer.render(stage);
    });
  }

  private handleResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const canvas = this.app.canvas;

    // Fill the entire window while maintaining aspect ratio
    const scale = Math.min(w / GAME_WIDTH, h / GAME_HEIGHT);
    canvas.style.width = `${Math.floor(GAME_WIDTH * scale)}px`;
    canvas.style.height = `${Math.floor(GAME_HEIGHT * scale)}px`;
    canvas.style.imageRendering = 'pixelated';
  }
}
