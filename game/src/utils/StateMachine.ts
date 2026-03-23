export interface State<T extends string> {
  name: T;
  enter?(): void;
  update?(dt: number): void;
  exit?(): void;
}

export class StateMachine<T extends string> {
  private states = new Map<T, State<T>>();
  private _current: State<T> | null = null;

  get currentState(): T | null {
    return this._current?.name ?? null;
  }

  addState(state: State<T>): void {
    this.states.set(state.name, state);
  }

  transition(name: T): void {
    if (this._current?.name === name) return;

    this._current?.exit?.();
    const next = this.states.get(name);
    if (!next) throw new Error(`State not found: ${name}`);
    this._current = next;
    this._current.enter?.();
  }

  update(dt: number): void {
    this._current?.update?.(dt);
  }
}
