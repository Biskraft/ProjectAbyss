import { prepareItemWorldTemplates } from '@level/ItemWorldTemplatePool';
import type { ItemInstance } from '@items/ItemInstance';
import { firstInventorySelectionIndex, type FilterTab } from './InventorySelection';
import type { InventoryAnvilState } from './InventoryAnvilStatePolicy';

export type InventoryUIMode = 'inventory' | 'anvil';

const INITIAL_FILTER: FilterTab = 'ALL';

export interface InventoryVisibilityTransition {
  mode: InventoryUIMode;
  onSelect: ((item: ItemInstance) => void) | null;
  visible: boolean;
  anvilState: InventoryAnvilState;
  anvilItem: ItemInstance | null;
  scrollRowOffset: number;
  filter: FilterTab;
  selectedIndex: number;
}

export interface InventoryCloseVisibilityTransition {
  mode: InventoryUIMode;
  onSelect: null;
  visible: false;
  anvilState: InventoryAnvilState;
  anvilItem: null;
}

export interface InventoryOpenVisibilityTransition extends InventoryVisibilityTransition {
  visible: true;
  shouldPrepareAnvilTemplates: boolean;
  shouldNotifyVisibilityChange: boolean;
}

export type InventoryVisibilitySideEffect = 'prepareAnvilTemplates' | 'notifyVisibilityChange';

export interface InventoryOpenVisibilityTransitionPlan extends InventoryOpenVisibilityTransition {
  sideEffects: readonly InventoryVisibilitySideEffect[];
}

export interface InventoryCloseVisibilityTransitionResult extends InventoryCloseVisibilityTransition {
  shouldNotifyVisibilityChange: boolean;
}

export interface InventoryCloseVisibilityTransitionPlan extends InventoryCloseVisibilityTransitionResult {
  sideEffects: readonly InventoryVisibilitySideEffect[];
}

export type InventoryVisibilityTransitionPlan = InventoryOpenVisibilityTransitionPlan | InventoryCloseVisibilityTransitionPlan;

export interface InventoryVisibilityTransitionStateTarget {
  mode: InventoryUIMode;
  onSelect: ((item: ItemInstance) => void) | null;
  visible: boolean;
  anvilState: InventoryAnvilState;
  anvilItem: ItemInstance | null;
  scrollRowOffset: number;
  filter: FilterTab;
  selectedIndex: number;
}

export interface InventoryVisibilityTransitionSideEffectContext {
  visible: boolean;
  mode: InventoryUIMode;
  onVisibilityChange?: (visible: boolean) => void;
  onTemplatesPrepared?: () => void;
}

export interface InventoryVisibilityTransitionApplyContext {
  setContainerVisible: (visible: boolean) => void;
  onVisibilityChange?: (visible: boolean) => void;
  onTemplatesPrepared?: () => void;
}

export interface InventoryVisibilityTransitionBinding
  extends Pick<
    InventoryVisibilityTransitionApplyContext,
    'setContainerVisible' | 'onVisibilityChange' | 'onTemplatesPrepared'
  > {
  readState: () => InventoryVisibilityTransitionStateTarget;
  writeState: (state: InventoryVisibilityTransitionStateTarget) => void;
}

export interface InventoryVisibilityTransitionRunner
  extends InventoryVisibilityTransitionBinding {}

export interface InventoryVisibilityTransitionExecutionContext {
  afterApply?: () => void;
}

export function applyInventoryVisibilityTransitionSideEffects(
  sideEffects: readonly InventoryVisibilitySideEffect[],
  context: InventoryVisibilityTransitionSideEffectContext,
): void {
  for (const effect of sideEffects) {
    if (effect === 'prepareAnvilTemplates') {
      void prepareItemWorldTemplates().then(() => {
        if (context.visible && context.mode === 'anvil') {
          context.onTemplatesPrepared?.();
        }
      });
      continue;
    }

    if (effect === 'notifyVisibilityChange') {
      context.onVisibilityChange?.(context.visible);
    }
  }
}

function buildInventoryVisibilitySideEffects(
  shouldPrepareAnvilTemplates: boolean,
  shouldNotifyVisibilityChange: boolean,
): readonly InventoryVisibilitySideEffect[] {
  const sideEffects: InventoryVisibilitySideEffect[] = [];
  if (shouldPrepareAnvilTemplates) sideEffects.push('prepareAnvilTemplates');
  if (shouldNotifyVisibilityChange) sideEffects.push('notifyVisibilityChange');
  return sideEffects;
}

function makeOpenInventoryVisibilityTransition(
  mode: InventoryUIMode,
  onSelect: ((item: ItemInstance) => void) | null,
  itemCount: number,
): InventoryVisibilityTransition {
  return {
    mode,
    onSelect,
    visible: true,
    anvilState: 'selecting',
    anvilItem: null,
    scrollRowOffset: 0,
    filter: INITIAL_FILTER,
    selectedIndex: firstInventorySelectionIndex(itemCount),
  };
}

