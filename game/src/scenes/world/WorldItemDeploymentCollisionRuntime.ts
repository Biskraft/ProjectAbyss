import { RuntimeCollisionScope } from '@level/RuntimeCollisionScope';

export class WorldItemDeploymentCollisionRuntime {
  private scope: RuntimeCollisionScope | null = null;

  get currentScope(): RuntimeCollisionScope | null {
    return this.scope;
  }

  clearWorld(grid: number[][], fillValue: number): boolean {
    if (this.scope) return false;
    this.scope = new RuntimeCollisionScope(grid);
    this.scope.fillExisting(fillValue);
    return true;
  }

  restore(): boolean {
    const scope = this.scope;
    if (!scope) return false;

    scope.restore();
    this.scope = null;
    return true;
  }
}
