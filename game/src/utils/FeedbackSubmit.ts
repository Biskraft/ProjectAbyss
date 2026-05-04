/**
 * FeedbackSubmit — Sends F-key feedback to Google Form via fetch no-cors POST.
 *
 * Limitations of the no-cors approach:
 *   - Response cannot be read. Submission is treated as optimistically succeeded.
 *   - Network failures are silent. Latest 5 submissions are mirrored to
 *     localStorage so nothing is lost when the request fails outright.
 */

import {
  FORM_URL,
  FIELD_IDS,
  FEEDBACK_LIMITS,
  BACKUP_LS_KEY,
} from '../data/feedbackConfig';
import type { FeedbackContext } from './FeedbackContext';

export interface FeedbackPayload {
  text: string;
  category: 'bug' | 'idea' | 'other';
  context: FeedbackContext;
}

export async function submitFeedback(payload: FeedbackPayload): Promise<void> {
  const utmCombined = `${payload.context.utm_source ?? 'direct'}_${payload.context.utm_campaign ?? 'none'}`;

  const body = new URLSearchParams({
    [FIELD_IDS.text]: payload.text,
    [FIELD_IDS.category]: payload.category,
    [FIELD_IDS.context]: JSON.stringify(payload.context),
    [FIELD_IDS.runId]: payload.context.run_id,
    [FIELD_IDS.utm]: utmCombined,
  });

  // localStorage backup BEFORE the network call — if fetch throws synchronously
  // we still keep the data.
  backupLocally(payload);

  try {
    await fetch(FORM_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    // no-cors: response opaque. Caller assumes success.
  } catch {
    // Network failure. Backup already written above. Caller assumes success.
  }
}

function backupLocally(payload: FeedbackPayload): void {
  try {
    const raw = localStorage.getItem(BACKUP_LS_KEY) ?? '[]';
    const arr: Array<FeedbackPayload & { ts: number }> = JSON.parse(raw);
    arr.push({ ...payload, ts: Date.now() });
    while (arr.length > FEEDBACK_LIMITS.backupKeepCount) arr.shift();
    localStorage.setItem(BACKUP_LS_KEY, JSON.stringify(arr));
  } catch {
    // localStorage may be disabled (private mode). Swallow.
  }
}
