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

  // T-13: Screen 16 — Marta's note manifests after Echo is shelved
  {
    id: 'screen16_marta_note',
    type: 'event',
    eventName: 'echo_shelved',
    once: true,
    lines: [
      { ...MARTA, text: '...', autoCloseMs: 2000 },
      { ...MARTA, text: 'Erda.' },
      { ...MARTA, text: 'If Echo rang for the first time, you can see this.' },
      { ...MARTA, text: "Don't be surprised. Echo was always that kind of hammer." },
      { ...MARTA, text: 'When you are ready, you can make it ring again.' },
      { ...MARTA, text: '— Marta' },
      { text: '...Master.' },
      { text: 'Disappeared ten years ago. Left nothing but this forge and Echo.' },
      { text: "Echo was always like that? Then Master, you also..." },
    ],
  },

  // T-12: Screen 17 — Sera silhouette after Marta's note
  {
    id: 'screen17_sela_silhouette',
    type: 'event',
    eventName: 'marta_note_complete',
    once: true,
    lines: [
      { text: '...Who was that?', autoCloseMs: 3000 },
    ],
  },
];
