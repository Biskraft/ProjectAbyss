export class ItemWorldExitTelemetryState {
  private exitTracked = false;

  markExitTracked(): void {
    this.exitTracked = true;
  }

  tryMarkExitTracked(): boolean {
    if (this.exitTracked) return false;
    this.exitTracked = true;
    return true;
  }
}
