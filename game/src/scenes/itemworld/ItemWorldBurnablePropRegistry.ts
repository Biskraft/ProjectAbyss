import type { BurnableProp } from '@entities/BurnableProp';

export class ItemWorldBurnablePropRegistry {
  readonly props: BurnableProp[] = [];

  clear(): void {
    for (const prop of this.props) prop.destroy();
    this.props.length = 0;
  }
}
