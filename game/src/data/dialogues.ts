/**
 * dialogues.ts — Dialogue data types and MVP dialogue definitions.
 */

export interface DialogueLine {
  speaker?: string;
  speakerColor?: number;
  /** Portrait key — loads assets/portraits/{portrait}.png. Falls back to speaker name. */
  portrait?: string;
  text: string;
  autoCloseMs?: number;
}

export interface DialogueTrigger {
  id: string;
  type: 'area' | 'interact' | 'event' | 'auto';
  once: boolean;
  lines: DialogueLine[];
  /** Level this trigger belongs to (LDtk identifier). */
  levelId?: string;
  /** area trigger only */
  area?: { x: number; y: number; width: number; height: number };
  /** event trigger only */
  eventName?: string;
  /** If true, player input is blocked while dialogue is active. */
  freezePlayer?: boolean;
}

// ---------------------------------------------------------------------------
// MVP Dialogue Triggers
// ---------------------------------------------------------------------------

export const DIALOGUE_TRIGGERS: DialogueTrigger[] = [];
