import { BitmapText, Container, Graphics } from 'pixi.js';
import { create9SlicePanel } from '@ui/ModalPanel';
import { PIXEL_FONT } from '@ui/fonts';
import type { UISkin } from '@ui/UISkin';
import { ReturnHint } from '@ui/ReturnHint';
import { ReturnResult, type DiveResult } from '@ui/ReturnResult';
import { GameAction, actionKey } from '@core/InputManager';
import type { Game } from '../../Game';
import { GAME_WIDTH, GAME_HEIGHT } from '../../Game';

interface PromptRefs {
  exitPrompt: Container | null;
  altarHint: Container | null;
}

interface EscapeConfirmOptions {
  hudSkin: UISkin | null;
  fromAltar: boolean;
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
  private escapeConfirmFromAltar = false;
  private bossChoicePanel: Container | null = null;
  private bossChoiceVisible = false;
  private returnHint: ReturnHint | null = null;
  private onboardingPanel: Container | null = null;
  private onboardingStep = 0;
  private onboardingDone = true;
  private returnResult: ReturnResult | null = null;
  private stratumClearPanel: { container: Container; confirmed: boolean } | null = null;

  constructor(private readonly game: Game) {}

  isEscapeConfirmVisible(): boolean {
    return this.escapeConfirmVisible;
  }

  isEscapeConfirmFromAltar(): boolean {
    return this.escapeConfirmFromAltar;
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
    this.returnResult = new ReturnResult(hudSkin);
    this.returnResult.onDismiss = onDismiss;
    this.game.legacyUIContainer.addChild(this.returnResult.container);
  }

  createReturnHint(): void {
    this.destroyReturnHint();
    this.returnHint = new ReturnHint();
    this.game.uiContainer.addChild(this.returnHint.container);
    this.returnHint.show();
  }

  updateReturnHint(dt: number): void {
    this.returnHint?.update(dt);
  }

  updateReturnResult(dt: number): void {
    this.returnResult?.update(dt);
  }

  confirmReturnResult(): void {
    this.returnResult?.confirm();
  }

  showReturnResult(result: DiveResult, onDismiss: () => void): boolean {
    if (!this.returnResult) return false;
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
      bg.rect(0, 0, W, H).fill({ color: 0x1a1a2e, alpha: 0.96 });
      bg.rect(0, 0, W, H).stroke({ color: 0x4a4a6a, width: 1 });
      container.addChild(bg);
    }

    const title = new BitmapText({
      text: autoConfirmed ? 'STRATUM CLEARED' : 'PROGRESS BANKED',
      style: { fontFamily: PIXEL_FONT, fontSize: 16, fill: 0xffd35a },
    });
    title.x = Math.floor((W - title.width) / 2);
    title.y = 12;
    container.addChild(title);

    const rows: Array<[string, number, number]> = [
      ['ATK', snapshot.beforeAtk, snapshot.afterAtk],
      ['Item Lv', snapshot.beforeLevel, snapshot.afterLevel],
      ['Innocents', snapshot.beforeInnocents, snapshot.afterInnocents],
    ];

    let ry = 48;
    for (const [label, before, after] of rows) {
      const delta = after - before;
      const hasDelta = delta !== 0;
      const deltaColor = delta > 0 ? 0x88ff88 : delta < 0 ? 0xff8888 : 0x888899;

      const lbl = new BitmapText({ text: label, style: { fontFamily: PIXEL_FONT, fontSize: 16, fill: 0xbbbbcc } });
      lbl.x = 20;
      lbl.y = ry;
      container.addChild(lbl);

      const bef = new BitmapText({ text: String(before), style: { fontFamily: PIXEL_FONT, fontSize: 16, fill: 0x888899 } });
      bef.x = 120;
      bef.y = ry;
      container.addChild(bef);

      const arrow = new BitmapText({ text: '→', style: { fontFamily: PIXEL_FONT, fontSize: 16, fill: 0x888899 } });
      arrow.x = 160;
      arrow.y = ry;
      container.addChild(arrow);

      const aft = new BitmapText({
        text: String(after),
        style: { fontFamily: PIXEL_FONT, fontSize: 16, fill: hasDelta ? 0xffffff : 0x888899 },
      });
      aft.x = 196;
      aft.y = ry;
      container.addChild(aft);

      if (hasDelta) {
        const d = new BitmapText({
          text: `${delta > 0 ? '+' : ''}${delta}`,
          style: { fontFamily: PIXEL_FONT, fontSize: 16, fill: deltaColor },
        });
        d.x = 244;
        d.y = ry;
        container.addChild(d);
      }

      ry += 28;
    }

