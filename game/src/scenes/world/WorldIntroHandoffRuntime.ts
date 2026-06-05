import { Graphics } from 'pixi.js';
import type { Game } from '../../Game';
import type { AreaTitle } from '@ui/AreaTitle';
import type { HUD } from '@ui/HUD';
import { destroyDisplayObject, destroyNullableDisplayObject, hideDisplayObject } from '@scenes/shared/DisplayObjectLifecycleHelpers';
import { getProgress01 } from '@scenes/shared/NumericHelpers';
import { TITLE_FADE_OVERLAY_LABEL } from '@scenes/shared/TitleHandoffLabels';

const TITLE_FADE_IN_MS = 1400;
const HUD_REVEAL_DELAY_MS = 5000;

type IntroPhase = 'none' | 'fadeIn' | 'title' | 'awaitingHud' | 'done';

interface WorldIntroHandoffRuntimeDeps {
  game: Game;
  isInItemTunnel: () => boolean;
  setMinimapVisible: (visible: boolean) => void;
}

export class WorldIntroHandoffRuntime {
  private titleFadeInOverlay: Graphics | null = null;
  private titleFadeInTimer = 0;
  private introPhase: IntroPhase = 'none';
  private hudRevealTimer = 0;
  private pendingAreaTitle: string | null = null;
  private wasAreaTitleActive = false;
  private hud: HUD | null = null;
  private areaTitle: AreaTitle | null = null;

  constructor(private readonly deps: WorldIntroHandoffRuntimeDeps) {}

  get isHudSuppressed(): boolean {
    return this.introPhase === 'fadeIn'
      || this.introPhase === 'title'
      || this.introPhase === 'awaitingHud';
  }

  get isMinimapIntroHidden(): boolean {
    return this.introPhase === 'fadeIn' || this.introPhase === 'title';
  }

  captureTitleHandoff(): boolean {
    const handoff = this.deps.game.uiContainer.getChildByLabel(TITLE_FADE_OVERLAY_LABEL);
    if (!(handoff instanceof Graphics)) return false;
    this.titleFadeInOverlay = handoff;
    this.titleFadeInTimer = 0;
    this.introPhase = 'fadeIn';
    return true;
  }

  bindHud(hud: HUD): void {
    this.hud = hud;
  }

  bindAreaTitle(areaTitle: AreaTitle): void {
    this.areaTitle = areaTitle;
    this.wasAreaTitleActive = areaTitle.isActive;
  }

  skipIntroSequence(): void {
    if (this.introPhase === 'fadeIn') this.introPhase = 'none';
    this.pendingAreaTitle = null;
    this.hudRevealTimer = 0;
  }

  applyInitialHudGate(hideHud: boolean): void {
    if (hideHud) {
      hideDisplayObject(this.hud?.container);
      this.deps.game.hudReady = false;
    } else {
      this.deps.game.hudReady = true;
    }
  }

  showOrQueueAreaTitle(title: string): void {
    if (this.introPhase === 'fadeIn') {
      this.pendingAreaTitle = title;
      return;
    }
    this.areaTitle?.show(title);
  }

  hideHudForIntroIfNeeded(): void {
    if (!this.isHudSuppressed) return;
    hideDisplayObject(this.hud?.container);
    this.deps.setMinimapVisible(false);
  }

  update(dt: number): void {
    this.updateTitleFade(dt);
    this.updateHudReveal(dt);
  }

  destroy(): void {
    this.titleFadeInOverlay = destroyNullableDisplayObject(this.titleFadeInOverlay);
  }

  private updateTitleFade(dt: number): void {
    if (!this.titleFadeInOverlay) return;

    this.titleFadeInTimer += dt;
    const t = getProgress01(this.titleFadeInTimer, TITLE_FADE_IN_MS);
    this.titleFadeInOverlay.alpha = 1 - t;
    if (t < 1) return;

    destroyDisplayObject(this.titleFadeInOverlay);
    this.titleFadeInOverlay = null;

    if (this.introPhase !== 'fadeIn') return;
    this.introPhase = 'title';
    if (this.pendingAreaTitle) {
      this.areaTitle?.show(this.pendingAreaTitle);
      this.pendingAreaTitle = null;
    }
  }

  private updateHudReveal(dt: number): void {
    const areaTitleActive = this.areaTitle?.isActive ?? false;
    if (
      this.wasAreaTitleActive
      && !areaTitleActive
      && this.introPhase === 'title'
    ) {
      this.introPhase = 'awaitingHud';
      this.hudRevealTimer = HUD_REVEAL_DELAY_MS;
    }

    if (this.introPhase === 'awaitingHud') {
      this.hudRevealTimer -= dt;
      if (this.hudRevealTimer <= 0) {
        if (this.hud) this.hud.container.visible = true;
        if (!this.deps.isInItemTunnel()) this.deps.setMinimapVisible(true);
        this.introPhase = 'done';
        this.deps.game.hudReady = true;
      }
    }

    this.wasAreaTitleActive = areaTitleActive;
  }
}
