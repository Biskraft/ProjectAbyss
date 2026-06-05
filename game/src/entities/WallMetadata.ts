interface WallRuntimeMetadata {
  _runtimeWallKey?: string;
  _runtimeItemId?: string | null;
}

const asWallMetadata = <T extends object>(wall: T): T & WallRuntimeMetadata => wall as T & WallRuntimeMetadata;

export const setWallRuntimeKey = <T extends object>(wall: T, key: string): void => {
  asWallMetadata(wall)._runtimeWallKey = key;
};

export const getWallRuntimeKey = <T extends object>(wall: T): string | undefined => asWallMetadata(wall)._runtimeWallKey;

export const setWallRuntimeItemId = <T extends object>(wall: T, itemId: string | null): void => {
  asWallMetadata(wall)._runtimeItemId = itemId;
};

export const getWallRuntimeItemId = <T extends object>(wall: T): string | null | undefined => asWallMetadata(wall)._runtimeItemId;
