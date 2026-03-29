/**
 * DialogueManager.ts — Manages dialogue triggers and the DialogueBox UI.
 *
 * Checks area triggers each frame, fires event triggers on demand,
 * and tracks which one-time triggers have already played.
 */

import { DialogueBox } from '@ui/DialogueBox';
import { type DialogueTrigger, type DialogueLine, DIALOGUE_TRIGGERS } from '@data/dialogues';
import type { LdtkEntity } from '@level/LdtkLoader';
import type { InputManager } from '@core/InputManager';
import type { Container } from 'pixi.js';

export class DialogueManager {
  readonly box: DialogueBox;
  private firedTriggers: Set<string> = new Set();
  private triggers: DialogueTrigger[];

  constructor(input: InputManager, uiParent: Container) {
    this.box = new DialogueBox(input);
    uiParent.addChild(this.box.container);
    this.triggers = [...DIALOGUE_TRIGGERS];
  }

  /**
   * Register dialogue triggers from LDtk Dialogue entities.
   *
   * LDtk entity fields:
   *   - text (String)       : dialogue text, use "|" to separate multiple lines
   *   - speaker (String)    : speaker name (empty = monologue)
   *   - speakerColor (String): hex color e.g. "0x88ccff" (optional)
   *   - triggerType (String) : "area" | "auto" | "event" (default: "area")
   *   - once (Bool)         : true = play only once (default: true)
   *   - autoCloseMs (Int)   : auto-close delay for monologue (default: 0 = manual)
   *   - eventName (String)  : for event triggers
   *
   * The entity's px/width/height define the area trigger bounds.
   */
  registerLdtkDialogues(entities: LdtkEntity[], levelId: string): void {
    const dialogueEnts = entities.filter(e => e.type === 'Dialogue');
    for (const ent of dialogueEnts) {
      const rawText = (ent.fields['text'] as string) ?? '';
      if (!rawText) continue;

      const speaker = (ent.fields['speaker'] as string) || undefined;
      const rawColor = ent.fields['speakerColor'] as string | undefined;
      const speakerColor = rawColor ? parseInt(rawColor, 16) || undefined : undefined;
      const triggerType = (ent.fields['triggerType'] as string ?? 'area') as DialogueTrigger['type'];
      const once = (ent.fields['once'] as boolean) ?? true;
      const autoCloseMs = (ent.fields['autoCloseMs'] as number) || undefined;
      const eventName = (ent.fields['eventName'] as string) || undefined;

      // Split text by "|" for multi-line dialogues
      const textLines = rawText.split('|').map(s => s.trim()).filter(Boolean);
      const lines: DialogueLine[] = textLines.map(text => ({
        text,
        speaker,
        speakerColor,
        autoCloseMs,
      }));

      const id = `ldtk:${levelId}:${ent.px[0]},${ent.px[1]}`;

      // Skip if already registered (e.g., re-entering same level)
      if (this.triggers.some(t => t.id === id)) continue;

      this.triggers.push({
        id,
        type: triggerType,
        once,
        lines,
        levelId,
        area: triggerType === 'area' ? {
          x: ent.px[0] - ent.width / 2,
          y: ent.px[1] - ent.height / 2,
          width: ent.width,
          height: ent.height,
        } : undefined,
        eventName,
      });
    }
  }

  /** True if dialogue is currently being displayed. */
  isActive(): boolean {
    return this.box.isActive;
  }

  /** True if the current dialogue blocks player movement. */
  blocksMovement(): boolean {
    return this.box.blocksMovement;
  }

  /** Must be called every frame. */
  update(dt: number): void {
    this.box.update(dt);
  }

  /** Check area triggers against current player position. */
  checkAreaTriggers(playerX: number, playerY: number, levelId: string): void {
    if (this.box.isActive) return;

    for (const trigger of this.triggers) {
      if (trigger.type !== 'area') continue;
      if (trigger.levelId && trigger.levelId !== levelId) continue;
      if (trigger.once && this.firedTriggers.has(trigger.id)) continue;
      if (!trigger.area) continue;

      const a = trigger.area;
      if (playerX >= a.x && playerX < a.x + a.width &&
          playerY >= a.y && playerY < a.y + a.height) {
        this.fire(trigger);
        return;
      }
    }
  }

  /** Check and fire auto triggers for a level (call once on level load). */
  checkAutoTriggers(levelId: string): void {
    if (this.box.isActive) return;

    for (const trigger of this.triggers) {
      if (trigger.type !== 'auto') continue;
      if (trigger.levelId && trigger.levelId !== levelId) continue;
      if (trigger.once && this.firedTriggers.has(trigger.id)) continue;
      this.fire(trigger);
      return; // one at a time
    }
  }

  /** Fire a named event trigger (e.g., 'boss_clear'). */
  async fireEvent(eventName: string): Promise<void> {
    if (this.box.isActive) return;

    for (const trigger of this.triggers) {
      if (trigger.type !== 'event') continue;
      if (trigger.eventName !== eventName) continue;
      if (trigger.once && this.firedTriggers.has(trigger.id)) continue;
      await this.fire(trigger);
      return;
    }
  }

  /** Start an NPC interaction dialogue by trigger ID. */
  async startInteraction(triggerId: string): Promise<void> {
    if (this.box.isActive) return;

    const trigger = this.triggers.find(
      t => t.type === 'interact' && t.id === triggerId,
    );
    if (!trigger) return;
    if (trigger.once && this.firedTriggers.has(trigger.id)) return;
    await this.fire(trigger);
  }

  /** Clean up (call on scene exit). */
  destroy(): void {
    this.box.close();
    if (this.box.container.parent) {
      this.box.container.parent.removeChild(this.box.container);
    }
  }

  private fire(trigger: DialogueTrigger): Promise<void> {
    if (trigger.once) this.firedTriggers.add(trigger.id);
    return this.box.showDialogue(trigger.lines);
  }
}
