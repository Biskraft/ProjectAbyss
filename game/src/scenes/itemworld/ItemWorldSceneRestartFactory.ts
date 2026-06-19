export interface RestartableItemWorldScene {
  onComplete: (() => void) | null;
  onPrologueEnd: (() => void) | null;
  itemWorldTutorialDone: boolean;
  egoUnlockedEvents: Set<string>;
}

export function createRestartedPrologueItemWorldScene<TScene extends RestartableItemWorldScene>(options: {
  createScene: () => TScene;
  continuation: RestartableItemWorldScene;
}): TScene {
  const restarted = options.createScene();
  restarted.onComplete = options.continuation.onComplete;
  restarted.onPrologueEnd = options.continuation.onPrologueEnd;
  restarted.itemWorldTutorialDone = options.continuation.itemWorldTutorialDone;
  restarted.egoUnlockedEvents = options.continuation.egoUnlockedEvents;
  return restarted;
}
