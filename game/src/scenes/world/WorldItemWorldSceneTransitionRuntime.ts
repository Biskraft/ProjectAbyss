interface WorldItemWorldSceneTransitionRuntimeDeps {
  hideSceneDuringTransition: () => void;
  detachSharedUiForItemWorld: () => void;
  releaseWorldVisualsForItemWorld?: () => void;
  setCameraZoom?: (zoom: number) => void;
}

export class WorldItemWorldSceneTransitionRuntime {
  private static readonly DEFAULT_RETURN_ZOOM = 1.0;

  constructor(private readonly deps: WorldItemWorldSceneTransitionRuntimeDeps) {}

  preparePush(): void {
    this.deps.hideSceneDuringTransition();
    this.deps.detachSharedUiForItemWorld();
    this.deps.releaseWorldVisualsForItemWorld?.();
    this.deps.setCameraZoom?.(WorldItemWorldSceneTransitionRuntime.DEFAULT_RETURN_ZOOM);
  }
}
