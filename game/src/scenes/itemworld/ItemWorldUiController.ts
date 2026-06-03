import { Container, Graphics } from 'pixi.js';
import {
  create9SlicePanel, MODAL_BG, MODAL_BORDER, TEXT_PRIMARY, TEXT_SECONDARY,
  TEXT_DELTA_POSITIVE, TEXT_DELTA_NEGATIVE, TEXT_DELTA_NEUTRAL,
  TEXT_INFO_WARM, TEXT_LABEL_MUTED, TEXT_BOSS_TITLE, TEXT_INFO,
} from '@ui/ModalPanel';
import { PIXEL_FONT } from '@ui/fonts';
import { createUiText } from '@ui/factories';
import { t } from '@i18n';
import type { UISkin } from '@ui/UISkin';
import { ReturnResult, type DiveResult } from '@ui/ReturnResult';
import { StratumClearOverlay, type StratumClearData } from '@ui/StratumClearOverlay';
import { GameAction, actionKey } from '@core/InputManager';
import { createItemWorldLeaveConfirmPanel } from '@ui/ItemWorldLeaveConfirmPanel';
import type { Game } from '../../Game';
import { GAME_WIDTH, GAME_HEIGHT } from '../../Game';

interface PromptRefs {
  exitPrompt: Container | null;
}

interface EscapeConfirmOptions {
  hudSkin: UISkin | null;
  itemName: string;
  itemLevel: number;
  itemExp: number;
  expPerLevel: number;
  roomsCleared: number;
  totalRooms: number;
  earnedExp: number;
  earnedGold: number;
  prompts: PromptRefs;
}

interface BossChoiceOptions {
  hudSkin: UISkin | null;
  nextStratumIndex: number;
}

interface OnboardingOptions {
  hudSkin: UISkin | null;
  messages: string[];
}

interface StratumClearSnapshot {
  beforeAtk: number;
  afterAtk: number;
  beforeLevel: number;
  afterLevel: number;
  beforeInnocents: number;
  afterInnocents: number;
}

interface PromptSuppressionOptions {
  hasStratumClearPanel: boolean;
  transitionState: string;
}

export class ItemWorldUiController {
  private escapeConfirm: Container | null = null;
  private escapeConfirmVisible = false;
  private bossChoicePanel: Container | null = null;
  private bossChoiceVisible = false;
  private onboardingPanel: Container | null = null;
  private onboardingStep = 0;
  private onboardingDone = true;
  private returnResult: ReturnResult | null = null;
  private stratumClearPanel: { container: Container; confirmed: boolean } | null = null;
  private stratumClearOverlay: StratumClearOverlay | null = null;

  constructor(private readonly game: Game) {}

  isEscapeConfirmVisible(): boolean {
    return this.escapeConfirmVisible;
  }

  isBossChoiceVisible(): boolean {
    return this.bossChoiceVisible;
  }

  isOnboardingDone(): boolean {
    return this.onboardingDone;
  }

  hasStratumClearPanel(): boolean {
    return this.stratumClearPanel !== null;
  }

  isReturnResultVisible(): boolean {
    return this.returnResult?.visible ?? false;
  }

  createReturnResult(hudSkin: UISkin | null, onDismiss: () => void): void {
    this.destroyReturnResult();
    this.returnResult = new ReturnResult(hudSkin, this.game.uiScale);
    this.returnResult.onDismiss = onDismiss;
    this.game.uiContainer.addChild(this.returnResult.container);
  }

  updateReturnResult(dt: number): void {
    this.returnResult?.update(dt);
  }

  confirmReturnResult(): void {
    this.returnResult?.confirm();
  }

  showReturnResult(result: DiveResult, onDismiss: () => void): boolean {
    if (!this.returnResult) return false;
    // Death-path cleanup wipes uiContainer.children before showing the
    // ReturnResult modal, so its container can lose its parent. Re-attach
    // before show() so the modal actually renders. (Without this the user
    // sees the game freeze on death — modal is "shown" but lives outside
    // the scene graph.)
    if (!this.returnResult.container.parent) {
      this.game.uiContainer.addChild(this.returnResult.container);
    }
    this.returnResult.onDismiss = onDismiss;
    this.returnResult.show(result);
    return true;
  }

  startOnboarding(options: OnboardingOptions): void {
    this.onboardingStep = 0;
    this.onboardingDone = false;
    this.showOnboardingStep(options);
  }

