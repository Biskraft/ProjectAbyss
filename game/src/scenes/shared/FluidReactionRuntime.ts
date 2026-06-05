import { TILE_ACID, TILE_METAL, TILE_WATER } from '@core/Physics';
import type { Enemy } from '@entities/Enemy';
import type { Player } from '@entities/Player';
import type { ThrowableContainer } from '@entities/ThrowableContainer';
import { FluidSystem, type ArcLink } from '@effects/FluidSystem';
import type { FluidResidueManager } from '@effects/FluidResidue';
import { PUFF_TINT_PLASMA, PUFF_TINT_TOXIC, type SteamPuffManager } from '@effects/SteamPuff';
import type { HitSparkManager } from '@effects/HitSpark';
import type { DamageNumberManager } from '@ui/DamageNumber';
import type { TileMutator } from '@systems/TileMutator';
import { getDistanceSquared } from './DistanceHelpers';

const TILE_SIZE = 16;

interface FluidReactionRuntimeDeps {
  getPlayer: () => Player;
  getEnemies: () => readonly Enemy<string>[];
  getContainers: () => readonly ThrowableContainer[];
  getCollisionGrid: () => number[][];
  getFluidSystem: () => FluidSystem;
  getFluidResidue: () => FluidResidueManager;
  getTileMutator: () => TileMutator;
  getSteamPuff: () => SteamPuffManager;
  getDamageNumbers: () => DamageNumberManager;
  getHitSparks: () => HitSparkManager;
  shakeCamera: (strength: number) => void;
}

export class FluidReactionRuntime {
  constructor(private readonly deps: FluidReactionRuntimeDeps) {}

  bind(): void {
    const fluidSystem = this.deps.getFluidSystem();
    const tileMutator = this.deps.getTileMutator();

    fluidSystem.onArcScanRequest = (originX, originY, radiusPx): ArcLink[] => (
      this.scanArcLinks(originX, originY, radiusPx)
    );
    fluidSystem.onArcDischarge = (_originX, _originY, links) => {
      this.applyArcDischarge(links);
    };
    fluidSystem.onEvaporated = (gx, gy, type) => {
      if (type !== 'oil' && type !== 'acid' && type !== 'magma') return;
      const px = (gx + 0.5) * TILE_SIZE;
      const py = (gy + 1) * TILE_SIZE;
      this.deps.getFluidResidue().dropAt(type, px, py, 1.0);
    };
    tileMutator.onSteamEvent = (gx, gy) => {
      const px = (gx + 0.5) * TILE_SIZE;
      const py = (gy + 0.5) * TILE_SIZE;
      this.deps.getSteamPuff().spawn(px, py, 1.0);
    };
    tileMutator.onSteamBurst = (gx, gy) => {
      const cx = (gx + 0.5) * TILE_SIZE;
      const cy = (gy + 0.5) * TILE_SIZE;
      const steamPuff = this.deps.getSteamPuff();
      steamPuff.spawn(cx, cy, 2.1);
      steamPuff.spawn(cx - 10, cy - 6, 1.6);
      steamPuff.spawn(cx + 10, cy - 6, 1.6);
      steamPuff.spawn(cx, cy - 18, 1.4, PUFF_TINT_PLASMA);
      this.deps.shakeCamera(4);
    };
    tileMutator.onElectricInsulated = (gx, gy) => {
      const px = (gx + 0.5) * TILE_SIZE;
      const py = (gy + 0.5) * TILE_SIZE;
      this.deps.getHitSparks().spawn(px, py, false, 0);
    };
    tileMutator.onElectricAcidPulse = (gx, gy) => {
      const px = (gx + 0.5) * TILE_SIZE;
      const py = (gy + 0.5) * TILE_SIZE;
      this.deps.getSteamPuff().spawn(px, py, 0.8, PUFF_TINT_TOXIC);
    };
    tileMutator.onAcidSteamBurst = (gx, gy) => {
      this.applyAcidSteamBurst(gx, gy);
    };
  }

  private scanArcLinks(originX: number, originY: number, radiusPx: number): ArcLink[] {
    const links: ArcLink[] = [];
    const r2 = radiusPx * radiusPx;
    const player = this.deps.getPlayer();
    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;
    if (getDistanceSquared(px, py, originX, originY) < r2) {
      links.push({ worldX: px, worldY: py, kind: 'entity', ref: player });
    }

    for (const enemy of this.deps.getEnemies()) {
      if (!enemy.alive) continue;
      const ex = enemy.x + enemy.width / 2;
      const ey = enemy.y + enemy.height / 2;
      if (getDistanceSquared(ex, ey, originX, originY) < r2) {
        links.push({ worldX: ex, worldY: ey, kind: 'entity', ref: enemy });
      }
    }

    for (const container of this.deps.getContainers()) {
      if (container.destroyed || container.held) continue;
      if (container.kind !== 'MetalCrate') continue;
      const ccx = container.colX + container.colW / 2;
      const ccy = container.colY + container.colH / 2;
      if (getDistanceSquared(ccx, ccy, originX, originY) < r2) {
        links.push({ worldX: ccx, worldY: ccy, kind: 'container', ref: container });
      }
    }

    this.scanArcCells(links, originX, originY, radiusPx, r2);
    if (links.length > 6) {
      links.sort((a, b) => {
        const da = getDistanceSquared(a.worldX, a.worldY, originX, originY);
        const db = getDistanceSquared(b.worldX, b.worldY, originX, originY);
        return da - db;
      });
      links.length = 6;
    }
    return links;
  }

