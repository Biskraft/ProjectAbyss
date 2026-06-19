import type { Player } from '@entities/Player';

interface ItemWorldPlayerSetupOptions {
  fluidOverlayQuery: Player['fluidOverlayQuery'];
  onFlaskHeal: Player['onFlaskHeal'];
}

export function configureItemWorldPlayerFromSource(
  player: Player,
  sourcePlayer: Player,
  options: ItemWorldPlayerSetupOptions,
): void {
  player.attackInputEnabled = true;
  player.fluidOverlayQuery = options.fluidOverlayQuery;
  player.hp = sourcePlayer.hp;
  player.maxHp = sourcePlayer.maxHp;
  player.atk = sourcePlayer.atk;
  player.def = sourcePlayer.def;
  player.equippedWeaponId = sourcePlayer.equippedWeaponId;
  player.equippedWeaponType = sourcePlayer.equippedWeaponType;
  player.equippedRarity = sourcePlayer.equippedRarity;
  player.attackHitboxMul = sourcePlayer.attackHitboxMul;
  player.abilities.dash = sourcePlayer.abilities.dash;
  player.abilities.diveAttack = sourcePlayer.abilities.diveAttack;
  player.abilities.surge = sourcePlayer.abilities.surge;
  player.abilities.waterBreathing = sourcePlayer.abilities.waterBreathing;
  player.abilities.wallJump = sourcePlayer.abilities.wallJump;
  player.abilities.doubleJump = sourcePlayer.abilities.doubleJump;
  player.flaskCharges = 3;
  player.onFlaskHeal = options.onFlaskHeal;
}
