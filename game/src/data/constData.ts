/**
 * constData.ts — Cross-cutting tuning constants loaded from CSV at build time.
 *
 * SSoT:
 *   - Sheets/Content_Player.csv     (player movement / feel / base stats)
 *   - Sheets/Content_ConstData.csv  (everything else: combat / enemy / item / itemworld / world / camera / hud / parallax / decorator)
 *
 * CSV format: Category,Key,Value,Description,Source
 * Lookup key: `${Category}.${Key}` -> Number(Value)
 *
 * CSV 수정 시 코드 변경 불필요. 빌드만 다시 하면 반영됨.
 */

import playerCsv from '../../../Sheets/Content_Player.csv?raw';
import constCsv from '../../../Sheets/Content_ConstData.csv?raw';

function parseConstCsv(csvText: string): Map<string, number> {
  const map = new Map<string, number>();
  const lines = csvText.trim().split('\n');
  for (let i = 1; i < lines.length; i++) {  // skip header
    const cols = lines[i].split(',');
    if (cols.length < 3) continue;
    const category = cols[0].trim();
    const key = cols[1].trim();
    const value = Number(cols[2].trim());
    if (!Number.isFinite(value)) continue;
    map.set(`${category}.${key}`, value);
  }
  return map;
}

const PLAYER_VALUES = parseConstCsv(playerCsv);
const CONST_VALUES = parseConstCsv(constCsv);

function reqPlayer(key: string): number {
  const v = PLAYER_VALUES.get(key);
  if (v === undefined) throw new Error(`[constData] missing Player CSV key: ${key}`);
  return v;
}

function reqConst(key: string): number {
  const v = CONST_VALUES.get(key);
  if (v === undefined) throw new Error(`[constData] missing ConstData CSV key: ${key}`);
  return v;
}

/**
 * Player tuning constants — flat namespace.
 * 각 값은 Sheets/Content_Player.csv 의 (Category, Key) 쌍에서 옴.
 */
export const PlayerConst = {
  // Movement
  MoveSpeed: reqPlayer('Player.Movement.MoveSpeed'),
  AccelFrames: reqPlayer('Player.Movement.AccelFrames'),
  Gravity: reqPlayer('Player.Movement.Gravity'),
  MaxFallSpeed: reqPlayer('Player.Movement.MaxFallSpeed'),
  JumpHeight: reqPlayer('Player.Movement.JumpHeight'),
  CoyoteTimeMs: reqPlayer('Player.Movement.CoyoteTimeMs'),
  JumpBufferMs: reqPlayer('Player.Movement.JumpBufferMs'),
  AirAccelMult: reqPlayer('Player.Movement.AirAccelMult'),
  AttackMoveMult: reqPlayer('Player.Movement.AttackMoveMult'),

  // Jump feel
  VarJumpTimeMs: reqPlayer('Player.Jump.VarJumpTimeMs'),
  VarJumpCutMult: reqPlayer('Player.Jump.VarJumpCutMult'),
  ApexThreshold: reqPlayer('Player.Jump.ApexThreshold'),
  ApexGravityMult: reqPlayer('Player.Jump.ApexGravityMult'),

  // Dash
  DashDistance: reqPlayer('Player.Dash.DashDistance'),
  DashDurationMs: reqPlayer('Player.Dash.DashDurationMs'),
  DashGroundDelayMs: reqPlayer('Player.Dash.DashGroundDelayMs'),
  DashFreezeMs: reqPlayer('Player.Dash.DashFreezeMs'),
  DashCornerToleranceY: reqPlayer('Player.Dash.DashCornerToleranceY'),

  // Wall jump / slide
  WallSlideSpeed: reqPlayer('Player.WallJump.WallSlideSpeed'),
  WallJumpVx: reqPlayer('Player.WallJump.WallJumpVx'),
  WallJumpCooldownMs: reqPlayer('Player.WallJump.WallJumpCooldownMs'),
  WallCheckDist: reqPlayer('Player.WallJump.WallCheckDist'),
  LedgeTolerance: reqPlayer('Player.WallJump.LedgeTolerance'),

  // Surge
  SurgeChargeMs: reqPlayer('Player.Surge.SurgeChargeMs'),
  SurgeSpeed: reqPlayer('Player.Surge.SurgeSpeed'),
  SurgeDurationMs: reqPlayer('Player.Surge.SurgeDurationMs'),

  // Water
  WaterMoveMult: reqPlayer('Player.Water.WaterMoveMult'),
  WaterMaxFallMult: reqPlayer('Player.Water.WaterMaxFallMult'),
  WaterOxygenRecoverMult: reqPlayer('Player.Water.WaterOxygenRecoverMult'),
  OxygenMaxMs: reqPlayer('Player.Water.OxygenMaxMs'),

  // Healing / Flask
  FlaskHealPercent: reqPlayer('Player.Healing.FlaskHealPercent'),
  FlaskCastMs: reqPlayer('Player.Healing.FlaskCastMs'),
  FlaskBufferMs: reqPlayer('Player.Healing.FlaskBufferMs'),
  FlaskInitialCharges: reqPlayer('Player.Healing.FlaskInitialCharges'),
  DropThroughMs: reqPlayer('Player.Healing.DropThroughMs'),

  // Base stats / hitbox
  BaseHp: reqPlayer('Player.Base.BaseHp'),
  BaseAtk: reqPlayer('Player.Base.BaseAtk'),
  BaseDef: reqPlayer('Player.Base.BaseDef'),
  CollisionW: reqPlayer('Player.Base.CollisionW'),
  CollisionH: reqPlayer('Player.Base.CollisionH'),
} as const;

