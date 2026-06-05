interface ItemDropMetadata {
  _itemKey?: string;
  _key?: string;
}

const withMetadata = <T extends object>(target: T): T & ItemDropMetadata => target as T & ItemDropMetadata;

export const setDropItemKey = <T extends object>(drop: T, itemKey: string): void => {
  withMetadata(drop)._itemKey = itemKey;
};

export const getDropItemKey = <T extends object>(drop: T): string | undefined =>
  withMetadata(drop)._itemKey;

export const setPersistedKey = <T extends object>(pickup: T, key: string): void => {
  withMetadata(pickup)._key = key;
};

export const getPersistedKey = <T extends object>(pickup: T): string | undefined =>
  withMetadata(pickup)._key;
