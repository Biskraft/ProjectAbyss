import type { Container } from 'pixi.js';
import type { BreakableProp } from '@entities/BreakableProp';

export class WorldBreakablePropRegistry {
  readonly props: BreakableProp[] = [];

  add(prop: BreakableProp, entityLayer?: Container): void {
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

  update(dtMs: number): void {
    for (const prop of this.props) prop.update(dtMs);
  }
}