  advanceOnboarding(options: OnboardingOptions): void {
    this.onboardingStep++;
    this.showOnboardingStep(options);
  }

  showStratumClearPanel(snapshot: StratumClearSnapshot, hudSkin: UISkin | null, autoConfirmed: boolean): void {
    if (this.stratumClearPanel) {
      const panel = this.stratumClearPanel;
      if (panel.container.parent) panel.container.parent.removeChild(panel.container);
      panel.container.destroy({ children: true });
      this.stratumClearPanel = null;
    }

    const W = 320;
    const H = 164;
    const x = Math.floor((GAME_WIDTH - W) / 2);
    const y = Math.floor((GAME_HEIGHT - H) / 2) - 12;

    const container = new Container();
    const frame = hudSkin?.isLoaded ? create9SlicePanel(hudSkin, W, H) : null;
    if (frame) {
      container.addChild(frame);
    } else {
      const bg = new Graphics();
      bg.rect(0, 0, W, H).fill({ color: MODAL_BG, alpha: 0.96 });
      bg.rect(0, 0, W, H).stroke({ color: MODAL_BORDER, width: 1 });
      container.addChild(bg);
    }

    const title = createUiText(
      autoConfirmed ? t('ui.iw.stratum_cleared') : t('ui.iw.progress_banked'),
      { fontFamily: PIXEL_FONT, fontSize: 16, fill: TEXT_INFO_WARM },
    );
    title.x = Math.floor((W - title.width) / 2);
    title.y = 12;
    container.addChild(title);

    const rows: Array<[string, number, number]> = [
      [t('ui.iw.row_atk'), snapshot.beforeAtk, snapshot.afterAtk],
      [t('ui.iw.row_item_lv'), snapshot.beforeLevel, snapshot.afterLevel],
      [t('ui.iw.row_innocents'), snapshot.beforeInnocents, snapshot.afterInnocents],
    ];

    let ry = 48;
    for (const [label, before, after] of rows) {
      const delta = after - before;
      const hasDelta = delta !== 0;
      const deltaColor = delta > 0 ? TEXT_DELTA_POSITIVE : delta < 0 ? TEXT_DELTA_NEGATIVE : TEXT_DELTA_NEUTRAL;

      const lbl = createUiText(label, { fontFamily: PIXEL_FONT, fontSize: 16, fill: TEXT_LABEL_MUTED });
      lbl.x = 20;
      lbl.y = ry;
      container.addChild(lbl);

      const bef = createUiText(String(before), { fontFamily: PIXEL_FONT, fontSize: 16, fill: TEXT_DELTA_NEUTRAL });
      bef.x = 120;
      bef.y = ry;
      container.addChild(bef);

      const arrow = createUiText('→', { fontFamily: PIXEL_FONT, fontSize: 16, fill: TEXT_DELTA_NEUTRAL });
      arrow.x = 160;
      arrow.y = ry;
      container.addChild(arrow);

      const aft = createUiText(String(after), {
        fontFamily: PIXEL_FONT, fontSize: 16, fill: hasDelta ? TEXT_PRIMARY : TEXT_DELTA_NEUTRAL,
      });
      aft.x = 196;
      aft.y = ry;
      container.addChild(aft);

      if (hasDelta) {
        const d = createUiText(
          `${delta > 0 ? '+' : ''}${delta}`,
          { fontFamily: PIXEL_FONT, fontSize: 16, fill: deltaColor },
        );
        d.x = 244;
        d.y = ry;
        container.addChild(d);
      }

      ry += 28;
    }

    const hint = createUiText(
      t('ui.iw.continue_hint', { key: actionKey(GameAction.ATTACK) }),
      { fontFamily: PIXEL_FONT, fontSize: 16, fill: TEXT_DELTA_NEUTRAL },
    );
    hint.x = Math.floor((W - hint.width) / 2);
    hint.y = H - 28;
    container.addChild(hint);

    container.x = x;
    container.y = y;
    this.game.legacyUIContainer.addChild(container);
    this.stratumClearPanel = { container, confirmed: false };
  }

  updateStratumClearPanel(confirmPressed: boolean): void {
    const panel = this.stratumClearPanel;
    if (!panel) return;
    if (!confirmPressed) return;

    panel.confirmed = true;
    if (panel.container.parent) panel.container.parent.removeChild(panel.container);
    panel.container.destroy({ children: true });
    this.stratumClearPanel = null;
  }

