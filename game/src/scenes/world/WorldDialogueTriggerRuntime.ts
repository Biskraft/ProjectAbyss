import { Container } from 'pixi.js';
import { GameAction, actionKey } from '@core/InputManager';
import type { Player } from '@entities/Player';
import type { LdtkLevel } from '@level/LdtkLoader';
import { t } from '@i18n';
import { KeyPrompt } from '@ui/KeyPrompt';
import type { LoreDisplay, LoreLine } from '@ui/LoreDisplay';
import { NPC } from '@entities/NPC';
import { GAME_HEIGHT, GAME_WIDTH, type Game } from '../../Game';

/** Normalise a LDtk text field (Array<String> or String) to a list of non-empty locale keys. */
function toKeyList(field: unknown): string[] {
  if (Array.isArray(field)) return field.filter((x): x is string => typeof x === 'string' && x.length > 0);
  if (typeof field === 'string' && field.length > 0) return [field];
  return [];
}

/**
 * Build one LoreLine per text column (key). Each key resolves via t() (unknown
 * keys fall back to the literal string). `speaker`/`portrait`/`speakerColor`
 * apply to every page; the player advances pages with the interact key
 * (handled by LoreDisplay). autoCloseMs, if set, applies to the last page only.
 */
function buildDialogueLines(
  textField: unknown,
  speakerKey: string | undefined,
  portrait: string | undefined,
  speakerColor: number | undefined,
  autoCloseMs: number,
): LoreLine[] {
  const keys = toKeyList(textField);
  const speaker = speakerKey ? t(speakerKey) : undefined;
  const last = keys.length - 1;
  return keys.map((key, i) => ({
    text: t(key),
    speaker,
    portrait,
    speakerColor,
    autoCloseMs: autoCloseMs > 0 && i === last ? autoCloseMs : undefined,
  }));
}

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
  /** Set for NPC triggers — the speaker turns to face the player during talk. */
  npc: NPC | null;
}

interface WorldDialogueTriggerRuntimeDeps {
  game: Game;
  getPlayer: () => Player;
  getLoreDisplay: () => LoreDisplay | null;
  getUnlockedEvents: () => Set<string>;
  getEntityLayer: () => Container;
}

const TRIGGER_W = 48;
const TRIGGER_H = 48;
const REPEAT_COOLDOWN_MS = 1000;

export class WorldDialogueTriggerRuntime {
  private triggers: DialogueTrigger[] = [];
  private npcs: NPC[] = [];

  constructor(private readonly deps: WorldDialogueTriggerRuntimeDeps) {}

