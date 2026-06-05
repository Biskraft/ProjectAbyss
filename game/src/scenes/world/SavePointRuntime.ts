import { Assets, Graphics, Sprite, type Container, type Texture } from 'pixi.js';
import type { Game } from '../../Game';
import type { Player } from '@entities/Player';
import type { SavepointPulseManager } from '@effects/SavepointPulse';
import {
  snapPlayerToNearestSavePoint,
  updateSavePointProximity,
  type SavePointEntry,
} from '@systems/SavePointInteraction';
import type { LdtkLevel } from '@level/LdtkLoader';
import { GameAction, actionKey } from '@core/InputManager';
import { KeyPrompt } from '@ui/KeyPrompt';
import { assetPath } from '@core/AssetLoader';
import { t } from '@i18n';
import {
  detachDisplayObject,
  detachNullableDisplayObject,
  hideDisplayObject,
} from '@scenes/shared/DisplayObjectLifecycleHelpers';

export type { SavePointEntry } from '@systems/SavePointInteraction';

const SAVE_INTERACT_DELAY_MS = 500;

interface SavePointRuntimeDeps {
  game: Game;
  getPlayer: () => Player;
  savepointPulse: SavepointPulseManager;
  onSave: () => void;
}

export class SavePointRuntime {
  private savePoints: SavePointEntry[] = [];
  private saveHintShown = false;
  private saveQueued = false;
  private saveDelayTimer = 0;

  constructor(private readonly deps: SavePointRuntimeDeps) {}

  get hasAny(): boolean {
    return this.savePoints.length > 0;
  }

  get isSaveQueued(): boolean {
    return this.saveQueued;
  }

  add(entry: SavePointEntry): void {
    this.savePoints.push(entry);
  }

  has(entry: SavePointEntry): boolean {
    return this.savePoints.includes(entry);
  }

  loadLevel(level: LdtkLevel, entityLayer: Container): void {
    this.clear();
    for (const entity of level.entities) {
      if (entity.type !== 'GameSaver') continue;
      this.addFromEntity(entity, entityLayer);
    }
  }

  isPlayerNear(range = 32): boolean {
    const player = this.deps.getPlayer();
    const pcx = player.x + player.width / 2;
    const pcy = player.y + player.height / 2;
    return this.savePoints.some(sp => Math.abs(pcx - sp.x) < range && Math.abs(pcy - sp.y) < range);
  }

  updateProximity(suppressed: boolean): void {
    if (suppressed) {
      this.hideForItemDeployment();
      return;
    }

    const result = updateSavePointProximity({
      game: this.deps.game,
      player: this.deps.getPlayer(),
      savePoints: this.savePoints,
      savepointPulse: this.deps.savepointPulse,
      saveHintShown: this.saveHintShown,
    });
    this.saveHintShown = result.saveHintShown;
  }

  hideForItemDeployment(): void {
    this.saveHintShown = false;
    this.deps.savepointPulse.clear();
    for (const sp of this.savePoints) {
      sp.gfx.alpha = 0.6;
      if (sp.sprite) sp.sprite.alpha = 1.0;
      hideDisplayObject(sp.prompt);
    }
  }

  snapPlayerToNearest(): void {
    snapPlayerToNearestSavePoint(this.deps.getPlayer(), this.savePoints, this.deps.game);
  }

  queueSave(): void {
    if (this.saveQueued) return;
    this.saveQueued = true;
    this.saveDelayTimer = SAVE_INTERACT_DELAY_MS;
  }

  updateQueuedSave(deltaMS: number): void {
    if (!this.saveQueued) return;
    this.saveDelayTimer -= deltaMS;
    if (this.saveDelayTimer > 0) return;

    this.saveQueued = false;
    this.saveDelayTimer = 0;
    this.deps.onSave();
  }

  pulseNearest(): void {
    const closest = this.findClosestToPlayer();
    if (closest) this.deps.savepointPulse.pulse(closest.x, closest.y);
  }

  clear(): void {
    this.saveHintShown = false;
    this.saveQueued = false;
    this.saveDelayTimer = 0;
    this.deps.savepointPulse.clear();
    for (const sp of this.savePoints) {
      detachDisplayObject(sp.gfx);
      detachNullableDisplayObject(sp.sprite);
      detachNullableDisplayObject(sp.prompt);
    }
    this.savePoints = [];
  }

  private findClosestToPlayer(): SavePointEntry | null {
    if (this.savePoints.length === 0) return null;
    const player = this.deps.getPlayer();
    const pcx = player.x + player.width / 2;
    let closest = this.savePoints[0];
    let bestDist = Infinity;
    for (const sp of this.savePoints) {
      const dist = Math.abs(sp.x - pcx);
      if (dist < bestDist) {
        bestDist = dist;
        closest = sp;
      }
    }
    return closest;
  }

  private addFromEntity(entity: LdtkLevel['entities'][number], entityLayer: Container): void {
    const x = entity.px[0] + entity.width / 2;
    const y = entity.px[1] - entity.height / 2;
    const floorY = entity.px[1];
    const marker = new Graphics();
    marker.rect(-12, -12, 24, 24).fill({ color: 0x2244cc, alpha: 0.85 });
    marker.rect(-12, -12, 24, 24).stroke({ color: 0x3366ff, width: 2 });
    marker.moveTo(0, -7).lineTo(7, 0).lineTo(0, 7).lineTo(-7, 0).closePath()
      .fill({ color: 0x88aaff, alpha: 0.5 });
    marker.x = x;
    marker.y = y;
    entityLayer.addChild(marker);

    const prompt = KeyPrompt.createPrompt(
      actionKey(GameAction.ATTACK),
      t('prompt.save'),
      this.deps.game.uiScale,
    );
    prompt.visible = false;
    this.deps.game.uiContainer.addChild(prompt);

    const entry: SavePointEntry = { x, y, gfx: marker, prompt };
    this.add(entry);

    Assets.load<Texture>(assetPath('assets/sprites/save_point_01.png'))
      .then((texture) => {
        if (!texture) return;
        if (!this.has(entry)) return;
        if (!marker.parent) return;
        texture.source.scaleMode = 'nearest';
        const sprite = new Sprite(texture);
        sprite.anchor.set(0.5, 1);
        sprite.x = x;
        sprite.y = floorY;
        entityLayer.addChild(sprite);
        entry.sprite = sprite;
        marker.visible = false;
      })
      .catch(() => { /* sprite missing: keep placeholder marker */ });
  }
}