/** Player buff tuning. */
export const BuffConst = {
  BeginnerGraceAtkFlat: reqConst('Buff.BeginnerGrace.AtkFlat'),
  BeginnerGraceDefFlat: reqConst('Buff.BeginnerGrace.DefFlat'),
} as const;

/** Combat formula / feel constants — flat across damage/crit/combo/hitstop/hitbox/i-frames/shake/knockback/hit-point. */
export const CombatConst = {
  DefFactor: reqConst('Combat.Damage.DefFactor'),
  DamageRandomMin: reqConst('Combat.Damage.RandomMin'),
  DamageRandomMax: reqConst('Combat.Damage.RandomMax'),
  MinDamage: reqConst('Combat.Damage.MinDamage'),
  CritChance: reqConst('Combat.Crit.CritChance'),
  CritMultiplier: reqConst('Combat.Crit.CritMultiplier'),
  ComboFinisherIndex: reqConst('Combat.Combo.FinisherIndex'),
  ComboFinisherDamageMult: reqConst('Combat.Combo.FinisherDamageMult'),
  HitstopKillBonusFrames: reqConst('Combat.Hitstop.KillBonusFrames'),
  HitstopHeavyBonusFrames: reqConst('Combat.Hitstop.HeavyBonusFrames'),
  BaseHitboxW: reqConst('Combat.Hitbox.BaseHitboxW'),
  InvincibilityOnHitMs: reqConst('Combat.Invincibility.OnHitMs'),
  HeavyShakeMult: reqConst('Combat.Shake.HeavyShakeMult'),
  KillShakeBonus: reqConst('Combat.Shake.KillShakeBonus'),
  KnockbackVerticalBiasFactor: reqConst('Combat.Knockback.VerticalBiasFactor'),
  KnockbackVerticalBiasThresholdY: reqConst('Combat.Knockback.VerticalBiasThresholdY'),
  HitPointForwardOffsetX: reqConst('Combat.HitPoint.ForwardOffsetX'),
  HitPointVerticalOffsetY: reqConst('Combat.HitPoint.VerticalOffsetY'),
} as const;

/** Common enemy tuning. */
export const EnemyConst = {
  MaxFallSpeed: reqConst('Enemy.Common.EnemyMaxFallSpeed'),
  WallBlockThresholdMs: reqConst('Enemy.Common.WallBlockThresholdMs'),
  JumpCooldownMs: reqConst('Enemy.Common.JumpCooldownMs'),
  HpBarShowMs: reqConst('Enemy.Common.HpBarShowMs'),
  DeathFadeMs: reqConst('Enemy.Common.DeathFadeMs'),
} as const;

/** Item / drop / inventory. */
export const ItemConst = {
  MaxSlots: reqConst('Item.Inventory.MaxSlots'),
  DefaultDropChance: reqConst('Item.Drop.DefaultDropChance'),
  DefaultShardSpawnChance: reqConst('Item.Drop.DefaultShardSpawnChance'),
  BareHandAtk: reqConst('Item.Drop.BareHandAtk'),
} as const;

/** Item-world entry / EXP / boss / per-floor. */
export const ItemWorldConst = {
  EntryFreezeMs: reqConst('ItemWorld.Entry.EntryFreezeMs'),
  BaseExpPerRoom: reqConst('ItemWorld.Exp.BaseExpPerRoom'),
  BaseExpPerKill: reqConst('ItemWorld.Exp.BaseExpPerKill'),
  BaseExpRoomPass: reqConst('ItemWorld.Exp.BaseExpRoomPass'),
  BossBonusExp: reqConst('ItemWorld.Exp.BossBonusExp'),
  BossClearHealPercent: reqConst('ItemWorld.Boss.BossClearHealPercent'),
  ItemExpPerFloor: reqConst('ItemWorld.Item.ExpPerFloor'),
} as const;

/** World room-grid critical-path constants. */
export const WorldGridConst = {
  WeightLeft: reqConst('World.RoomGrid.WeightLeft'),
  WeightRight: reqConst('World.RoomGrid.WeightRight'),
  MinPathRatio: reqConst('World.RoomGrid.MinPathRatio'),
  PathfindingAttempts: reqConst('World.RoomGrid.PathfindingAttempts'),
} as const;

