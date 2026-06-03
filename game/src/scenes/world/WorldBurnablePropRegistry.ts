import type { Container } from 'pixi.js';
import type { BurnableProp } from '@entities/BurnableProp';

export class WorldBurnablePropRegistry {
  readonly props: BurnableProp[] = [];

  add(prop: BurnableProp, entityLayer?: Container): void {
    this.props.push(prop);
    if (entityLayer && !prop.container.parent) entityLayer.addChild(prop.container);
  }

  clear(): void {
    for (const prop of this.props) prop.destroy();
    this.props.length = 0;
  }

  removeAt(index: number): void {
    const prop = this.props[index];
    prop.destroy();
    this.props.splice(index, 1);
  }
}
