export class ItemWorldFlowState {
  private state: 'none' | 'exit_fade' | 'post_clear_hold' = 'none';

  get isExitFade(): boolean {
    return this.state === 'exit_fade';
  }

  get isPostClearHold(): boolean {
    return this.state === 'post_clear_hold';
  }

  startExitFade(): void {
    this.state = 'exit_fade';
  }

  startPostClearHold(): void {
    this.state = 'post_clear_hold';
  }

  reset(): void {
    this.state = 'none';
  }
}
