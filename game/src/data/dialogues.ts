/**
 * dialogues.ts — Dialogue data types and MVP dialogue definitions.
 */

export interface DialogueLine {
  speaker?: string;
  speakerColor?: number;
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
}

// Speaker color constants
const ERDA = undefined; // monologue — no speaker name shown
const IREN = { speaker: 'Iren Das', speakerColor: 0x88ccff };
const OREN = { speaker: 'Oren', speakerColor: 0xaaff88 };
const MARTA = { speaker: 'Marta', speakerColor: 0xcc88ff };

// ---------------------------------------------------------------------------
// MVP Dialogue Triggers
// ---------------------------------------------------------------------------

export const DIALOGUE_TRIGGERS: DialogueTrigger[] = [
  // Screen 0 — auto monologue on game start
  {
    id: 'intro_monologue',
    type: 'auto',
    once: true,
    levelId: 'World_Level_16',
    lines: [
      { text: 'Another repair job...', autoCloseMs: 3000 },
      { text: 'Thirty enchantments, and rent is still due.', autoCloseMs: 3000 },
    ],
  },
];
