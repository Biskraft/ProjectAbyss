export type ItemWorldFlowTransitionState = 'none' | 'exit_fade' | 'post_clear_hold';

export class ItemWorldFlowState {
  private state: ItemWorldFlowTransitionState = 'none';

  get value(): ItemWorldFlowTransitionState {
    return this.state;
  }

  get isActive(): boolean {
    return this.state !== 'none';
  }

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