    const hint = new BitmapText({
      text: `[${actionKey(GameAction.ATTACK)}] CONTINUE`,
      style: { fontFamily: PIXEL_FONT, fontSize: 16, fill: 0x888899 },
    });
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
    if (prompts.altarHint) prompts.altarHint.visible = false;
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
    this.escapeConfirmFromAltar = options.fromAltar;
    this.hideWorldPrompts(options.prompts);

    const panelW = 260;
    const panelH = 72;
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

    const titleText = options.fromAltar ? 'Use Escape Altar?' : 'Leave Item World?';
    const title = new BitmapText({ text: titleText, style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xffffff } });
    title.x = 12;
    title.y = 6;
    panel.addChild(title);

    const expInfo = new BitmapText({
      text: `${options.itemName} Lv${options.itemLevel}  EXP: ${options.itemExp}/${options.expPerLevel}`,
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0x88ccff },
    });
    expInfo.x = 12;
    expInfo.y = 20;
    panel.addChild(expInfo);

    const floorInfo = new BitmapText({
      text: `Rooms ${options.roomsCleared}/${options.totalRooms}  +${options.earnedExp} EXP  +${options.earnedGold} G`,
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xaaaaaa },
    });
    floorInfo.x = 12;
    floorInfo.y = 33;
    panel.addChild(floorInfo);

    const controls = new BitmapText({
      text: `[${actionKey(GameAction.ATTACK)}] Yes   [${actionKey(GameAction.JUMP)}/${actionKey(GameAction.DASH)}] No`,
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xaaaaaa },
    });
    controls.x = 12;
    controls.y = 48;
    panel.addChild(controls);

    panel.x = Math.floor((GAME_WIDTH - panelW) / 2);
    panel.y = Math.floor((GAME_HEIGHT - panelH) / 2);

    this.escapeConfirm = panel;
    this.game.legacyUIContainer.addChild(panel);
  }

  hideEscapeConfirm(): void {
    this.escapeConfirmVisible = false;
    this.escapeConfirmFromAltar = false;
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
      bg.rect(0, 0, panelW, panelH).fill({ color: 0x1a1a2e, alpha: 0.95 });
      bg.rect(0, 0, panelW, panelH).stroke({ color: 0x4a4a6a, width: 1 });
      panel.addChild(bg);
    }

    const title = new BitmapText({
      text: 'BOSS DEFEATED',
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xffcc66 },
    });
    title.x = Math.floor((panelW - title.width) / 2);
    title.y = 8;
    panel.addChild(title);

    const info = new BitmapText({
      text: `Next: Stratum ${options.nextStratumIndex + 1}`,
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xcccccc },
    });
    info.x = Math.floor((panelW - info.width) / 2);
    info.y = 24;
    panel.addChild(info);

    const goPrompt = new BitmapText({
      text: `[${actionKey(GameAction.ATTACK)}] Continue Deeper`,
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0x88ff88 },
    });
    goPrompt.x = Math.floor((panelW - goPrompt.width) / 2);
    goPrompt.y = 44;
    panel.addChild(goPrompt);

    const exitPrompt = new BitmapText({
      text: `[${actionKey(GameAction.MENU)}] Exit Safely`,
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xffaa44 },
    });
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

  destroy(): void {
    this.hideEscapeConfirm();
    this.hideBossChoice();
    this.destroyReturnHint();
    this.destroyOnboarding();
    this.destroyReturnResult();
    this.destroyStratumClearPanel();
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
      const text = new BitmapText({
        text: lines[i],
        style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xffffff },
      });
      text.x = padX;
      text.y = padY + i * lineH;
      panel.addChild(text);
    }

    const step = `${this.onboardingStep + 1}/${options.messages.length}`;
    const prompt = new BitmapText({
      text: `[${actionKey(GameAction.ATTACK)}] Next  ${step}`,
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0x888888 },
    });
    prompt.x = padX;
    prompt.y = panelH - padY - 8;
    panel.addChild(prompt);

    panel.x = Math.floor((GAME_WIDTH - panelW) / 2);
    panel.y = Math.floor((GAME_HEIGHT - panelH) / 2) - 20;

    this.onboardingPanel = panel;
    this.game.legacyUIContainer.addChild(panel);
  }

  private destroyReturnHint(): void {
    if (this.returnHint) {
      this.returnHint.destroy();
      this.returnHint = null;
    }
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
