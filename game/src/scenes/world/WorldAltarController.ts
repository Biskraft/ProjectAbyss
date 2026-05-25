import { BitmapText, Container, Graphics } from 'pixi.js';
import { Altar } from '@entities/Altar';
import { GameAction } from '@core/InputManager';
import type { LdtkLevel } from '@level/LdtkLoader';
import type { Player } from '@entities/Player';
import type { Inventory } from '@items/Inventory';
import {
  DEMO_BLOCK_REDIVE,
  getDisplayName,
  isItemFullyCleared,
  type ItemInstance,
} from '@items/ItemInstance';
import { STARTER_ONLY_IDS } from '@data/weapons';
import { GAME_HEIGHT, GAME_WIDTH, type Game } from '../../Game';
import { MODAL_BG, MODAL_BG_ALPHA } from '@ui/ModalPanel';
import { PIXEL_FONT } from '@ui/fonts';
import type { ToastManager } from '@ui/Toast';
import { t } from '@i18n';

interface WorldAltarControllerDeps {
  game: Game;
  player: Player;
  inventory: () => Inventory;
  toast: ToastManager;
  entityLayer: Container;
  spawnPortal: (x: number, y: number, rarity: ItemInstance['rarity'], sourceType: 'altar', item: ItemInstance) => void;
  closeCyclePrompt: () => void;
}

export class WorldAltarController {
  private altars: Altar[] = [];
  private selectActive = false;
  private selectIndex = 0;
  private activeAltar: Altar | null = null;
  private ui: Container | null = null;

  constructor(private readonly deps: WorldAltarControllerDeps) {}

  get isSelectActive(): boolean {
    return this.selectActive;
  }

  spawnFromLdtk(level: LdtkLevel): void {
    const altarEnts = level.entities.filter(e => e.type === 'Altar');
    for (const ent of altarEnts) {
      const altar = new Altar(ent.px[0], ent.px[1]);
      this.altars.push(altar);
      this.deps.entityLayer.addChild(altar.container);
    }
  }

  updateAltars(dt: number): void {
    const player = this.deps.player;
    for (const altar of this.altars) {
      altar.update(dt);

      if (altar.used) {
        altar.setShowHint(false);
        continue;
      }

      const near = altar.overlaps(
        player.x - 8,
        player.y - 8,
        player.width + 16,
        player.height + 16,
      );
      altar.setShowHint(near);

      if (altar.overlaps(player.x, player.y, player.width, player.height)) {
        if (this.deps.game.input.isJustPressed(GameAction.LOOK_UP) && !this.selectActive) {
          this.open(altar);
          return;
        }
      }
    }
  }

  open(altar: Altar): void {
    if (this.deps.inventory().items.length === 0) {
      this.deps.toast.show(t('toast.no_items_to_offer'), 0xff4444);
      return;
    }
    this.selectActive = true;
    this.selectIndex = 0;
    this.activeAltar = altar;
    this.drawAltarUI();
  }

  close(): void {
    this.selectActive = false;
    this.activeAltar = null;
    if (this.ui) {
      if (this.ui.parent) this.ui.parent.removeChild(this.ui);
      this.ui.destroy({ children: true });
      this.ui = null;
    }
    this.deps.closeCyclePrompt();
  }

  drawAltarUI(): void {
    this.drawItemSelectUI('Offer item to altar:', 0xaaccff);
  }

  drawItemSelectUI(titleText: string, accentColor: number): void {
    if (this.ui) {
      if (this.ui.parent) this.ui.parent.removeChild(this.ui);
      this.ui.destroy({ children: true });
      this.ui = null;
    }

    const inventory = this.deps.inventory();
    const items = inventory.items;
    const ui = new Container();

    const bg = new Graphics();
    const panelW = 260;
    const panelH = 20 + items.length * 12;
    const px = Math.floor((GAME_WIDTH - panelW) / 2);
    const py = Math.floor((GAME_HEIGHT - panelH) / 2);
    bg.rect(0, 0, panelW, panelH).fill({ color: MODAL_BG, alpha: MODAL_BG_ALPHA });
    bg.rect(0, 0, panelW, panelH).stroke({ color: accentColor, width: 1 });
    bg.x = px;
    bg.y = py;
    ui.addChild(bg);

    const title = new BitmapText({
      text: titleText,
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: accentColor },
    });
    title.x = px + 6;
    title.y = py + 4;
    ui.addChild(title);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const selected = i === this.selectIndex;
      const prefix = selected ? '> ' : '  ';
      const equipped = inventory.equipped?.uid === item.uid ? t('ui.altar.equipped_suffix') : '';
      const label = `${prefix}${t('ui.altar.item_row', { name: getDisplayName(item), level: item.level, rarity: item.rarity.toUpperCase(), equipped })}`;
      const txt = new BitmapText({
        text: label,
        style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: selected ? 0xffcc44 : 0xffffff },
      });
      txt.x = px + 6;
      txt.y = py + 16 + i * 12;
      ui.addChild(txt);
    }

    this.ui = ui;
    this.deps.game.legacyUIContainer.addChild(ui);
  }

  updateInput(): void {
    this.updateItemSelectInput(
      (item) => {
        if (STARTER_ONLY_IDS.has(item.def.id)) {
          this.deps.toast.show(t('toast.cannot_dive_broken'), 0xff4444);
          return;
        }
        if (DEMO_BLOCK_REDIVE && isItemFullyCleared(item)) {
          this.deps.toast.show(t('toast.memory_exhausted'), 0xff8844);
          this.close();
          return;
        }
        if (this.activeAltar) {
          const altar = this.activeAltar;
          altar.used = true;
          this.close();
          this.deps.spawnPortal(altar.x, altar.y - 20, item.rarity, 'altar', item);
        } else {
          this.close();
        }
      },
      () => this.drawAltarUI(),
    );
  }

  clear(): void {
    for (const a of this.altars) a.destroy();
    this.altars = [];
    this.close();
  }

  destroyUi(): void {
    if (this.ui?.parent) this.ui.parent.removeChild(this.ui);
    this.ui?.destroy({ children: true });
    this.ui = null;
    this.selectActive = false;
    this.activeAltar = null;
  }

  private updateItemSelectInput(
    onConfirm: (item: ItemInstance) => void,
    redrawFn: () => void,
  ): void {
    const input = this.deps.game.input;
    const items = this.deps.inventory().items;

    if (input.isJustPressed(GameAction.LOOK_UP)) {
      this.selectIndex = Math.max(0, this.selectIndex - 1);
      redrawFn();
      return;
    }
    if (input.isJustPressed(GameAction.LOOK_DOWN)) {
      this.selectIndex = Math.min(items.length - 1, this.selectIndex + 1);
      redrawFn();
      return;
    }
    if (input.isJustPressed(GameAction.ATTACK) || input.isJustPressed(GameAction.JUMP)) {
      const item = items[this.selectIndex];
      if (item) {
        onConfirm(item);
      } else {
        this.close();
      }
      return;
    }
    if (input.isJustPressed(GameAction.MENU) || input.isJustPressed(GameAction.DASH)) {
      this.close();
    }
  }
}