  loadLevel(level: LdtkLevel): void {
    this.clear();
    const unlockedEvents = this.deps.getUnlockedEvents();

    // LDtk `text` is Array<String> — each column is a locale KEY (e.g.
    // `dialogue.area.01`) yielding one dialogue page; the player advances pages
    // with the interact key. `speaker` is also a key. Unknown keys fall back to
    // the literal string (t() returns the key), so raw-text entries still show.
    for (const ent of level.entities.filter(e => e.type === 'Dialogue')) {
      const lines = buildDialogueLines(
        ent.fields['text'],
        (ent.fields['speaker'] ?? undefined) as string | undefined,
        (ent.fields['portrait'] ?? undefined) as string | undefined,
        (ent.fields['speakerColor'] ?? undefined) as number | undefined,
        (ent.fields['autoCloseMs'] ?? 0) as number,
      );
      if (lines.length === 0) continue;
      const triggerType = ((ent.fields['triggerType'] ?? 'area') as string) === 'interact' ? 'interact' as const : 'area' as const;
      const once = (ent.fields['once'] ?? true) as boolean;
      const eventName = (ent.fields['eventName'] ?? null) as string | null;
      const freezePlayer = (ent.fields['freezePlayer'] ?? true) as boolean;

      const eventKey = eventName ?? `dialogue_${level.identifier}_${ent.iid}`;
      if (once && unlockedEvents.has(eventKey)) continue;

      const trigger: DialogueTrigger = {
        x: ent.px[0] - TRIGGER_W / 2,
        y: ent.px[1] - TRIGGER_H,
        w: TRIGGER_W,
        h: TRIGGER_H,
        lines,
        triggerType,
        once,
        freezePlayer,
        eventName: eventKey,
        active: false,
        fired: false,
        cooldown: 0,
        prompt: null,
        npc: null,
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
      const lines = buildDialogueLines(
        ent.fields['text'],
        (ent.fields['speaker'] ?? undefined) as string | undefined,
        (ent.fields['portrait'] ?? undefined) as string | undefined,
        undefined,
        0,
      );
      if (lines.length === 0) continue;

      const eventKey = `memory_${level.identifier}_${ent.iid}`;
      if (unlockedEvents.has(eventKey)) continue;

      this.triggers.push({
        x: ent.px[0] - TRIGGER_W / 2,
        y: ent.px[1] - TRIGGER_H,
        w: TRIGGER_W,
        h: TRIGGER_H,
        lines,
        triggerType: 'area',
        once: true,
        freezePlayer: true,
        eventName: eventKey,
        active: false,
        fired: false,
        cooldown: 0,
        prompt: null,
        npc: null,
      });
    }

    this.loadNpcs(level, unlockedEvents);
  }

  /**
   * NPC entities: a visible, idle-animated character (bottom-left pivot) that
   * carries the full Dialogue feature — multi-page `text` columns advanced by
   * the interact key, plus once / event / freeze. The `character` field picks
   * the sprite (`assets/characters/<character>_atlas`). The sprite always
   * spawns; the dialogue trigger is gated by once.
   *
   * NPCs are ALWAYS interact-type (never area) — the player must press the
   * interact key — and show the `[key] 대화` (t('prompt.talk')) glyph above the
   * head while in range.
   */
  private loadNpcs(level: LdtkLevel, unlockedEvents: Set<string>): void {
    for (const ent of level.entities.filter(e => e.type === 'NPC')) {
      const character = (ent.fields['character'] ?? '') as string;
      const npc = new NPC(ent.px[0], ent.px[1], character);
      npc.setBaseFlip((ent.fields['flipX'] ?? false) as boolean);
      this.deps.getEntityLayer().addChild(npc.container);
      this.npcs.push(npc);

      const lines = buildDialogueLines(
        ent.fields['text'],
        (ent.fields['speaker'] ?? undefined) as string | undefined,
        (ent.fields['portrait'] ?? undefined) as string | undefined,
        (ent.fields['speakerColor'] ?? undefined) as number | undefined,
        (ent.fields['autoCloseMs'] ?? 0) as number,
      );
      if (lines.length === 0) continue; // sprite-only NPC (no dialogue)

      const once = (ent.fields['once'] ?? true) as boolean;
      const eventName = (ent.fields['eventName'] ?? null) as string | null;
      const freezePlayer = (ent.fields['freezePlayer'] ?? true) as boolean;
      const eventKey = eventName ?? `npc_${level.identifier}_${ent.iid}`;
      if (once && unlockedEvents.has(eventKey)) continue;

      // Bottom-left pivot → shift the trigger box to the body center (~16px).
      const centerX = ent.px[0] + 16;
      // NPCs are always interact-type — show the [key] 대화 glyph above the head.
      const prompt = KeyPrompt.createPrompt(actionKey(GameAction.ATTACK), t('prompt.talk'), this.deps.game.uiScale);
      prompt.visible = false;
      this.deps.game.uiContainer.addChild(prompt);

      this.triggers.push({
        x: centerX - TRIGGER_W / 2,
        y: ent.px[1] - TRIGGER_H,
        w: TRIGGER_W,
        h: TRIGGER_H,
        lines,
        triggerType: 'interact',
        once,
        freezePlayer,
        eventName: eventKey,
        active: false,
        fired: false,
        cooldown: 0,
        prompt,
        npc,
      });
    }
  }

  update(dt: number): void {
    // Idle animations run regardless of dialogue state.
    for (const npc of this.npcs) npc.update(dt);

    const loreDisplay = this.deps.getLoreDisplay();
    if (!loreDisplay) return;
    if (loreDisplay.isActive) {
      // Dialogue is open — the interact key advances it, so suppress the
      // player's attack for this frame.
      this.deps.game.input.markInteractionPrompt();
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
          this.startDialogue(loreDisplay, trigger, pcx);
          this.markTriggered(trigger, unlockedEvents);
          break;
        }
        if (!inside && trigger.active) trigger.active = false;
        continue;
      }

      this.updateInteractPrompt(trigger, inside);
      if (inside && this.deps.game.input.isJustPressed(GameAction.ATTACK)) {
        this.deps.game.input.consumeJustPressed(GameAction.ATTACK);
        this.startDialogue(loreDisplay, trigger, pcx);
        this.markTriggered(trigger, unlockedEvents);
        break;
      }
    }

    // Buffer signal: while an interact prompt is on screen, the player ignores
    // its ATTACK press (so pressing the key talks instead of swinging).
    if (this.triggers.some(t => t.prompt?.visible === true)) {
      this.deps.game.input.markInteractionPrompt();
    }
  }

  /**
   * Open the dialogue. For NPC triggers the speaker turns to face the player
   * (flip when the player is on the NPC's -x side) for the duration of the
   * conversation, then restores its LDtk facing when the dialogue closes.
   */
  private startDialogue(loreDisplay: LoreDisplay, trigger: DialogueTrigger, playerCenterX: number): void {
    const npc = trigger.npc;
    if (!npc) {
      void loreDisplay.showDialogue(trigger.lines, trigger.freezePlayer);
      return;
    }
    npc.faceTowards(playerCenterX);
    void loreDisplay.showDialogue(trigger.lines, trigger.freezePlayer).then(() => npc.restoreFlip());
  }

  clear(): void {
    for (const trigger of this.triggers) {
      if (trigger.prompt?.parent) trigger.prompt.parent.removeChild(trigger.prompt);
    }
    this.triggers = [];
    for (const npc of this.npcs) npc.destroy();
    this.npcs = [];
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