  private scanArcCells(
    links: ArcLink[],
    originX: number,
    originY: number,
    radiusPx: number,
    radiusSquared: number,
  ): void {
    const ogx = Math.floor(originX / TILE_SIZE);
    const ogy = Math.floor(originY / TILE_SIZE);
    const radCells = Math.ceil(radiusPx / TILE_SIZE) + 1;
    const grid = this.deps.getCollisionGrid();
    for (let dy = -radCells; dy <= radCells; dy++) {
      for (let dx = -radCells; dx <= radCells; dx++) {
        if (dx === 0 && dy === 0) continue;
        const gx = ogx + dx;
        const gy = ogy + dy;
        if (gy < 0 || gy >= grid.length) continue;
        const row = grid[gy];
        if (!row || gx < 0 || gx >= row.length) continue;
        const tile = row[gx];
        if (tile !== TILE_WATER && tile !== TILE_METAL && tile !== TILE_ACID) continue;
        const cx = (gx + 0.5) * TILE_SIZE;
        const cy = (gy + 0.5) * TILE_SIZE;
        if (getDistanceSquared(cx, cy, originX, originY) > radiusSquared) continue;
        links.push({
          worldX: cx,
          worldY: cy,
          kind: tile === TILE_WATER ? 'fluid' : 'cell',
          ref: { gx, gy, tile },
        });
      }
    }
  }

  private applyArcDischarge(links: ArcLink[]): void {
    if (links.length === 0) return;
    this.deps.shakeCamera(3);
    for (const link of links) {
      if (link.kind === 'entity') {
        const ent = link.ref as { hp: number; maxHp: number; chargedStateMs?: number; alive?: boolean };
        if (!ent) continue;
        if (ent.alive === false) continue;
        const dmg = Math.max(1, Math.floor(ent.maxHp * FluidSystem.ARC_DAMAGE_PCT));
        ent.hp = Math.max(0, ent.hp - dmg);
        ent.chargedStateMs = Math.max(ent.chargedStateMs ?? 0, FluidSystem.ARC_CHARGED_BUFF_MS);
        this.deps.getDamageNumbers().spawn(link.worldX, link.worldY - 8, dmg, false);
      } else if (link.kind === 'container') {
        const container = link.ref as { electricChargedMs?: number };
        if (container) {
          container.electricChargedMs = Math.max(
            container.electricChargedMs ?? 0,
            FluidSystem.ARC_CHARGED_BUFF_MS,
          );
        }
      } else if (link.kind === 'fluid' || link.kind === 'cell') {
        const cellRef = link.ref as { gx: number; gy: number } | undefined;
        if (cellRef) {
          this.deps.getTileMutator().applyThunderChain(
            this.deps.getCollisionGrid(),
            cellRef.gx,
            cellRef.gy,
          );
        }
      }
    }
  }

  private applyAcidSteamBurst(gx: number, gy: number): void {
    const cx = (gx + 0.5) * TILE_SIZE;
    const cy = (gy + 0.5) * TILE_SIZE;
    const steamBaseY = (gy + 1) * TILE_SIZE;
    this.deps.getSteamPuff().spawn(cx, steamBaseY - 12, 1.1, PUFF_TINT_TOXIC);
    this.deps.shakeCamera(2);
    const radiusX = 24;
    const radiusY = 64;
    const inSteamBurst = (x: number, y: number): boolean => {
      const dx = (x - cx) / radiusX;
      const dy = (y - cy) / radiusY;
      return dx * dx + dy * dy < 1;
    };

    const player = this.deps.getPlayer();
    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;
    if (inSteamBurst(px, py)) {
      const dmg = Math.max(1, Math.floor(player.maxHp * 0.05));
      player.hp = Math.max(0, player.hp - dmg);
      player.burnRemainingMs = Math.max(player.burnRemainingMs ?? 0, 5000);
      player.vy = Math.min(player.getVy(), -220);
    }

    for (const enemy of this.deps.getEnemies()) {
      if (!enemy.alive) continue;
      const ex = enemy.x + enemy.width / 2;
      const ey = enemy.y + enemy.height / 2;
      if (inSteamBurst(ex, ey)) {
        const dmg = Math.max(1, Math.floor(enemy.maxHp * 0.05));
        enemy.hp -= dmg;
        enemy.burnRemainingMs = Math.max(enemy.burnRemainingMs ?? 0, 5000);
        enemy.onHit(0, -260, 120);
        this.deps.getDamageNumbers().spawn(ex, enemy.y - 8, dmg, false);
      }
    }

    for (const container of this.deps.getContainers()) {
      if (container.destroyed || container.held) continue;
      const ccx = container.colX + container.colW / 2;
      const ccy = container.colY + container.colH / 2;
      if (inSteamBurst(ccx, ccy)) {
        container.applySteamLift(3000);
      }
    }
  }
}

