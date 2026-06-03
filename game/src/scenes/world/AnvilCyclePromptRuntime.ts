import { BitmapText, Container, Graphics } from 'pixi.js';
import { GameAction, actionKey } from '@core/InputManager';
import type { ItemInstance } from '@items/ItemInstance';
import { getDisplayName, resetItemForNextCycle } from '@items/ItemInstance';
import { t } from '@i18n';
import { MODAL_BG, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_WARNING, FONT_HINT } from '@ui/ModalPanel';
import { PIXEL_FONT } from '@ui/fonts';
import { GAME_HEIGHT, GAME_WIDTH, type Game } from '../../Game';

interface AnvilCyclePromptRuntimeDeps {
  game: Game;
  showToast: (message: string, color: number) => void;
  placeItem: (item: ItemInstance) => void;
  refreshAnvilInventory: () => void;
  reopenAltarSelect: () => void;
  isAnvilInventoryOpen: () => boolean;
}

export class AnvilCyclePromptRuntime {
  private activeItem: ItemInstance | null = null;
  private ui: Container | null = null;

  constructor(private readonly deps: AnvilCyclePromptRuntimeDeps) {}

  get hasActivePrompt(): boolean {
    return this.activeItem !== null;
  }

  open(item: ItemInstance): void {
    this.close();
    this.activeItem = item;

    const ui = new Container();
    const panelW = 220;
    const panelH = 80;
    const px = Math.floor((GAME_WIDTH - panelW) / 2);
    const py = Math.floor((GAME_HEIGHT - panelH) / 2);

    const bg = new Graphics();
    bg.rect(0, 0, panelW, panelH).fill({ color: MODAL_BG, alpha: 0.96 });
    bg.rect(0, 0, panelW, panelH).stroke({ color: 0xff8844, width: 1 });
    bg.x = px;
    bg.y = py;
    ui.addChild(bg);

    const title = new BitmapText({
      text: t('ui.cycle.already_echoed'),
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xff8844 },
    });
    title.x = px + 8;
    title.y = py + 6;
    ui.addChild(title);

    const nextCycle = (item.worldProgress?.cycle ?? 0) + 1;
    const lines = [
      `${getDisplayName(item)}`,
      '',
      t('ui.cycle.dive_again_prompt'),
      t('ui.cycle.enemies_sharper'),
      '',
      t('ui.cycle.label', { n: nextCycle }),
      '',
      `[${actionKey(GameAction.ATTACK)}] ${t('ui.cycle.dive_action')}   [${actionKey(GameAction.MENU)}] ${t('ui.cycle.cancel_action')}`,
    ];
    for (let i = 0; i < lines.length; i++) {
      const fill = i === 0 ? TEXT_WARNING : i === lines.length - 1 ? TEXT_SECONDARY : TEXT_PRIMARY;
      const tx = new BitmapText({
        text: lines[i],
        style: { fontFamily: PIXEL_FONT, fontSize: FONT_HINT, fill },
      });
      tx.x = px + 8;
      tx.y = py + 18 + i * 8;
      ui.addChild(tx);
    }

    this.ui = ui;
    this.deps.game.legacyUIContainer.addChild(ui);
  }

  close(): void {
    this.activeItem = null;
    if (!this.ui) return;
    this.ui.parent?.removeChild(this.ui);
    this.ui.destroy({ children: true });
    this.ui = null;
  }

  updateInput(): void {
    const item = this.activeItem;
    if (!item) return;
    const input = this.deps.game.input;

    if (input.isJustPressed(GameAction.ATTACK)) {
      resetItemForNextCycle(item);
      this.close();
      this.deps.showToast(t('toast.cycle_rewind', { n: item.worldProgress?.cycle ?? 0 }), 0xff8844);
      this.deps.placeItem(item);
      return;
    }

    if (input.isJustPressed(GameAction.MENU)) {
      this.close();
      if (this.deps.isAnvilInventoryOpen()) {
        this.deps.refreshAnvilInventory();
      } else {
        this.deps.reopenAltarSelect();
      }
    }
  }

  destroy(): void {
    this.close();
  }
}
