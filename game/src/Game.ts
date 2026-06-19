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
import { SaveManager } from '@utils/SaveManager';
import { GamepadManager } from '@core/GamepadManager';
import { AssetLoader } from '@core/AssetLoader';
import { Camera } from '@core/Camera';
import { Debug } from '@core/Debug';
import { GameRenderConst } from '@data/constData';
import { FpsCounter } from '@ui/FpsCounter';
import { PerfMonitor } from '@utils/PerfMonitor';
import { FeedbackPanel } from '@ui/FeedbackPanel';
import { setDefaultUiScale } from '@ui/factories';
import { TransitionDirector } from '@effects/TransitionDirector';
import type { ControlsSettings, DisplayScale, DisplaySettings, ScaleFilter, SettingsData } from '@core/SettingsStore';
import { setRumbleIntensityMultiplier } from '@utils/GamepadRumble';

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
  /** W3C Gamepad API ?대쭅 ??InputManager.setVirtualAction ?쇰줈 ?≪뀡 二쇱엯. */
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
   * Top-most overlay (above HUD/minimap). Used by FeedbackPanel ??its dim
   * overlay covers EVERYTHING including the high-res UI layer.
   */
  feedbackOverlayContainer!: Container;
  transitionLayer!: Container;
  transitionDirector!: TransitionDirector;

  /** Integer pixel scale (1x=640, 2x=1280, 3x=1920). */
  uiScale = 1;

  hitstopFrames = 0;
  /** Shift+I 濡?紐⑤뱺 UI ?덉씠?대? ?④릿 ?곹깭. true 硫?HUD/legacy/feedback overlay/FPS 紐⑤몢 鍮꾪몴?? */
  uiHidden = false;
  /** Set true while FeedbackPanel is open. Scenes early-return on update. */
  feedbackOpen = false;
  /**
   * True once gameplay HUD is allowed to render (post-title, post-Shaft banner).
   * FeedbackPanel hint indicator and HUD reveal both gate on this flag.
   * Reset to false when returning to TitleScene (Quit to Title path).
   */
  hudReady = false;
  feedbackPanel!: FeedbackPanel;
  stats = {
    enemiesKilled: 0,
    itemsCollected: 0,
    gatesBroken: 0,
    playTimeMs: 0,
  };
  private accumulated = 0;
  renderer!: Renderer;
  /** ?꾩옱 ?뚮뜑??諛깆뿏?? ?붾쾭洹?/ 異뷀썑 WGSL ?ы듃 遺꾧린???ъ슜. */
  rendererType: 'webgl' | 'webgpu' = 'webgl';
  private backgroundRT!: RenderTexture;
  private backgroundSprite!: Sprite;
  private worldRT!: RenderTexture;
  private worldSprite!: Sprite;
  private prevRTW = 0;
  private prevRTH = 0;
  private fpsCounter!: FpsCounter;
  private displayScaleMode: DisplayScale = 'auto';
  private scaleFilter: ScaleFilter = 'sharp';
  private uiStartupDebugFrames = 0;
  private uiStartupDebugLastScene = '';

  async init(): Promise<void> {
    // Compute integer pixel scale for native resolution
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    // Round up to maximize font quality ??CSS scales down to fit window
    const requestedUiScale = Math.max(1, Math.round(Math.min(screenW / GAME_WIDTH, screenH / GAME_HEIGHT)));
    this.uiScale = requestedUiScale;
    // Plumb uiScale into the UI text factory so KO PIXI.Text nodes default to
    // the correct texture density and stay crisp inside scaled containers.
    setDefaultUiScale(this.uiScale);
    const nativeW = GAME_WIDTH * this.uiScale;
    const nativeH = GAME_HEIGHT * this.uiScale;

    // Renderer at native resolution ??UI renders crisp here.
    //
    // WebGPU ?듯듃?? `?renderer=webgpu` 荑쇰━?ㅽ듃留곸쑝濡쒕쭔 ?쒖꽦. PaletteSwap /
    // RimLight / GlowFilter 媛 GLSL only ??default ?꾪솚 ???쒓컖 ?뚭?媛 諛쒖깮.
    // WGSL ?ы듃 ??default ?밴꺽 ?덉젙 (pixijs-references.html roadmap P1).
    //
    // ?뺤쟻 ?꾪룷?몃줈 ???대옒?ㅻ? 紐⑤몢 踰덈뱾???ы븿 ??`autoDetectRenderer` ??    // ?숈쟻 ?꾪룷?몃뒗 Vite production ?먯꽌 hang ???좊컻???꾨?媛 ?덉뼱 ?뚰뵾.
    const params = new URLSearchParams(window.location.search);
    const preferWebGpu = params.get('renderer') === 'webgpu';
    const initOpts = {
      width: nativeW,
      height: nativeH,
      backgroundColor: 0x000000,
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

    // Game world container ??rendered to RT at 640x360
    this.backgroundContainer = new Container();

    this.backgroundRT = RenderTexture.create({
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      resolution: 1,
      antialias: false,
    });
    this.backgroundSprite = new Sprite(this.backgroundRT);
    this.backgroundSprite.texture.source.scaleMode = this.textureScaleMode();
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
    this.worldSprite.texture.source.scaleMode = this.textureScaleMode();
    this.worldSprite.scale.set(this.uiScale);
    this.app.stage.addChild(this.worldSprite);

    // Legacy UI layer ??640x360 coordinates, scaled up to native
    this.legacyUIContainer = new Container();
    this.legacyUIContainer.scale.set(this.uiScale);
    this.app.stage.addChild(this.legacyUIContainer);

    // Hi-res UI layer ??native resolution coordinates (HUD, minimap)
    this.uiContainer = new Container();
    this.app.stage.addChild(this.uiContainer);

    // Top-most overlay layer ??used by FeedbackPanel so it covers HUD/minimap.
    // 640x360 coords, scaled like legacyUIContainer.
    this.feedbackOverlayContainer = new Container();
    this.feedbackOverlayContainer.scale.set(this.uiScale);
    this.app.stage.addChild(this.feedbackOverlayContainer);

    this.transitionLayer = new Container();
    this.transitionLayer.scale.set(this.uiScale);
    this.app.stage.addChild(this.transitionLayer);

    this.input = new InputManager();
    this.gamepad = new GamepadManager();
    this.assetLoader = new AssetLoader();
    this.camera = new Camera(GAME_WIDTH, GAME_HEIGHT);
    this.transitionDirector = new TransitionDirector(this, this.transitionLayer);
    this.sceneManager = new SceneManager(this);

    // DEV ?꾩슜 ?붾쾭洹?釉뚮━吏 ??Playwright/肄섏넄?먯꽌 ?꾩옱 ??룹꽭?대툕 introspection.
    // (window.__inputTracker ? ?숈씪???⑦꽩; ?꾨줈?뺤뀡 踰덈뱾?먮뒗 ?ы븿?섏? ?딆쓬.)
    if (import.meta.env.DEV) {
      void Promise.all([
        import('@save/PlayerSave'),
        import('@level/ItemWorldTemplatePool'),
      ]).then(([{ sacredSave }, { prepareItemWorldTemplates }]) => {
        (window as unknown as { __echoris?: unknown }).__echoris = {
          sceneManager: this.sceneManager,
          save: sacredSave,
          loadTemplates: prepareItemWorldTemplates,
        };
      });
    }

    // Debug FPS / sprite count overlay ??Shift+I ?좉? (Debug.infoVisible).
    // app.stage 吏곸냽 ??ItemWorldScene ?????꾪솚 ??uiContainer.removeChildren()
    // ???곹뼢??諛쏆? ?딅룄濡?stage ??媛????layer 濡?
    this.fpsCounter = new FpsCounter(this.uiScale);
    this.app.stage.addChild(this.fpsCounter.container);

    // F-key feedback panel ??global, persists across scene changes.
    this.feedbackPanel = new FeedbackPanel(this);

    this.app.ticker.add((ticker) => {
      PerfMonitor.frameBegin();
      this.accumulated += ticker.deltaMS;
      if (this.accumulated > MAX_ACCUMULATED) {
        this.accumulated = MAX_ACCUMULATED;
      }

      while (this.accumulated >= FIXED_STEP) {
        if (this.hitstopFrames > 0) {
          this.hitstopFrames--;
        } else {
          // Gamepad ?대쭅 ??sceneManager.update() 吏곸쟾 + input.update() ?꾩뿉 ?몄텧?댁빞
          // setVirtualAction ?쇰줈 二쇱엯??keystate 媛 isJustPressed 濡??뺥솗??寃異쒕맂??
          this.gamepad.poll(this.input);

          // `?debug` URL ?뚮옒洹?寃뚯씠?? Shift+I/U ???붾쾭洹?肄ㅻ낫???쇰컲 ?좎??먭쾶 鍮꾪솢??
          // Shift+P (hard reset) ???대뼡 紐⑤뱶?먯꽌????긽 ?숈옉?댁빞 ?섎?濡?寃뚯씠??諛뽰뿉 ?붾떎.
          if (new URLSearchParams(window.location.search).has('debug')) {
            // Shift+I ??debug renderer(FPS + HUD ?붾쾭洹??띿뒪??+ ?덊듃諛뺤뒪 諛뺤뒪 ?? ?좉?.
            // Debug.visible: Player.attackSprite (怨듦꺽 hitbox debug rect) ???멸쾶???붾쾭洹??쒓컖?붿냼.
            // Debug.infoVisible: HUD/???⑥쓽 debug ?쇰꺼 / FpsCounter container.
            // INVENTORY consume ???몃깽?좊━ 紐⑤떖 ?대┝ 諛⑹?.
            if (this.input.shiftDown && this.input.isJustPressed(GameAction.INVENTORY)) {
              this.input.consumeJustPressed(GameAction.INVENTORY);
              const next = !Debug.visible;
              Debug.visible = next;
              Debug.infoVisible = next;
              this.fpsCounter.container.visible = next;
            }
            // Shift+U ??紐⑤뱺 HUD/紐⑤떖 ?덉씠??uiContainer + legacyUIContainer + feedback overlay) ?좉?.
            // DEBUG_UI_TOGGLE consume ?댁꽌 ?ㅻⅨ ?몃뱾?ш? 媛숈? ?ㅻ? ??踰?泥섎━?섏? ?딅룄濡?
            if (this.input.shiftDown && this.input.isJustPressed(GameAction.DEBUG_UI_TOGGLE)) {
              this.input.consumeJustPressed(GameAction.DEBUG_UI_TOGGLE);
              this.uiHidden = !this.uiHidden;
              const visible = !this.uiHidden;
              this.uiContainer.visible = visible;
              this.legacyUIContainer.visible = visible;
              this.feedbackOverlayContainer.visible = visible;
            }
            // Shift+[ ??zoom in (+0.1). Shift+] ??zoom out (-0.1). Camera.setZoom
            // ??[0.01, 4.0] ?쇰줈 ?대옩?? raw ??肄붾뱶瑜??곕뒗 ?댁쑀: [/] ??GameAction
            // 諛붿씤?⑹뿉 ?녾퀬 利됱꽍 ?붾쾭洹?紐⑹쟻?대씪 enum ?깅줉???쇳븳??
            // 猷????꾪솚 ??湲곗〈 肄붾뱶(LdtkWorldScene/ItemWorldScene)媛 setZoom(1.0)
            // ?몄텧 ???ㅻⅨ 諛?媛붾떎?ㅻ㈃ ?먮룞 由ъ뀑.
            const zoomIn = this.input.shiftDown && this.input.isJustPressedKeyCode('BracketLeft');
            const zoomOut = this.input.shiftDown && this.input.isJustPressedKeyCode('BracketRight');
            if (zoomIn || zoomOut) {
              this.camera.setZoom(this.camera.zoom + (zoomIn ? 0.1 : -0.1), { bypassLock: true });
              const toast = (this.sceneManager.active as { toast?: { show: (msg: string, color?: number) => void } } | null)?.toast;
              toast?.show(`Zoom ${this.camera.zoom.toFixed(1)}x`, 0xffa41b);
            }
            // Shift+Y: debug slow animation/gameplay time to 0.1x for frame inspection.
            if (this.input.shiftDown && this.input.isJustPressedKeyCode('KeyY')) {
              Debug.animationTimeScale = Debug.animationTimeScale === 1 ? 0.1 : 1;
              const toast = (this.sceneManager.active as { toast?: { show: (msg: string, color?: number) => void } } | null)?.toast;
              toast?.show(`Animation ${Debug.animationTimeScale === 1 ? '1.0x' : '0.1x'}`, 0xffa41b);
            }
          }
          // Shift+P ???꾩뿭 hard reset. ?몄씠釉?+ ?ㅻ낫??preset(localStorage) 紐⑤몢 ??젣 ??reload.
          // ?대뼡 ?ъ뿉?쒕룄 ?묐룞?섎룄濡?Game.ts ?⑥쑝濡??쇱썝??(?댁쟾??LdtkWorldScene 留?泥섎━).
          // debug 寃뚯씠??諛????쇰컲 ?좎???留앷?吏??몄씠釉??ㅻ컮?몃뵫??蹂듦뎄?????덉뼱????
          if (this.input.shiftDown && this.input.isJustPressed(GameAction.DEBUG_RESET)) {
            this.input.consumeJustPressed(GameAction.DEBUG_RESET);
            SaveManager.deleteSave();
            try { localStorage.removeItem('echoris-keybindings'); } catch { /* private mode */ }
            window.location.reload();
            return;
          }
          const sceneStep = FIXED_STEP * Debug.animationTimeScale;
          this.transitionDirector.update(sceneStep);
          this.stats.playTimeMs += FIXED_STEP;
          if (!this.transitionDirector.blocksSceneUpdate) {
            PerfMonitor.begin('scene.update');
            this.sceneManager.update(sceneStep);
            PerfMonitor.end('scene.update');
          }
        }
        this.feedbackPanel?.update(FIXED_STEP);
        this.input.update();
        this.accumulated -= FIXED_STEP;
      }

      const alpha = this.accumulated / FIXED_STEP;
      PerfMonitor.begin('scene.render');
      this.sceneManager.render(alpha);
      PerfMonitor.end('scene.render');
      this.debugLogStartupUiVisibility();

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
        this.worldRT.source.scaleMode = this.textureScaleMode();
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

      PerfMonitor.begin('renderer.bgRT');
      this.renderer.render({
        container: this.backgroundContainer,
        target: this.backgroundRT,
        clear: true,
        clearColor: [0, 0, 0, 0],
      });
      PerfMonitor.end('renderer.bgRT');

      // Render world to offscreen texture. The world RT is transparent so the
      // fixed background RT behind it remains visible through empty space.
      PerfMonitor.begin('renderer.worldRT');
      this.renderer.render({
        container: this.gameContainer,
        target: this.worldRT,
        clear: true,
        clearColor: [0, 0, 0, 0],
      });
      PerfMonitor.end('renderer.worldRT');

      // Scale RT sprite to fill native resolution
      this.backgroundSprite.scale.set(this.uiScale);
      this.worldSprite.scale.x = (GAME_WIDTH / rtW) * this.uiScale;
      this.worldSprite.scale.y = (GAME_HEIGHT / rtH) * this.uiScale;

      // Debug FPS / sprite count update ??render 吏곸쟾.
      this.fpsCounter.update(ticker.deltaMS, stage);

      // Render stage (worldSprite + uiContainer) to screen at native res
      PerfMonitor.begin('renderer.draw');
      this.renderer.render({ container: stage });
      PerfMonitor.end('renderer.draw');
      PerfMonitor.tickWindow();
    });
  }

  private handleResize(): void {
    const pseudoFullscreen = document.documentElement.classList.contains('echoris-pseudo-fullscreen');
    const vv = window.visualViewport;
    const w = pseudoFullscreen ? Math.floor(vv?.width ?? window.innerWidth) : window.innerWidth;
    const h = pseudoFullscreen ? Math.floor(vv?.height ?? window.innerHeight) : window.innerHeight;
    const canvas = this.app.canvas;

    // uiScale is locked at init ??renderer/fonts/HUD are all built for that scale.
    // Only CSS changes to fit the window.
    const fitScale = Math.min(w / GAME_WIDTH, h / GAME_HEIGHT);
    const requestedScale = this.displayScaleNumber();
    const displayScale = requestedScale === null ? fitScale : Math.min(fitScale, requestedScale);
    canvas.style.width = `${Math.floor(GAME_WIDTH * displayScale)}px`;
    canvas.style.height = `${Math.floor(GAME_HEIGHT * displayScale)}px`;
    canvas.style.imageRendering = this.scaleFilter === 'sharp' ? 'pixelated' : 'auto';
  }

  private debugLogStartupUiVisibility(): void {
    if (!new URLSearchParams(window.location.search).has('debug') || this.uiStartupDebugFrames >= 900) return;
    this.uiStartupDebugFrames++;
    const activeScene = this.sceneManager.active?.constructor?.name ?? 'none';
    const sceneChanged = activeScene !== this.uiStartupDebugLastScene;
    this.uiStartupDebugLastScene = activeScene;
    if (!sceneChanged && this.uiStartupDebugFrames % 10 !== 1) return;

    const describeLayer = (name: string, container: Container): string => {
      const visibleChildren = container.children
        .map((child, index) => {
          const display = child as Container & { label?: string | null; alpha?: number };
          if (!display.visible) return null;
          const ctor = display.constructor?.name ?? 'DisplayObject';
          const label = display.label || '';
          const childCount = 'children' in display ? display.children.length : 0;
          const alpha = typeof display.alpha === 'number' ? display.alpha.toFixed(2) : '?';
          const visibleGrandchildren = 'children' in display
            ? display.children
              .map((grandchild, grandIndex) => {
                const grandDisplay = grandchild as Container & { label?: string | null; alpha?: number };
                if (!grandDisplay.visible) return null;
                const grandCtor = grandDisplay.constructor?.name ?? 'DisplayObject';
                const grandLabel = grandDisplay.label || '';
                const grandAlpha = typeof grandDisplay.alpha === 'number' ? grandDisplay.alpha.toFixed(2) : '?';
                return `${grandIndex}:${grandCtor}${grandLabel ? `#${grandLabel}` : ''}(alpha=${grandAlpha})`;
              })
              .filter((entry): entry is string => !!entry)
              .slice(0, 12)
              .join(', ')
            : '';
          return `${index}:${ctor}${label ? `#${label}` : ''}(alpha=${alpha},children=${childCount}${visibleGrandchildren ? `,visibleKids=${visibleGrandchildren}` : ''})`;
        })
        .filter((entry): entry is string => !!entry);
      return `${name}[visible=${container.visible}, children=${container.children.length}] ${visibleChildren.join(' | ') || '(none)'}`;
    };

    console.log(
      `[StartupUI frame=${this.uiStartupDebugFrames} hudReady=${this.hudReady} active=${activeScene}${sceneChanged ? ' sceneChanged' : ''}]`,
      describeLayer('ui', this.uiContainer),
      describeLayer('legacy', this.legacyUIContainer),
      describeLayer('feedback', this.feedbackOverlayContainer),
      describeLayer('transition', this.transitionLayer),
    );
  }

  generateTexture(container: Container) {
    return this.renderer.generateTexture(container);
  }

  applySettings(settings: SettingsData): void {
    this.applyDisplaySettings(settings.display);
    this.applyControlsSettings(settings.controls);
  }

  applyDisplaySettings(settings: DisplaySettings): void {
    this.displayScaleMode = settings.scale;
    this.scaleFilter = settings.scaleFilter;
    this.camera?.setShakeMultiplier(shakeMultiplier(settings.shake));
    Debug.infoVisible = settings.showFps;
    if (this.fpsCounter) this.fpsCounter.container.visible = settings.showFps;
    this.applyScaleFilterToRenderTargets();
    if (this.app?.canvas) this.handleResize();
  }

  applyControlsSettings(settings: ControlsSettings): void {
    setRumbleIntensityMultiplier(rumbleMultiplier(settings.rumble));
  }

  private textureScaleMode(): 'nearest' | 'linear' {
    return this.scaleFilter === 'sharp' ? 'nearest' : 'linear';
  }

  private applyScaleFilterToRenderTargets(): void {
    const mode = this.textureScaleMode();
    if (this.backgroundRT?.source) this.backgroundRT.source.scaleMode = mode;
    if (this.worldRT?.source) this.worldRT.source.scaleMode = mode;
    if (this.backgroundSprite?.texture?.source) this.backgroundSprite.texture.source.scaleMode = mode;
    if (this.worldSprite?.texture?.source) this.worldSprite.texture.source.scaleMode = mode;
  }

  private displayScaleNumber(): number | null {
    switch (this.displayScaleMode) {
      case '1x': return 1;
      case '2x': return 2;
      case '3x': return 3;
      default: return null;
    }
  }
}

function shakeMultiplier(level: DisplaySettings['shake']): number {
  switch (level) {
    case 'off': return 0;
    case 'low': return 0.5;
    default: return 1;
  }
}

function rumbleMultiplier(level: ControlsSettings['rumble']): number {
  switch (level) {
    case 'off': return 0;
    case 'low': return 1.5;
    default: return 4;
  }
}