  hideWorldPrompts(prompts: PromptRefs): void {
    if (prompts.exitPrompt) prompts.exitPrompt.visible = false;
  }

  shouldSuppressWorldPrompts(options: PromptSuppressionOptions): boolean {
    return (
      this.bossChoiceVisible ||
      this.escapeConfirmVisible ||
      options.hasStratumClearPanel ||
      options.transitionState !== 'none'
    );
  }

  showEscapeConfirm(options: EscapeConfirmOptions): void {
    this.escapeConfirmVisible = true;
    this.hideWorldPrompts(options.prompts);

    const panel = createItemWorldLeaveConfirmPanel(options);

    // 사용자 결정 2026-05-25: 키 텍스트 [X]/[A/RT] 를 KeyPrompt 글리프 박스로 교체.
    //   v2: yes/no 양쪽 글리프 사이즈 통일 = 12 (CONTEXT 14 와 기존 10 의 중간).
    //   - 예    = ATTACK glyph + 라벨
    //   - 아니오 = JUMP glyph + "/" + DASH glyph + 라벨 (둘 다 활성)
    this.escapeConfirm = panel;
    this.game.legacyUIContainer.addChild(panel);
  }

  hideEscapeConfirm(): void {
    this.escapeConfirmVisible = false;
    if (this.escapeConfirm?.parent) {
      this.escapeConfirm.parent.removeChild(this.escapeConfirm);
    }
    this.escapeConfirm = null;
  }

  showBossChoice(options: BossChoiceOptions): void {
    this.hideBossChoice();

    const panelW = 220;
    const panelH = 84;
    const panel = new Container();

    const frame = options.hudSkin?.isLoaded ? create9SlicePanel(options.hudSkin, panelW, panelH) : null;
    if (frame) {
      panel.addChild(frame);
    } else {
      const bg = new Graphics();
      bg.rect(0, 0, panelW, panelH).fill({ color: MODAL_BG, alpha: 0.95 });
      bg.rect(0, 0, panelW, panelH).stroke({ color: MODAL_BORDER, width: 1 });
      panel.addChild(bg);
    }

    const title = createUiText(t('ui.iw.boss_defeated_title'), {
      fontFamily: PIXEL_FONT, fontSize: 8, fill: TEXT_BOSS_TITLE,
    });
    title.x = Math.floor((panelW - title.width) / 2);
    title.y = 8;
    panel.addChild(title);

    const info = createUiText(
      t('ui.iw.next_stratum', { n: options.nextStratumIndex + 1 }),
      { fontFamily: PIXEL_FONT, fontSize: 8, fill: TEXT_INFO },
    );
    info.x = Math.floor((panelW - info.width) / 2);
    info.y = 24;
    panel.addChild(info);

    const goPrompt = createUiText(
      t('ui.iw.boss_continue_continue', { key: actionKey(GameAction.ATTACK) }),
      { fontFamily: PIXEL_FONT, fontSize: 8, fill: TEXT_DELTA_POSITIVE },
    );
    goPrompt.x = Math.floor((panelW - goPrompt.width) / 2);
    goPrompt.y = 44;
    panel.addChild(goPrompt);

    const exitPrompt = createUiText(
      t('ui.iw.boss_continue_exit', { key: actionKey(GameAction.MENU) }),
      { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xffaa44 },
    );
    exitPrompt.x = Math.floor((panelW - exitPrompt.width) / 2);
    exitPrompt.y = 60;
    panel.addChild(exitPrompt);

    panel.x = Math.floor((GAME_WIDTH - panelW) / 2);
    panel.y = Math.floor((GAME_HEIGHT - panelH) / 2) - 20;

    this.bossChoicePanel = panel;
    this.bossChoiceVisible = true;
    this.game.legacyUIContainer.addChild(panel);
  }

  hideBossChoice(): void {
    if (this.bossChoicePanel) {
      if (this.bossChoicePanel.parent) this.bossChoicePanel.parent.removeChild(this.bossChoicePanel);
      this.bossChoicePanel.destroy({ children: true });
      this.bossChoicePanel = null;
    }
    this.bossChoiceVisible = false;
  }

  // ── Unified Stratum Clear Overlay ────────────────────────────────

