import {
  EgoShardCastRuntimeAdapter,
  resetEgoShardCastState,
} from '@scenes/shared/EgoShardCastHelpers';

export class ItemWorldEgoShardCastRuntime extends EgoShardCastRuntimeAdapter {
  reset(): void {
    resetEgoShardCastState(this.deps.getPlayer(), this.deps.getEgoShardRuntime());
  }
}
