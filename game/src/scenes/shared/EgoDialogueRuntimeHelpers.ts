import type { LoreDisplay, LoreLine } from '@ui/LoreDisplay';

interface TryShowFlaggedEgoDialogueInput {
  active: boolean;
  flags: Set<string>;
  key: string;
  loreDisplay: LoreDisplay | null;
  lines: LoreLine[];
  freeze?: boolean;
}

export function tryShowFlaggedEgoDialogue(input: TryShowFlaggedEgoDialogueInput): boolean {
  if (!input.active) return false;
  if (input.flags.has(input.key)) return false;
  if (input.loreDisplay?.isActive) return false;
  input.flags.add(input.key);
  input.loreDisplay?.showDialogue(input.lines, input.freeze ?? false);
  return true;
}