  showStratumClearOverlay(data: StratumClearData): void {
    this.destroyStratumClearOverlay();
    this.stratumClearOverlay = new StratumClearOverlay(data, this.game.uiScale);
    this.game.uiContainer.addChild(this.stratumClearOverlay.container);
  }

  updateStratumClearOverlay(dt: number, attackPressed: boolean, menuPressed: boolean): void {
    if (!this.stratumClearOverlay) return;
    this.stratumClearOverlay.update(dt);
    this.stratumClearOverlay.handleInput(attackPressed, menuPressed);
  }

  getStratumClearChoice(): 'continue' | 'exit' | null {
    return this.stratumClearOverlay?.choice ?? null;
  }

  hasStratumClearOverlay(): boolean {
    return this.stratumClearOverlay !== null;
  }

  destroyStratumClearOverlayPublic(): void {
    this.destroyStratumClearOverlay();
  }

  private destroyStratumClearOverlay(): void {
    if (this.stratumClearOverlay) {
      if (this.stratumClearOverlay.container.parent) {
        this.stratumClearOverlay.container.parent.removeChild(this.stratumClearOverlay.container);
      }
      this.stratumClearOverlay.destroy();
      this.stratumClearOverlay = null;
    }
  }

  destroy(): void {
    this.hideEscapeConfirm();
    this.hideBossChoice();
    this.destroyOnboarding();
    this.destroyReturnResult();
    this.destroyStratumClearPanel();
    this.destroyStratumClearOverlay();
  }

  private showOnboardingStep(options: OnboardingOptions): void {
    if (this.onboardingPanel?.parent) {
      this.onboardingPanel.parent.removeChild(this.onboardingPanel);
    }

    if (this.onboardingStep >= options.messages.length) {
      this.onboardingPanel = null;
      this.onboardingDone = true;
      return;
    }

    const msg = options.messages[this.onboardingStep];
    const lines = msg.split('\n');

    const panelW = 280;
    const lineH = 12;
    const padY = 10;
    const padX = 14;
    const panelH = padY * 2 + lines.length * lineH + 16;

    const panel = new Container();
    const frame = options.hudSkin?.isLoaded ? create9SlicePanel(options.hudSkin, panelW, panelH) : null;
    if (frame) {
      panel.addChild(frame);
    } else {
      const bg = new Graphics();
      bg.rect(0, 0, panelW, panelH).fill({ color: 0x1a1a2e, alpha: 0.95 });
      bg.rect(0, 0, panelW, panelH).stroke({ color: 0x4a4a6a, width: 1 });
      panel.addChild(bg);
    }

    for (let i = 0; i < lines.length; i++) {
      const text = createUiText(lines[i], {
        fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xffffff,
      });
      text.x = padX;
      text.y = padY + i * lineH;
      panel.addChild(text);
    }

    const step = `${this.onboardingStep + 1}/${options.messages.length}`;
    const prompt = createUiText(
      t('ui.iw.next_step_hint', { key: actionKey(GameAction.ATTACK), step }),
      { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0x888888 },
    );
    prompt.x = padX;
    prompt.y = panelH - padY - 8;
    panel.addChild(prompt);

    panel.x = Math.floor((GAME_WIDTH - panelW) / 2);
    panel.y = Math.floor((GAME_HEIGHT - panelH) / 2) - 20;

    this.onboardingPanel = panel;
    this.game.legacyUIContainer.addChild(panel);
  }

  private destroyOnboarding(): void {
    if (this.onboardingPanel?.parent) {
      this.onboardingPanel.parent.removeChild(this.onboardingPanel);
    }
    this.onboardingPanel = null;
    this.onboardingDone = true;
  }

  private destroyReturnResult(): void {
    if (this.returnResult) {
      if (this.returnResult.container.parent) {
        this.returnResult.container.parent.removeChild(this.returnResult.container);
      }
      this.returnResult.container.destroy({ children: true });
      this.returnResult = null;
    }
  }

  private destroyStratumClearPanel(): void {
    if (this.stratumClearPanel) {
      if (this.stratumClearPanel.container.parent) {
        this.stratumClearPanel.container.parent.removeChild(this.stratumClearPanel.container);
      }
      this.stratumClearPanel.container.destroy({ children: true });
      this.stratumClearPanel = null;
    }
  }
}
