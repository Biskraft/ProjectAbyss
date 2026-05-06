// Pre-load PixiJS browser environment statically to avoid
// dynamic-import hang in Vite production builds
import 'pixi.js/browser';

import {
  Container,
  RenderTexture,
  Sprite,
  Ticker,
  WebGLRenderer,
  WebGPURenderer,
  isWebGPUSupported,
  type Renderer,
} from 'pixi.js';
import { SceneManager } from '@core/SceneManager';
import { InputManager, GameAction } from '@core/InputManager';
import { GamepadManager } from '@core/GamepadManager';
import { AssetLoader } from '@core/AssetLoader';
import { Camera } from '@core/Camera';
import { Debug } from '@core/Debug';
import { GameRenderConst } from '@data/constData';
import { FpsCounter } from '@ui/FpsCounter';
import { FeedbackPanel } from '@ui/FeedbackPanel';

export const GAME_WIDTH = GameRenderConst.GameWidth;
export const GAME_HEIGHT = GameRenderConst.GameHeight;
const FIXED_STEP = GameRenderConst.FixedStepMs;
const MAX_ACCUMULATED = FIXED_STEP * GameRenderConst.MaxAccumulatedFrames;
const MAX_RT_SIZE = GameRenderConst.MaxRTSize;

export class Game {
  app!: {
    stage: Container;
    canvas: HTMLCanvasElement;
    ticker: Ticker;
  };
  sceneManager!: SceneManager;
  input!: InputManager;
  /** W3C Gamepad API 폴링 — InputManager.setVirtualAction 으로 액션 주입. */
  gamepad!: GamepadManager;
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

  /**
   * Top-most overlay (above HUD/minimap). Used by FeedbackPanel — its dim
   * overlay covers EVERYTHING including the high-res UI layer.
   */
  feedbackOverlayContainer!: Container;

  /** Integer pixel scale (1x=640, 2x=1280, 3x=1920). */
  uiScale = 1;

  hitstopFrames = 0;
  /** Shift+I 로 모든 UI 레이어를 숨긴 상태. true 면 HUD/legacy/feedback overlay/FPS 모두 비표시. */
  uiHidden = false;
  /** Set true while FeedbackPanel is open. Scenes early-return on update. */
  feedbackOpen = false;
  feedbackPanel!: FeedbackPanel;
  stats = {
    enemiesKilled: 0,
    itemsCollected: 0,
    gatesBroken: 0,
    playTimeMs: 0,
  };
  private accumulated = 0;
  private renderer!: Renderer;
  /** 현재 렌더러 백엔드. 디버그 / 추후 WGSL 포트 분기에 사용. */
  rendererType: 'webgl' | 'webgpu' = 'webgl';
  private backgroundRT!: RenderTexture;
  private backgroundSprite!: Sprite;
  private worldRT!: RenderTexture;
  private worldSprite!: Sprite;
  private prevRTW = 0;
  private prevRTH = 0;
  private fpsCounter!: FpsCounter;

  async init(): Promise<void> {
    // Compute integer pixel scale for native resolution
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    // Round up to maximize font quality — CSS scales down to fit window
    this.uiScale = Math.max(1, Math.round(Math.min(screenW / GAME_WIDTH, screenH / GAME_HEIGHT)));
    const nativeW = GAME_WIDTH * this.uiScale;
    const nativeH = GAME_HEIGHT * this.uiScale;

    // Renderer at native resolution — UI renders crisp here.
    //
    // WebGPU 옵트인: `?renderer=webgpu` 쿼리스트링으로만 활성. PaletteSwap /
    // RimLight / GlowFilter 가 GLSL only 라 default 전환 시 시각 회귀가 발생.
    // WGSL 포트 후 default 승격 예정 (pixijs-references.html roadmap P1).
    //
    // 정적 임포트로 두 클래스를 모두 번들에 포함 — `autoDetectRenderer` 의
    // 동적 임포트는 Vite production 에서 hang 을 유발한 전례가 있어 회피.
    const params = new URLSearchParams(window.location.search);
    const preferWebGpu = params.get('renderer') === 'webgpu';
    const initOpts = {
      width: nativeW,
      height: nativeH,
      backgroundColor: 0x3a1a28,
      resolution: 1,
      autoDensity: false,
      antialias: false,
      manageImports: false,
    };
    if (preferWebGpu && (await isWebGPUSupported())) {
      const r = new WebGPURenderer();
      await r.init(initOpts);
      this.renderer = r;
      this.rendererType = 'webgpu';
    } else {
      const r = new WebGLRenderer();
      await r.init(initOpts);
      this.renderer = r;
      this.rendererType = 'webgl';
    }
    if (import.meta.env.DEV) {
      console.info(`[Game] renderer=${this.rendererType} (preference=${preferWebGpu ? 'webgpu' : 'webgl'})`);
    }

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

    // Top-most overlay layer — used by FeedbackPanel so it covers HUD/minimap.
    // 640x360 coords, scaled like legacyUIContainer.
    this.feedbackOverlayContainer = new Container();
    this.feedbackOverlayContainer.scale.set(this.uiScale);
    this.app.stage.addChild(this.feedbackOverlayContainer);

    this.input = new InputManager();
    this.gamepad = new GamepadManager();
    this.assetLoader = new AssetLoader();
    this.camera = new Camera(GAME_WIDTH, GAME_HEIGHT);
    this.sceneManager = new SceneManager(this);

    // Debug FPS / sprite count overlay — Shift+I 토글 (Debug.infoVisible).
    // app.stage 직속 — ItemWorldScene 등 씬 전환 시 uiContainer.removeChildren()
    // 의 영향을 받지 않도록 stage 의 가장 위 layer 로.
    this.fpsCounter = new FpsCounter(this.uiScale);
    this.app.stage.addChild(this.fpsCounter.container);

    // F-key feedback panel — global, persists across scene changes.
    this.feedbackPanel = new FeedbackPanel(this);

    this.app.ticker.add((ticker) => {
      this.accumulated += ticker.deltaMS;
      if (this.accumulated > MAX_ACCUMULATED) {
        this.accumulated = MAX_ACCUMULATED;
      }

      while (this.accumulated >= FIXED_STEP) {
        if (this.hitstopFrames > 0) {
          this.hitstopFrames--;
        } else {
          // Gamepad 폴링 — sceneManager.update() 직전 + input.update() 전에 호출해야
          // setVirtualAction 으로 주입된 keystate 가 isJustPressed 로 정확히 검출된다.
          this.gamepad.poll(this.input);

          // Shift+I — 전역 UI 토글. HUD/legacy/feedback 오버레이 + FPS 카운터 + Debug 오버레이를
          // 한꺼번에 켜고 끈다. INVENTORY 를 consume 해 인벤토리 모달이 열리지 않도록.
          if (this.input.shiftDown && this.input.isJustPressed(GameAction.INVENTORY)) {
            this.input.consumeJustPressed(GameAction.INVENTORY);
            this.uiHidden = !this.uiHidden;
            const visible = !this.uiHidden;
            this.uiContainer.visible = visible;
            this.legacyUIContainer.visible = visible;
            this.feedbackOverlayContainer.visible = visible;
            this.fpsCounter.container.visible = visible;
            if (import.meta.env.DEV) {
              Debug.infoVisible = visible;
              Debug.visible = visible;
            }
          }
          this.stats.playTimeMs += FIXED_STEP;
          this.sceneManager.update(FIXED_STEP);
        }
        this.feedbackPanel?.update(FIXED_STEP);
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

      // Debug FPS / sprite count update — render 직전.
      this.fpsCounter.update(ticker.deltaMS, stage);

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
