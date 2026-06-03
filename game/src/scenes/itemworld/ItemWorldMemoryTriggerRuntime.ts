import { Container, Graphics } from 'pixi.js';
import type { LdtkEntity } from '@level/LdtkLoader';
import type { Player } from '@entities/Player';
import type { LoreDisplay } from '@ui/LoreDisplay';

interface MemoryTriggerParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  gfx: Graphics;
}

interface ItemWorldMemoryTrigger {
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  speaker?: string;
  portrait?: string;
  active: boolean;
  anchorY: number;
  container: Container;
  shardGfx: Graphics;
  glowGfx: Graphics;
  particles: MemoryTriggerParticle[];
  spawnTimer: number;
  pulseTimer: number;
  bobTimer: number;
}

interface ItemWorldMemoryTriggerRuntimeDeps {
  getEntityLayer: () => Container;
  getPlayer: () => Player;
  getLoreDisplay: () => LoreDisplay | null;
}

export class ItemWorldMemoryTriggerRuntime {
  private triggers: ItemWorldMemoryTrigger[] = [];

  constructor(private readonly deps: ItemWorldMemoryTriggerRuntimeDeps) {}

  spawnFromEntity(entity: LdtkEntity, offX: number, offY: number): boolean {
    const text = (entity.fields['text'] as string) ?? '';
    if (!text) return false;

    const speaker = (entity.fields['speaker'] as string) || undefined;
    const portrait = (entity.fields['portrait'] as string) || undefined;
    const anchorX = offX + entity.px[0] + entity.width / 2;
    const anchorY = offY + entity.px[1] - entity.height / 2;

    const shardContainer = new Container();
    shardContainer.x = anchorX;
    shardContainer.y = anchorY;

    const glowGfx = new Graphics();
    glowGfx.circle(0, 0, 24).fill({ color: 0xff8000, alpha: 0.22 });
    glowGfx.circle(0, 0, 14).fill({ color: 0xffaa33, alpha: 0.35 });
    shardContainer.addChild(glowGfx);

    const shardGfx = new Graphics();
    shardGfx.poly([0, -11, 11, 0, 0, 11, -11, 0]).fill({ color: 0xff8000 });
    shardGfx.poly([0, -11, 11, 0, 0, 11, -11, 0]).stroke({ color: 0xffcc66, width: 1 });
    shardGfx.poly([0, -6, 6, 0, 0, 6, -6, 0]).fill({ color: 0xffe6b3, alpha: 0.85 });
    shardGfx.poly([0, -2, 2, 0, 0, 2, -2, 0]).fill({ color: 0xffffff });
    shardContainer.addChild(shardGfx);

    this.deps.getEntityLayer().addChild(shardContainer);
    this.triggers.push({
      x: anchorX - 20,
      y: anchorY - 20,
      w: 40,
      h: 40,
      text,
      speaker,
      portrait,
      active: false,
      anchorY,
      container: shardContainer,
      shardGfx,
      glowGfx,
      particles: [],
      spawnTimer: Math.random() * 300,
      pulseTimer: Math.random() * 2000,
      bobTimer: Math.random() * 3000,
    });
    return true;
  }

  update(dtMs = 16): void {
    this.updateVisuals(dtMs);
    this.updateDialogueTrigger();
  }

  clear(): void {
    for (const trigger of this.triggers) {
      for (const particle of trigger.particles) {
        if (particle.gfx.parent) particle.gfx.parent.removeChild(particle.gfx);
      }
      trigger.particles = [];
      if (trigger.container.parent) trigger.container.parent.removeChild(trigger.container);
    }
    this.triggers = [];
  }

  private updateVisuals(dtMs: number): void {
    for (const trigger of this.triggers) {
      trigger.bobTimer += dtMs;
      const bobOffset = Math.sin(trigger.bobTimer * 0.0025) * 2;
      trigger.container.y = trigger.anchorY + bobOffset;

      trigger.pulseTimer += dtMs;
      const pulse = Math.sin(trigger.pulseTimer * 0.004);
      const scale = 1.0 + pulse * 0.18;
      trigger.shardGfx.scale.set(scale);
      trigger.shardGfx.rotation = Math.sin(trigger.pulseTimer * 0.002) * 0.08;
      trigger.glowGfx.alpha = 0.7 + pulse * 0.3;

      trigger.spawnTimer -= dtMs;
      if (trigger.spawnTimer <= 0) {
        trigger.spawnTimer = 400;
        this.spawnParticles(trigger);
      }

      this.updateParticles(trigger, dtMs);
    }
  }

  private spawnParticles(trigger: ItemWorldMemoryTrigger): void {
    for (let i = 0; i < 3; i++) {
      const gfx = new Graphics();
      const size = 1 + Math.random() * 1.5;
      gfx.rect(-size / 2, -size / 2, size, size)
        .fill({ color: i % 2 === 0 ? 0xff8000 : 0xffcc66 });
      const px = (Math.random() - 0.5) * 16;
      const py = 4 + Math.random() * 4;
      gfx.x = px;
      gfx.y = py;
      trigger.container.addChild(gfx);
      const maxLife = 900 + Math.random() * 500;
      trigger.particles.push({
        x: px,
        y: py,
        vx: (Math.random() - 0.5) * 20,
        vy: -(20 + Math.random() * 20),
        life: maxLife,
        maxLife,
        gfx,
      });
    }
  }

  private updateParticles(trigger: ItemWorldMemoryTrigger, dtMs: number): void {
    for (let i = trigger.particles.length - 1; i >= 0; i--) {
      const particle = trigger.particles[i];
      particle.life -= dtMs;
      particle.x += particle.vx * (dtMs / 1000) + Math.sin(particle.life * 0.01) * 0.3;
      particle.y += particle.vy * (dtMs / 1000);
      particle.gfx.x = particle.x;
      particle.gfx.y = particle.y;
      particle.gfx.alpha = Math.max(0, particle.life / particle.maxLife) * 0.9;
      if (particle.life <= 0) {
        if (particle.gfx.parent) particle.gfx.parent.removeChild(particle.gfx);
        trigger.particles.splice(i, 1);
      }
    }
  }

  private updateDialogueTrigger(): void {
    const loreDisplay = this.deps.getLoreDisplay();
    if (!loreDisplay || loreDisplay.isActive) return;

    const player = this.deps.getPlayer();
    const pcx = player.x + player.width / 2;
    const pcy = player.y + player.height / 2;
    for (const trigger of this.triggers) {
      const inside = pcx >= trigger.x
        && pcx < trigger.x + trigger.w
        && pcy >= trigger.y
        && pcy < trigger.y + trigger.h;
      if (inside && !trigger.active) {
        trigger.active = true;
        loreDisplay.showDialogue([{
          text: trigger.text,
          speaker: trigger.speaker,
          portrait: trigger.portrait,
        }], false);
        break;
      }
      if (!inside && trigger.active) {
        trigger.active = false;
      }
    }
  }
}
