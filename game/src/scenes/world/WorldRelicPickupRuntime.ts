import { Graphics, type Container } from 'pixi.js';
import { GameAction } from '@core/InputManager';
import type { Player } from '@entities/Player';
import { HealthShard } from '@entities/HealthShard';
import type { RelicAuraBurstManager } from '@effects/RelicAuraBurst';
import type { ScreenFlash } from '@effects/ScreenFlash';
import type { LdtkLevel } from '@level/LdtkLoader';
import { t } from '@i18n';
import { trackRelicAcquire } from '@utils/Analytics';
import { setPersistedKey, getPersistedKey } from '@scenes/world/PickupMetadata';
import type { Game } from '../../Game';
import type { WorldAcquireOverlayRuntime } from './WorldAcquireOverlayRuntime';
import {
  addEntityToLayer,
  destroyAndClearEntities,
  removeEntityAt,
} from '@scenes/shared/EntityLifecycleHelpers';
import {
  destroyDisplayObject,
  destroyDisplayObjectAt,
} from '@scenes/shared/DisplayObjectLifecycleHelpers';
import {
  isPickupNearPlayer,
  isPointNearPlayer,
} from '@scenes/shared/PickupCollectionHelpers';

interface AbilityRelicMarker {
  gfx: Graphics;
  abilityName: string;
  relicKey: string;
}

interface WorldRelicPickupRuntimeDeps {
  game: Game;
  getPlayer: () => Player;
  getEntityLayer: () => Container;
  getRelicAuraBurst: () => RelicAuraBurstManager;
  getScreenFlash: () => ScreenFlash;
  getCurrentLevelId: () => string | undefined;
  getAcquireOverlayRuntime: () => WorldAcquireOverlayRuntime;
  addCollectedRelic: (key: string) => void;
  addHealthShardBonus: (amount: number) => void;
  updatePlayerAtk: () => void;
  showBigToast: (message: string, color: number) => void;
}

export class WorldRelicPickupRuntime {
  private readonly healthShards: HealthShard[] = [];
  private readonly abilityRelics: AbilityRelicMarker[] = [];

  constructor(private readonly deps: WorldRelicPickupRuntimeDeps) {}

  addHealthShard(shard: HealthShard): void {
    addEntityToLayer(this.healthShards, shard, this.deps.getEntityLayer(), { onlyAttachIfUnparented: true });
  }

  addAbilityRelic(x: number, y: number, abilityName: string, relicKey: string): void {
    const relic = new Graphics();
    relic.circle(0, 0, 8).fill({ color: 0xffd700, alpha: 0.8 });
    relic.circle(0, 0, 5).fill({ color: 0xffffff, alpha: 0.6 });
    relic.x = x;
    relic.y = y;
    this.deps.getEntityLayer().addChild(relic);
    this.abilityRelics.push({ gfx: relic, abilityName, relicKey });
  }

  loadLevel(level: LdtkLevel, collectedRelics: ReadonlySet<string>): void {
    this.clear();
    for (const entity of level.entities) {
      if (entity.type === 'HealthShard') {
        const key = `shard_${level.identifier}_${entity.px[0]}_${entity.px[1]}`;
        if (collectedRelics.has(key)) continue;
        const hpBonus = (entity.fields['HpBonus'] ?? entity.fields['hpBonus'] ?? 10) as number;
        const shard = new HealthShard(entity.px[0], entity.px[1], hpBonus);
        setPersistedKey(shard, key);
        this.addHealthShard(shard);
      } else if (entity.type === 'AbilityRelic') {
        const abilityName = (entity.fields['ability'] as string | undefined) ?? 'wallJump';
        const key = `relic_${level.identifier}_${entity.px[0]}_${entity.px[1]}`;
        if (!collectedRelics.has(key)) this.addAbilityRelic(entity.px[0], entity.px[1], abilityName, key);
      }
    }
  }

  clear(): void {
    destroyAndClearEntities(this.healthShards);
    for (const relic of this.abilityRelics) {
      destroyDisplayObject(relic.gfx);
    }
    this.abilityRelics.length = 0;
  }

  update(dtMs: number): void {
    this.updateHealthShards(dtMs);
    this.updateAbilityRelics();
  }

  private updateHealthShards(dtMs: number): void {
    const player = this.deps.getPlayer();
    for (let i = this.healthShards.length - 1; i >= 0; i--) {
      const shard = this.healthShards[i];
      if (shard.collected) continue;

      shard.update(dtMs);
      if (!isPickupNearPlayer(shard, player)) continue;

      const key = getPersistedKey(shard) ?? '';
      shard.collect();
      this.applyHealthShardReward(shard, key);
      removeEntityAt(this.healthShards, i);
    }
  }

