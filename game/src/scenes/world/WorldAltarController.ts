import { Container } from 'pixi.js';
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
import type { Game } from '../../Game';
import { MODAL_BG, MODAL_BG_ALPHA } from '@ui/ModalPanel';
import type { ToastManager } from '@ui/Toast';
import { t } from '@i18n';
import {
  addEntityToLayer,
  destroyAndClearEntities,
} from '@scenes/shared/EntityLifecycleHelpers';
import { destroyDisplayObject } from '@scenes/shared/DisplayObjectLifecycleHelpers';
import { updateAltarInteractions } from '@scenes/shared/ProximityInteractionHelpers';
import { updateItemSelectionInput } from '@scenes/shared/ItemSelectionInputHelpers';
import {
  addAltarItemRows,
  createAltarItemSelectionShell,
} from '@scenes/shared/AltarItemSelectionUiHelpers';

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
      addEntityToLayer(this.altars, altar, this.deps.entityLayer);
    }
  }

  updateAltars(dt: number): void {
    updateAltarInteractions({
      altars: this.altars,
      actor: this.deps.player,
      dtMs: dt,
      isInteractPressed: () => this.deps.game.input.isJustPressed(GameAction.LOOK_UP),
      isSelectActive: () => this.selectActive,
      onOpen: (altar) => this.open(altar),
    });
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
    this.destroyUiContainer();
    this.deps.closeCyclePrompt();
  }

  drawAltarUI(): void {
    this.drawItemSelectUI(t('ui.world.offer_item'), 0xaaccff);
  }

  drawItemSelectUI(titleText: string, accentColor: number): void {
    this.destroyUiContainer();

    const inventory = this.deps.inventory();
    const items = inventory.items;
    const ui = createAltarItemSelectionShell({
      itemCount: items.length,
      titleText,
      titleFill: accentColor,
      backgroundFill: MODAL_BG,
      backgroundAlpha: MODAL_BG_ALPHA,
      borderFill: accentColor,
    });

    addAltarItemRows({
      container: ui.container,
      items,
      selectedIndex: this.selectIndex,
      equippedUid: inventory.equipped?.uid,
      x: ui.rowX,
      y: ui.rowY,
      rowHeight: ui.rowHeight,
      selectedFill: 0xffcc44,
      normalFill: 0xffffff,
    });

    this.ui = ui.container;
    this.deps.game.legacyUIContainer.addChild(ui.container);
  }

  updateInput(): void {
    updateItemSelectionInput({
      input: this.deps.game.input,
      items: this.deps.inventory().items,
      selectedIndex: this.selectIndex,
      setSelectedIndex: (index) => { this.selectIndex = index; },
      redraw: () => this.drawAltarUI(),
      onConfirm: (item) => {
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
      onEmptyConfirm: () => this.close(),
      onCancel: () => this.close(),
    });
  }

  clear(): void {
    destroyAndClearEntities(this.altars);
    this.close();
  }

  destroyUi(): void {
    this.destroyUiContainer();
    this.selectActive = false;
    this.activeAltar = null;
  }

  private destroyUiContainer(): void {
    if (!this.ui) return;
    destroyDisplayObject(this.ui, { children: true });
    this.ui = null;
  }

}
