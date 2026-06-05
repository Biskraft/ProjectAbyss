import type { BurnableProp } from '@entities/BurnableProp';
import { clearBurnableProps } from '@scenes/shared/BurnablePropRegistryHelpers';

export class ItemWorldBurnablePropRegistry {
  readonly props: BurnableProp[] = [];

  clear(): void {
    clearBurnableProps(this.props);
  }
}