  private updateAbilityRelics(): void {
    const player = this.deps.getPlayer();
    for (let i = this.abilityRelics.length - 1; i >= 0; i--) {
      const relic = this.abilityRelics[i];
      if (!isPointNearPlayer(relic.gfx, player)) continue;

      this.applyAbilityRelicReward(relic.abilityName, relic.relicKey);
      const relicTint = relic.abilityName === 'waterBreathing' ? 0x4488ff : 0xffd700;
      this.deps.getRelicAuraBurst().spawn(relic.gfx.x, relic.gfx.y, relicTint);
      destroyDisplayObjectAt(this.abilityRelics, i, item => item.gfx);
    }
  }

  private applyHealthShardReward(shard: HealthShard, key: string): void {
    if (key) this.deps.addCollectedRelic(key);
    this.deps.addHealthShardBonus(shard.hpBonus);
    this.deps.updatePlayerAtk();
    const player = this.deps.getPlayer();
    player.hp = player.maxHp;
    this.deps.game.hitstopFrames = 8;
    this.deps.getScreenFlash().flash(0xff4488, 0.4, 200);
    this.deps.game.camera.shake(4);
    this.deps.getAcquireOverlayRuntime().show({
      type: 'hp',
      name: t('ui.acquire.hp.name', { amount: shard.hpBonus }),
      description: t('ui.acquire.hp.description'),
    });
  }

  private applyAbilityRelicReward(abilityName: string, relicKey: string): void {
    this.deps.addCollectedRelic(relicKey);
    trackRelicAcquire(abilityName, this.deps.getCurrentLevelId());

    const player = this.deps.getPlayer();
    if (abilityName === 'dash') {
      player.abilities.dash = true;
      this.deps.getAcquireOverlayRuntime().show({
        type: 'relic', iconKey: 'dash',
        name: t('ui.acquire.relic.dash.name'),
        usage: t('ui.acquire.relic.dash.usage', { key: '{key}' }),
        keyAction: GameAction.DASH,
      });
    } else if (abilityName === 'diveAttack') {
      player.abilities.diveAttack = true;
      this.deps.getAcquireOverlayRuntime().show({
        type: 'relic', iconKey: 'diveAttack',
        name: t('ui.acquire.relic.diveAttack.name'),
        usage: t('ui.acquire.relic.diveAttack.usage', { key: '{key}' }),
        keyAction: GameAction.ATTACK,
      });
    } else if (abilityName === 'surge') {
      player.abilities.surge = true;
      this.deps.getAcquireOverlayRuntime().show({
        type: 'relic', iconKey: 'surge',
        name: t('ui.acquire.relic.surge.name'),
        usage: t('ui.acquire.relic.surge.usage', { key: '{key}' }),
        keyAction: GameAction.JUMP,
      });
    } else if (abilityName === 'waterBreathing') {
      player.abilities.waterBreathing = true;
      this.deps.getAcquireOverlayRuntime().show({
        type: 'relic', iconKey: 'waterBreathing',
        name: t('ui.acquire.relic.waterBreathing.name'),
        usage: t('ui.acquire.relic.waterBreathing.usage'),
        tint: 0x4488ff,
      });
    } else if (abilityName === 'wallJump') {
      player.abilities.wallJump = true;
      this.deps.getAcquireOverlayRuntime().show({
        type: 'relic', iconKey: 'wallJump',
        name: t('ui.acquire.relic.wallJump.name'),
        usage: t('ui.acquire.relic.wallJump.usage', { key: '{key}' }),
        keyAction: GameAction.JUMP,
      });
    } else if (abilityName === 'doubleJump') {
      player.abilities.doubleJump = true;
      this.deps.getAcquireOverlayRuntime().show({
        type: 'relic', iconKey: 'doubleJump',
        name: t('ui.acquire.relic.doubleJump.name'),
        usage: t('ui.acquire.relic.doubleJump.usage', { key: '{key}' }),
        keyAction: GameAction.JUMP,
      });
    } else if (abilityName === 'cheat') {
      player.abilities.cheat = true;
      this.deps.updatePlayerAtk();
      player.hp = player.maxHp;
      this.deps.showBigToast(t('toast.cheat_atk_hp'), 0xff00ff);
    }
    this.deps.game.hitstopFrames = 8;
    this.deps.game.camera.shake(3);
  }
}
