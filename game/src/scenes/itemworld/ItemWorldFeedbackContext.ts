interface FeedbackPlayerSnapshot {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
}

interface FeedbackInventorySnapshot {
  equipped?: {
    def: {
      id: string;
    };
  } | null;
}

export interface ItemWorldFeedbackContext {
  area: 'world' | 'itemworld';
  level_id?: string;
  room_col: number;
  room_row: number;
  equipped_weapon_id?: string;
  hp_pct: number;
}

export function createItemWorldFeedbackContext(options: {
  player: FeedbackPlayerSnapshot;
  inventory?: FeedbackInventorySnapshot | null;
  entryCorridorActive: boolean;
  entryCorridorLevelId: string;
  tileSize: number;
}): ItemWorldFeedbackContext {
  const { player, inventory, entryCorridorActive, entryCorridorLevelId, tileSize } = options;
  const cx = player.x + player.width / 2;
  const cy = player.y + player.height / 2;
  const equipped = inventory?.equipped;

  return {
    area: 'itemworld',
    level_id: entryCorridorActive ? entryCorridorLevelId : undefined,
    room_col: Math.floor(cx / tileSize),
    room_row: Math.floor(cy / tileSize),
    equipped_weapon_id: equipped?.def.id ?? undefined,
    hp_pct: player.maxHp > 0
      ? Math.floor((player.hp / player.maxHp) * 100)
      : 0,
  };
}
