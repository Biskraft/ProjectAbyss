import type { Camera } from '@core/Camera';
import { CameraConst } from '@data/constData';
import type { LdtkLevel } from '@level/LdtkLoader';

export interface CameraZone {
  x: number;
  y: number;
  w: number;
  h: number;
  zoom: number;
  deadZoneX: number;
  deadZoneY: number;
  lookAheadDistance: number;
  followLerp: number;
  zoomLerp: number;
  entireLevel: boolean;
}

interface CameraZoneRuntimeDeps {
  camera: Camera;
  getPlayerCenter: () => { x: number; y: number };
  suppressZones?: () => boolean;
  preferSpecificZones?: boolean;
}

export class CameraZoneRuntime {
  private readonly zones: CameraZone[] = [];
  private activeZone: CameraZone | null = null;

  constructor(private readonly deps: CameraZoneRuntimeDeps) {}

  clear(): void {
    this.zones.length = 0;
    this.activeZone = null;
  }

  resetToDefaults(): void {
    this.clear();
    this.applyCameraDefaults();
  }

  addZone(zone: CameraZone): void {
    this.zones.push(zone);
  }

  loadLevel(level: LdtkLevel, options: { resetToDefaults?: boolean } = {}): void {
    if (options.resetToDefaults) {
      this.resetToDefaults();
    } else {
      this.clear();
    }

    for (const entity of level.entities) {
      if (entity.type !== 'Camera') continue;
      this.addZone({
        x: entity.px[0],
        y: entity.px[1] - entity.height,
        w: entity.width,
        h: entity.height,
        zoom: (entity.fields['zoom'] as number | undefined) ?? 1.0,
        deadZoneX: (entity.fields['deadZoneX'] as number | undefined) ?? 32,
        deadZoneY: (entity.fields['deadZoneY'] as number | undefined) ?? 24,
        lookAheadDistance: (entity.fields['lookAheadDistance'] as number | undefined) ?? 0,
        followLerp: (entity.fields['followLerp'] as number | undefined) ?? 0.08,
        zoomLerp: (entity.fields['zoomLerp'] as number | undefined) ?? 0.05,
        entireLevel: (entity.fields['entireLevel'] as boolean | undefined) ?? false,
      });
    }
  }

  update(): void {
    if (this.zones.length === 0 && !this.activeZone) return;

    const insideZone = this.deps.suppressZones?.()
      ? null
      : this.pickZone();

    if (insideZone && insideZone !== this.activeZone) {
      this.activeZone = insideZone;
      const cam = this.deps.camera;
      cam.deadZoneX = insideZone.deadZoneX;
      cam.deadZoneY = insideZone.deadZoneY;
      cam.lookAheadDistance = insideZone.lookAheadDistance;
      cam.followLerp = insideZone.followLerp;
      cam.zoomTo(insideZone.zoom, insideZone.zoomLerp);
    } else if (!insideZone && this.activeZone) {
      this.activeZone = null;
      this.applyCameraDefaults(0.05);
    }
  }

  private pickZone(): CameraZone | null {
    const playerCenter = this.deps.getPlayerCenter();
    if (this.deps.preferSpecificZones) {
      for (const zone of this.zones) {
        if (!zone.entireLevel && containsPoint(zone, playerCenter.x, playerCenter.y)) return zone;
      }
      return this.zones.find(zone => zone.entireLevel) ?? null;
    }

    return this.zones.find(zone =>
      zone.entireLevel || containsPoint(zone, playerCenter.x, playerCenter.y),
    ) ?? null;
  }

  private applyCameraDefaults(zoomLerp?: number): void {
    const cam = this.deps.camera;
    cam.deadZoneX = CameraConst.DeadZoneX;
    cam.deadZoneY = CameraConst.DeadZoneY;
    cam.lookAheadDistance = CameraConst.LookAheadDistance;
    cam.followLerp = CameraConst.FollowLerp;
    cam.zoomTo(1.0, zoomLerp);
  }
}

function containsPoint(zone: CameraZone, x: number, y: number): boolean {
  return x >= zone.x && x <= zone.x + zone.w
    && y >= zone.y && y <= zone.y + zone.h;
}
