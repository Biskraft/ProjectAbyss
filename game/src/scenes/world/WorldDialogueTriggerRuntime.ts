import { Container } from 'pixi.js';
import { GameAction, actionKey } from '@core/InputManager';
import type { Player } from '@entities/Player';
import type { LdtkLevel } from '@level/LdtkLoader';
import { t } from '@i18n';
import { KeyPrompt } from '@ui/KeyPrompt';
import type { LoreDisplay, LoreLine } from '@ui/LoreDisplay';
import { GAME_HEIGHT, GAME_WIDTH, type Game } from '../../Game';

interface DialogueTrigger {
  x: number;
  y: number;
  w: number;
  h: number;
  lines: LoreLine[];
  triggerType: 'area' | 'interact';
  once: boolean;
  freezePlayer: boolean;
  eventName: string | null;
  active: boolean;
  fired: boolean;
  cooldown: number;
  prompt: Container | null;
}

interface WorldDialogueTriggerRuntimeDeps {
  game: Game;
  getPlayer: () => Player;
  getLoreDisplay: () => LoreDisplay | null;
  getUnlockedEvents: () => Set<string>;
}

const TRIGGER_W = 48;
const TRIGGER_H = 48;
const REPEAT_COOLDOWN_MS = 1000;

export class WorldDialogueTriggerRuntime {
  private triggers: DialogueTrigger[] = [];

  constructor(private readonly deps: WorldDialogueTriggerRuntimeDeps) {}

  loadLevel(level: LdtkLevel): void {
    this.clear();
    const unlockedEvents = this.deps.getUnlockedEvents();

    for (const ent of level.entities.filter(e => e.type === 'Dialogue')) {
      const text = (ent.fields['text'] ?? '') as string;
      if (!text) continue;
      const speaker = (ent.fields['speaker'] ?? undefined) as string | undefined;
      const portrait = (ent.fields['portrait'] ?? undefined) as string | undefined;
      const speakerColor = (ent.fields['speakerColor'] ?? undefined) as number | undefined;
      const triggerType = ((ent.fields['triggerType'] ?? 'area') as string) === 'interact' ? 'interact' as const : 'area' as const;
      const once = (ent.fields['once'] ?? true) as boolean;
      const autoCloseMs = (ent.fields['autoCloseMs'] ?? 0) as number;
      const eventName = (ent.fields['eventName'] ?? null) as string | null;
      const freezePlayer = (ent.fields['freezePlayer'] ?? true) as boolean;

      const eventKey = eventName ?? `dialogue_${level.identifier}_${ent.iid}`;
      if (once && unlockedEvents.has(eventKey)) continue;

      const line: LoreLine = {
        text,
        speaker,
        portrait,
        speakerColor,
        autoCloseMs: autoCloseMs > 0 ? autoCloseMs : undefined,
      };

      const trigger: DialogueTrigger = {
        x: ent.px[0] - TRIGGER_W / 2,
        y: ent.px[1] - TRIGGER_H,
        w: TRIGGER_W,
        h: TRIGGER_H,
        lines: [line],
        triggerType,
        once,
        freezePlayer,
        eventName: eventKey,
        active: false,
        fired: false,
        cooldown: 0,
        prompt: null,
      };

      if (triggerType === 'interact') {
        const prompt = KeyPrompt.createPrompt(actionKey(GameAction.ATTACK), t('prompt.talk'), this.deps.game.uiScale);
        prompt.visible = false;
        this.deps.game.uiContainer.addChild(prompt);
        trigger.prompt = prompt;
      }

      this.triggers.push(trigger);
    }

    for (const ent of level.entities.filter(e => e.type === 'Memory')) {
      const text = (ent.fields['text'] ?? '') as string;
      if (!text) continue;
      const speaker = (ent.fields['speaker'] ?? undefined) as string | undefined;
      const portrait = (ent.fields['portrait'] ?? undefined) as string | undefined;

      const eventKey = `memory_${level.identifier}_${ent.iid}`;
      if (unlockedEvents.has(eventKey)) continue;

      this.triggers.push({
        x: ent.px[0] - TRIGGER_W / 2,
        y: ent.px[1] - TRIGGER_H,
        w: TRIGGER_W,
        h: TRIGGER_H,
        lines: [{ text, speaker, portrait }],
        triggerType: 'area',
        once: true,
        freezePlayer: true,
        eventName: eventKey,
        active: false,
        fired: false,
        cooldown: 0,
        prompt: null,
      });
    }
  }

  update(dt: number): void {
    const loreDisplay = this.deps.getLoreDisplay();
    if (!loreDisplay) return;
    if (loreDisplay.isActive) {
      loreDisplay.update(dt);
      return;
    }

    const player = this.deps.getPlayer();
    const pcx = player.x + player.width / 2;
    const pcy = player.y + player.height / 2;
    const unlockedEvents = this.deps.getUnlockedEvents();

    for (const trigger of this.triggers) {
      if (trigger.fired) continue;
      if (trigger.cooldown > 0) {
        trigger.cooldown -= dt;
        continue;
      }
      const inside = pcx >= trigger.x && pcx < trigger.x + trigger.w
        && pcy >= trigger.y && pcy < trigger.y + trigger.h;

      if (trigger.triggerType === 'area') {
        if (inside && !trigger.active) {
          trigger.active = true;
          void loreDisplay.showDialogue(trigger.lines, trigger.freezePlayer);
          this.markTriggered(trigger, unlockedEvents);
          break;
        }
        if (!inside && trigger.active) trigger.active = false;
        continue;
      }

      this.updateInteractPrompt(trigger, inside);
      if (inside && this.deps.game.input.isJustPressed(GameAction.ATTACK)) {
        this.deps.game.input.consumeJustPressed(GameAction.ATTACK);
        void loreDisplay.showDialogue(trigger.lines, trigger.freezePlayer);
        this.markTriggered(trigger, unlockedEvents);
        break;
      }
    }
  }

  clear(): void {
    for (const trigger of this.triggers) {
      if (trigger.prompt?.parent) trigger.prompt.parent.removeChild(trigger.prompt);
    }
    this.triggers = [];
  }

  private markTriggered(trigger: DialogueTrigger, unlockedEvents: Set<string>): void {
    if (trigger.once) {
      trigger.fired = true;
      if (trigger.eventName) unlockedEvents.add(trigger.eventName);
      if (trigger.prompt?.parent) {
        trigger.prompt.parent.removeChild(trigger.prompt);
        trigger.prompt = null;
      }
    } else {
      trigger.cooldown = REPEAT_COOLDOWN_MS;
    }
  }

  private updateInteractPrompt(trigger: DialogueTrigger, inside: boolean): void {
    if (!trigger.prompt) return;
    trigger.prompt.visible = inside;
    if (!inside) return;

    const us = this.deps.game.uiScale;
    const cam = this.deps.game.camera;
    const sx = (trigger.x + trigger.w / 2 - cam.renderX + GAME_WIDTH / 2) * us - trigger.prompt.width / 2;
    const sy = (trigger.y - cam.renderY + GAME_HEIGHT / 2 - 16) * us;
    trigger.prompt.x = Math.round(sx);
    trigger.prompt.y = Math.round(sy);
  }
}
