/**
 * feedbackConfig.ts — Google Form endpoint + entry IDs for F-key feedback.
 *
 * Form fields are LOCKED — do not delete/re-add fields in the form editor,
 * or entry IDs will rotate and submissions will silently fail.
 */

export const FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSeoLXi7J3swafAExN3RvlzMjOI4EEF96f0fQvqkSx9uvPe5vg/formResponse';

export const FIELD_IDS = {
  text:     'entry.102695891',
  category: 'entry.1045525568',
  context:  'entry.49140280',
  runId:    'entry.1606689676',
  utm:      'entry.1521658925',
} as const;

export const FEEDBACK_LIMITS = {
  maxTextLength: 500,
  warningTextLength: 480,
  cooldownMs: 30_000,
  toastSentMs: 1200,
  toastWaitMs: 800,
  backupKeepCount: 5,
} as const;

export const BACKUP_LS_KEY = 'echoris_feedback_backup';
export const UTM_LS_KEY = 'echoris_utm';
