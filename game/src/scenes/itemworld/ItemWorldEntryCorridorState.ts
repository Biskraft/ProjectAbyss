export class ItemWorldEntryCorridorState {
  active = false;
  bottomExitY = 0;
  private dialoguePending = false;

  activate(bottomExitY: number): void {
    this.active = true;
    this.bottomExitY = bottomExitY;
    this.dialoguePending = false;
  }

  requestDialogueAfterCompletion(): void {
    if (!this.active) return;
    this.dialoguePending = true;
  }

  consumeDialogueAfterCompletion(): boolean {
    if (!this.dialoguePending) return false;
    this.dialoguePending = false;
    return true;
  }

  complete(): void {
    this.active = false;
    this.bottomExitY = 0;
  }

  reset(): void {
    this.active = false;
    this.bottomExitY = 0;
    this.dialoguePending = false;
  }
}
