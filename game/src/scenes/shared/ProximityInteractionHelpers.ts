interface InteractionActor {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ProximityHintEntity {
  update(dtMs: number): void;
  overlaps(x: number, y: number, width: number, height: number): boolean;
  setShowHint(show: boolean): void;
}

export interface PortalInteractionOptions<TPortal extends ProximityHintEntity> {
  portals: TPortal[];
  actor: InteractionActor;
  dtMs: number;
  isInteractPressed: () => boolean;
  onEnter: (portal: TPortal) => void;
}

export function updatePortalInteractions<TPortal extends ProximityHintEntity>(
  options: PortalInteractionOptions<TPortal>,
): boolean {
  const { portals, actor, dtMs, isInteractPressed, onEnter } = options;
  for (const portal of portals) {
    portal.update(dtMs);

    const near = portal.overlaps(
      actor.x - 8,
      actor.y - 8,
      actor.width + 16,
      actor.height + 16,
    );
    portal.setShowHint(near);

    if (portal.overlaps(actor.x, actor.y, actor.width, actor.height)
        && isInteractPressed()) {
      onEnter(portal);
      return true;
    }
  }
  return false;
}

export interface AltarInteractionOptions<TAltar extends ProximityHintEntity & { used: boolean }> {
  altars: TAltar[];
  actor: InteractionActor;
  dtMs: number;
  isInteractPressed: () => boolean;
  isSelectActive: () => boolean;
  onOpen: (altar: TAltar) => void;
}

export function updateAltarInteractions<TAltar extends ProximityHintEntity & { used: boolean }>(
  options: AltarInteractionOptions<TAltar>,
): void {
  const { altars, actor, dtMs, isInteractPressed, isSelectActive, onOpen } = options;
  for (const altar of altars) {
    altar.update(dtMs);

    if (altar.used) {
      altar.setShowHint(false);
      continue;
    }

    const near = altar.overlaps(
      actor.x - 8,
      actor.y - 8,
      actor.width + 16,
      actor.height + 16,
    );
    altar.setShowHint(near);

    if (altar.overlaps(actor.x, actor.y, actor.width, actor.height)
        && isInteractPressed()
        && !isSelectActive()) {
      onOpen(altar);
      return;
    }
  }
}