/** Camera follow / dead-zone / look-ahead / shake constants. */
export const CameraConst = {
  FollowLerp: reqConst('Camera.FollowLerp'),
  DeadZoneX: reqConst('Camera.DeadZoneX'),
  DeadZoneY: reqConst('Camera.DeadZoneY'),
  LookAheadDistance: reqConst('Camera.LookAheadDistance'),
  LookAheadLerp: reqConst('Camera.LookAheadLerp'),
  LookAheadYDistance: reqConst('Camera.LookAheadYDistance'),
  LookAheadYLerp: reqConst('Camera.LookAheadYLerp'),
  ZoomSpeed: reqConst('Camera.ZoomSpeed'),
  ShakeDecayRate: reqConst('Camera.ShakeDecayRate'),
  ShakeMinThreshold: reqConst('Camera.ShakeMinThreshold'),
  ShakeBiasScale: reqConst('Camera.ShakeBiasScale'),
  ShakeBiasDecay: reqConst('Camera.ShakeBiasDecay'),
} as const;

/** Game render / fixed-step constants. */
export const GameRenderConst = {
  GameWidth: reqConst('Game.Render.GameWidth'),
  GameHeight: reqConst('Game.Render.GameHeight'),
  FixedStepMs: reqConst('Game.Render.FixedStepMs'),
  MaxAccumulatedFrames: reqConst('Game.Render.MaxAccumulatedFrames'),
  MaxRTSize: reqConst('Game.Render.MaxRTSize'),
} as const;

/** HUD timing / toast / tutorial / death / stratum-clear — nested due to subcategory key collisions. */
export const HudConst = {
  Timing: {
    GhostBarFadeMs: reqConst('HUD.Timing.GhostBarFadeMs'),
    HealFlashMs: reqConst('HUD.Timing.HealFlashMs'),
    BossHealFlashMs: reqConst('HUD.Timing.BossHealFlashMs'),
    LowHpPulsePeriodMs: reqConst('HUD.Timing.LowHpPulsePeriodMs'),
    HpTextFlashMs: reqConst('HUD.Timing.HpTextFlashMs'),
    FlaskLowHpThreshold: reqConst('HUD.Timing.FlaskLowHpThreshold'),
    FlaskPulsePeriodMs: reqConst('HUD.Timing.FlaskPulsePeriodMs'),
    ExpLerpMs: reqConst('HUD.Timing.ExpLerpMs'),
    ExpLevelupFlashMs: reqConst('HUD.Timing.ExpLevelupFlashMs'),
  },
  Toast: {
    DurationMs: reqConst('HUD.Toast.DurationMs'),
    FadeStartMs: reqConst('HUD.Toast.FadeStartMs'),
    BigDurationMs: reqConst('HUD.Toast.BigDurationMs'),
  },
  Tutorial: {
    DisplayDurationMs: reqConst('HUD.Tutorial.DisplayDurationMs'),
    FadeDurationMs: reqConst('HUD.Tutorial.FadeDurationMs'),
  },
  Death: {
    InputDelayMs: reqConst('HUD.Death.InputDelayMs'),
  },
  StratumClear: {
    DarkPhaseMs: reqConst('HUD.StratumClear.DarkPhaseMs'),
    PumpPhaseMs: reqConst('HUD.StratumClear.PumpPhaseMs'),
    FlashPhaseMs: reqConst('HUD.StratumClear.FlashPhaseMs'),
    TitlePhaseMs: reqConst('HUD.StratumClear.TitlePhaseMs'),
    StatsPhaseMs: reqConst('HUD.StratumClear.StatsPhaseMs'),
    PromptPhaseMs: reqConst('HUD.StratumClear.PromptPhaseMs'),
    ShatterCount: reqConst('HUD.StratumClear.ShatterCount'),
  },
} as const;

/** Parallax background factor defaults (per-area override in Content_System_Area_Palette.csv). */
export const ParallaxConst = {
  FactorFar: reqConst('ParallaxBackground.ParallaxFactorFar'),
  FactorMid: reqConst('ParallaxBackground.ParallaxFactorMid'),
  FactorNear: reqConst('ParallaxBackground.ParallaxFactorNear'),
} as const;

/** Procedural decorator default density / count constants. */
export const DecoratorConst = {
  DefaultMaxDecorations: reqConst('ProceduralDecorator.DefaultMaxDecorations'),
  DefaultDensity: reqConst('ProceduralDecorator.DefaultDensity'),
  DefaultMaxStructures: reqConst('ProceduralDecorator.DefaultMaxStructures'),
  DefaultStructureDensity: reqConst('ProceduralDecorator.DefaultStructureDensity'),
  StructDensityBoostMult: reqConst('ProceduralDecorator.StructDensityBoostMult'),
} as const;
