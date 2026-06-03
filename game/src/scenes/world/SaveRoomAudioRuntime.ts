import { BgmController } from '@audio/BgmController';

const SAVE_ROOM_DIM_MS = 800;
const SAVE_ROOM_RESTORE_MS = 1500;

export class SaveRoomAudioRuntime {
  private dimmed = false;

  syncForLevel(hasSavePoint: boolean): void {
    if (hasSavePoint === this.dimmed) return;
    this.dimmed = hasSavePoint;
    BgmController.setVolumeFactor(hasSavePoint ? 0 : 1, hasSavePoint ? SAVE_ROOM_DIM_MS : SAVE_ROOM_RESTORE_MS);
  }
}