function makeCloseInventoryVisibilityTransition(): InventoryCloseVisibilityTransition {
  return {
    mode: 'inventory',
    onSelect: null,
    visible: false,
    anvilState: 'selecting',
    anvilItem: null,
  };
}

function openInventoryVisibilityTransition(
  mode: InventoryUIMode,
  onSelect: ((item: ItemInstance) => void) | null,
  itemCount: number,
  wasVisible: boolean,
): InventoryOpenVisibilityTransition {
  const transition = makeOpenInventoryVisibilityTransition(mode, onSelect, itemCount);
  return {
    ...transition,
    visible: true,
    shouldPrepareAnvilTemplates: mode === 'anvil',
    shouldNotifyVisibilityChange: !wasVisible,
  };
}

export function openInventoryVisibilityTransitionPlan(
  mode: InventoryUIMode,
  onSelect: ((item: ItemInstance) => void) | null,
  itemCount: number,
  wasVisible: boolean,
): InventoryOpenVisibilityTransitionPlan {
  const transition = openInventoryVisibilityTransition(mode, onSelect, itemCount, wasVisible);
  return {
    ...transition,
    sideEffects: buildInventoryVisibilitySideEffects(
      transition.shouldPrepareAnvilTemplates,
      transition.shouldNotifyVisibilityChange,
    ),
  };
}

function closeInventoryVisibilityTransition(
  wasVisible: boolean,
): InventoryCloseVisibilityTransitionResult {
  const transition = makeCloseInventoryVisibilityTransition();
  return {
    ...transition,
    shouldNotifyVisibilityChange: wasVisible,
  };
}

export function closeInventoryVisibilityTransitionPlan(
  wasVisible: boolean,
): InventoryCloseVisibilityTransitionPlan {
  const transition = closeInventoryVisibilityTransition(wasVisible);
  return {
    ...transition,
    sideEffects: buildInventoryVisibilitySideEffects(
      false,
      transition.shouldNotifyVisibilityChange,
    ),
  };
}

export function applyOpenInventoryVisibilityTransitionState(
  state: InventoryVisibilityTransitionStateTarget,
  transition: InventoryOpenVisibilityTransition,
): void {
  state.mode = transition.mode;
  state.onSelect = transition.onSelect;
  state.visible = transition.visible;
  state.anvilState = transition.anvilState;
  state.anvilItem = transition.anvilItem;
  state.scrollRowOffset = transition.scrollRowOffset;
  state.filter = transition.filter;
  state.selectedIndex = transition.selectedIndex;
}

export function applyCloseInventoryVisibilityTransitionState(
  state: InventoryVisibilityTransitionStateTarget,
  transition: InventoryCloseVisibilityTransition,
): void {
  state.mode = transition.mode;
  state.onSelect = transition.onSelect;
  state.visible = transition.visible;
  state.anvilState = transition.anvilState;
  state.anvilItem = transition.anvilItem;
}

export function applyInventoryVisibilityTransition(
  state: InventoryVisibilityTransitionStateTarget,
  transition: InventoryVisibilityTransitionPlan,
  context: InventoryVisibilityTransitionApplyContext,
): void {
  if (transition.visible) {
    applyOpenInventoryVisibilityTransitionState(state, transition);
    context.setContainerVisible(true);
    applyInventoryVisibilityTransitionSideEffects(transition.sideEffects, {
      ...context,
      visible: true,
      mode: transition.mode,
    });
    return;
  }

  applyCloseInventoryVisibilityTransitionState(state, transition);
  context.setContainerVisible(false);
  applyInventoryVisibilityTransitionSideEffects(transition.sideEffects, {
    ...context,
    visible: false,
    mode: transition.mode,
  });
}

export function applyBoundInventoryVisibilityTransition(
  transition: InventoryVisibilityTransitionPlan,
  binding: InventoryVisibilityTransitionBinding,
): InventoryVisibilityTransitionStateTarget {
  const state = binding.readState();
  applyInventoryVisibilityTransition(state, transition, binding);
  binding.writeState(state);
  return state;
}

export function runOpenInventoryVisibilityTransition(
  mode: InventoryUIMode,
  onSelect: ((item: ItemInstance) => void) | null,
  itemCount: number,
  wasVisible: boolean,
  runner: InventoryVisibilityTransitionRunner,
  context: InventoryVisibilityTransitionExecutionContext = {},
): InventoryVisibilityTransitionStateTarget {
  const transition = openInventoryVisibilityTransitionPlan(
    mode,
    onSelect,
    itemCount,
    wasVisible,
  );
  const nextState = applyBoundInventoryVisibilityTransition(transition, runner);
  context.afterApply?.();
  return nextState;
}

export function runCloseInventoryVisibilityTransition(
  wasVisible: boolean,
  runner: InventoryVisibilityTransitionRunner,
  context: InventoryVisibilityTransitionExecutionContext = {},
): InventoryVisibilityTransitionStateTarget {
  const transition = closeInventoryVisibilityTransitionPlan(wasVisible);
  const nextState = applyBoundInventoryVisibilityTransition(transition, runner);
  context.afterApply?.();
  return nextState;
}
