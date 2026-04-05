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
  /** If true, player input is blocked while dialogue is active. */
  freezePlayer?: boolean;
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
  // // Screen 0 — auto monologue on game start
  // {
  //   id: 'intro_monologue',
  //   type: 'auto',
  //   once: true,
  //   lines: [
  //     { text: 'Another repair job...', autoCloseMs: 3000 },
  //     { text: 'Thirty enchantments, and rent is still due.', autoCloseMs: 3000 },
  //   ],
  // },

  // // Screen 4 — first slime kill monologue
  // {
  //   id: 'first_slime_kill',
  //   type: 'event',
  //   eventName: 'first_slime_kill',
  //   once: true,
  //   lines: [
  //     { text: 'Since when did these things start showing up in the woods...', autoCloseMs: 4000 },
  //   ],
  // },

  // // Screen 6 — first skeleton hit (player takes damage)
  // {
  //   id: 'first_skeleton_hit',
  //   type: 'event',
  //   eventName: 'first_skeleton_hit',
  //   once: true,
  //   lines: [
  //     { text: 'Ow. This one is nothing like a slime.', autoCloseMs: 3000 },
  //   ],
  // },

  // // Screen 6 — first skeleton kill
  // {
  //   id: 'first_skeleton_kill',
  //   type: 'event',
  //   eventName: 'first_skeleton_kill',
  //   once: true,
  //   lines: [
  //     { text: "Those joints shouldn't hold together like that...", autoCloseMs: 4000 },
  //   ],
  // },

  // // Screen 8 — first commission sword on anvil (freezePlayer)
  // {
  //   id: 'first_anvil_commission',
  //   type: 'event',
  //   eventName: 'first_anvil_commission',
  //   once: true,
  //   freezePlayer: true,
  //   lines: [
  //     { text: "Grade 3 steel... no, wait.", autoCloseMs: 2500 },
  //     { text: "This isn't grade 3. There's a deeper crystal structure.", autoCloseMs: 3000 },
  //     { text: "Who commissioned this for 30 coins?", autoCloseMs: 3000 },
  //     { text: "Echo, take a look.", autoCloseMs: 2500 },
  //   ],
  // },

  // // Screen 13 — first boss kill in item world
  // {
  //   id: 'first_boss_kill',
  //   type: 'event',
  //   eventName: 'first_boss_kill',
  //   once: true,
  //   lines: [
  //     { text: 'The sword got stronger.', autoCloseMs: 3000 },
  //     { text: 'Working on it from the inside actually raises the stats?', autoCloseMs: 4000 },
  //     { text: '...I could bill this as extra.', autoCloseMs: 3000 },
  //   ],
  // },

  // // Screen 10 — item world landing (first entry)
  // {
  //   id: 'first_itemworld_landing',
  //   type: 'event',
  //   eventName: 'first_itemworld_landing',
  //   once: true,
  //   lines: [
  //     { text: '...Where am I.', autoCloseMs: 3000 },
  //     { text: "The crystal structure on these walls... it's the same as that sword.", autoCloseMs: 4000 },
  //     { text: 'Am I really inside it?', autoCloseMs: 3000 },
  //   ],
  // },

  // // Screen 15 — forge return: check sword stats
  // {
  //   id: 'forge_return_check',
  //   type: 'event',
  //   eventName: 'forge_return_check',
  //   once: true,
  //   freezePlayer: true,
  //   lines: [
  //     { text: '...It actually went up.', autoCloseMs: 2500 },
  //     { text: 'What is this.', autoCloseMs: 2000 },
  //   ],
  // },

  // // Screen 15 — forge return: refusal
  // {
  //   id: 'forge_return_refusal',
  //   type: 'event',
  //   eventName: 'forge_return_refusal',
  //   once: true,
  //   freezePlayer: true,
  //   lines: [
  //     { text: 'This was just a repair job...', autoCloseMs: 2500 },
  //     { text: "That's enough for today.", autoCloseMs: 2500 },
  //   ],
  // },

  // // T-13: Screen 16 — Marta's note manifests after Echo is shelved
  // {
  //   id: 'screen16_marta_note',
  //   type: 'event',
  //   eventName: 'echo_shelved',
  //   once: true,
  //   lines: [
  //     { ...MARTA, text: '...', autoCloseMs: 2000 },
  //     { ...MARTA, text: 'Erda.' },
  //     { ...MARTA, text: 'If Echo rang for the first time, you can see this.' },
  //     { ...MARTA, text: "Don't be surprised. Echo was always that kind of hammer." },
  //     { ...MARTA, text: 'When you are ready, you can make it ring again.' },
  //     { ...MARTA, text: '— Marta' },
  //     { text: '...Master.' },
  //     { text: 'Disappeared ten years ago. Left nothing but this forge and Echo.' },
  //     { text: "Echo was always like that? Then Master, you also..." },
  //   ],
  // },

  // // T-12: Screen 17 — Sera silhouette after Marta's note
  // {
  //   id: 'screen17_sela_silhouette',
  //   type: 'event',
  //   eventName: 'marta_note_complete',
  //   once: true,
  //   lines: [
  //     { text: '...Who was that?', autoCloseMs: 3000 },
  //   ],
  // },

  // // After forge sequence — hint to leave
  // {
  //   id: 'forge_return_hint',
  //   type: 'event',
  //   eventName: 'forge_return_hint',
  //   once: true,
  //   lines: [
  //     { text: 'The commission is done. Time to head out.', autoCloseMs: 3000 },
  //   ],
  // },
];
