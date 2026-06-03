/**
 * RuntimeCollisionScope owns temporary collision-grid mutations that must be
 * restored as one transaction. It keeps the existing number[][] grid object so
 * actors that already reference the scene grid keep seeing live changes.
 */
export class RuntimeCollisionScope {
  private readonly snapshot: number[][];
  private restored = false;

  constructor(private readonly grid: number[][]) {
    this.snapshot = grid.map(row => [...row]);
  }

  fillExisting(value: number): void {
    if (this.restored) return;
    for (const row of this.grid) {
      row.fill(value);
    }
  }

  ensureSize(requiredCols: number, requiredRows: number, fillValue: number): void {
    if (this.restored) return;
    for (let row = 0; row < requiredRows; row++) {
      if (!this.grid[row]) this.grid[row] = [];
      while (this.grid[row].length < requiredCols) {
        this.grid[row].push(fillValue);
      }
    }
  }

  setCell(row: number, col: number, value: number): boolean {
    if (this.restored) return false;
    const targetRow = this.grid[row];
    if (!targetRow || col < 0 || col >= targetRow.length) return false;
    targetRow[col] = value;
    return true;
  }

  restore(): void {
    if (this.restored) return;
    this.grid.length = this.snapshot.length;
    for (let row = 0; row < this.snapshot.length; row++) {
      const sourceRow = this.snapshot[row] ?? [];
      const targetRow = this.grid[row];
      if (!targetRow) {
        this.grid[row] = [...sourceRow];
        continue;
      }
      targetRow.length = sourceRow.length;
      for (let col = 0; col < sourceRow.length; col++) {
        targetRow[col] = sourceRow[col];
      }
    }
    this.restored = true;
  }
}
