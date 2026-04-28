// Pre-load PixiJS browser environment statically to avoid
// dynamic-import hang in Vite production builds
import 'pixi.js/browser';

import { Container, RenderTexture, Sprite, Ticker, WebGLRenderer } from 'pixi.js';
import { SceneManager } from '@core/SceneManager';
import { InputManager, GameAction } from '@core/InputManager';
import { AssetLoader } from '@core/AssetLoader';
import { Camera } from '@core/Camera';
import { Debug } from '@core/Debug';

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
  backgroundContainer!: Container;

  /**
   * UI layer rendered at native resolution (Celeste-style dual-res).
   * HUD with high-res fonts goes here.
   */
  uiContainer!: Container;

  /**
   * Legacy UI layer for 640x360-coordinate overlays (inventory, worldMap, etc.).
   * Auto-scaled by uiScale so they fill the native-res canvas.
   */
  legacyUIContainer!: Container;

  /** Integer pixel scale (1x=640, 2x=1280, 3x=1920). */
  uiScale = 1;

  hitstopFrames = 0;
  stats = {
    enemiesKilled: 0,
    itemsCollected: 0,
    gatesBroken: 0,
    playTimeMs: 0,
  };
  private accumulated = 0;
  private renderer!: WebGLRenderer;
  private backgroundRT!: RenderTexture;
  private backgroundSprite!: Sprite;
  private worldRT!: RenderTexture;
  private worldSprite!: Sprite;
  private prevRTW = 0;
  private prevRTH = 0;

  async init(): Promise<void> {
    // Compute integer pixel scale for native resolution
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    // Round up to maximize font quality — CSS scales down to fit window
    this.uiScale = Math.max(1, Math.round(Math.min(screenW / GAME_WIDTH, screenH / GAME_HEIGHT)));
    const nativeW = GAME_WIDTH * this.uiScale;
    const nativeH = GAME_HEIGHT * this.uiScale;

    // Renderer at native resolution — UI renders crisp here
    this.renderer = new WebGLRenderer();
    await this.renderer.init({
      width: nativeW,
      height: nativeH,
      backgroundColor: 0x3a1a28,
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

    // Game world container — rendered to RT at 640x360
    this.backgroundContainer = new Container();

    this.backgroundRT = RenderTexture.create({
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      resolution: 1,
      antialias: false,
    });
    this.backgroundSprite = new Sprite(this.backgroundRT);
    this.backgroundSprite.texture.source.scaleMode = 'nearest';
    this.backgroundSprite.scale.set(this.uiScale);
    this.app.stage.addChild(this.backgroundSprite);

    this.gameContainer = new Container();

    // Initial RT at base resolution
    this.worldRT = RenderTexture.create({
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      resolution: 1,
      antialias: false,
    });
    this.prevRTW = GAME_WIDTH;
    this.prevRTH = GAME_HEIGHT;

    // World sprite: scales 640x360 RT up to native resolution
    this.worldSprite = new Sprite(this.worldRT);
    this.worldSprite.texture.source.scaleMode = 'nearest';
    this.worldSprite.scale.set(this.uiScale);
    this.app.stage.addChild(this.worldSprite);

    // Legacy UI layer — 640x360 coordinates, scaled up to native
    this.legacyUIContainer = new Container();
    this.legacyUIContainer.scale.set(this.uiScale);
    this.app.stage.addChild(this.legacyUIContainer);

    // Hi-res UI layer — native resolution coordinates (HUD, minimap)
    this.uiContainer = new Container();
    this.app.stage.addChild(this.uiContainer);

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
          // Shift+I — 전역 디버그 오버레이 토글. INVENTORY 를 consume 해 인벤토리 모달이 열리지 않도록.
          if (this.input.shiftDown && this.input.isJustPressed(GameAction.INVENTORY)) {
            this.input.consumeJustPressed(GameAction.INVENTORY);
            Debug.infoVisible = !Debug.infoVisible;
            Debug.visible = Debug.infoVisible;
          }
          this.stats.playTimeMs += FIXED_STEP;
          this.sceneManager.update(FIXED_STEP);
        }
        this.input.update();
        this.accumulated -= FIXED_STEP;
      }

      const alpha = this.accumulated / FIXED_STEP;
      this.sceneManager.render(alpha);

      // --- Zoom via RenderTexture ---
      const zoom = this.camera.zoom;
      const rtW = Math.min(Math.ceil(GAME_WIDTH / zoom), MAX_RT_SIZE);
      const rtH = Math.min(Math.ceil(GAME_HEIGHT / zoom), MAX_RT_SIZE);

      // Recreate RT when size changes
      if (rtW !== this.prevRTW || rtH !== this.prevRTH) {
        this.worldRT.destroy();
        this.worldRT = RenderTexture.create({
          width: rtW,
          height: rtH,
          resolution: 1,
          antialias: false,
        });
        this.worldRT.source.scaleMode = 'nearest';
        this.worldSprite.texture = this.worldRT;
        this.prevRTW = rtW;
        this.prevRTH = rtH;
      }

      // Position gameContainer at 1x scale
      this.gameContainer.scale.set(1);
      const gcx = Math.round(-this.camera.renderX + rtW / 2);
      const gcy = Math.round(-this.camera.renderY + rtH / 2);
      this.gameContainer.x = gcx;
      this.gameContainer.y = gcy;

      this.renderer.render({
        container: this.backgroundContainer,
        target: this.backgroundRT,
        clear: true,
        clearColor: [0, 0, 0, 0],
      });

      // Render world to offscreen texture. The world RT is transparent so the
      // fixed background RT behind it remains visible through empty space.
      this.renderer.render({
        container: this.gameContainer,
        target: this.worldRT,
        clear: true,
        clearColor: [0, 0, 0, 0],
      });

      // Scale RT sprite to fill native resolution
      this.worldSprite.scale.x = (GAME_WIDTH / rtW) * this.uiScale;
      this.worldSprite.scale.y = (GAME_HEIGHT / rtH) * this.uiScale;

      // Render stage (worldSprite + uiContainer) to screen at native res
      this.renderer.render({ container: stage });
    });
  }

  private handleResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const canvas = this.app.canvas;

    // uiScale is locked at init — renderer/fonts/HUD are all built for that scale.
    // Only CSS changes to fit the window.
    const displayScale = Math.min(w / GAME_WIDTH, h / GAME_HEIGHT);
    canvas.style.width = `${Math.floor(GAME_WIDTH * displayScale)}px`;
    canvas.style.height = `${Math.floor(GAME_HEIGHT * displayScale)}px`;
    canvas.style.imageRendering = 'pixelated';
  }
}
