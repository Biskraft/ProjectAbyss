import { hudRatio } from './HudNumeric';

export const HP_COLOR_SAFE = 0x22aa22;
export const HP_COLOR_WARN = 0xaaaa22;
export const HP_COLOR_DANGER = 0xaa2222;

export function hpRatio(hp: number, maxHp: number): number {
  return hudRatio(hp, maxHp);
}

export function hpBarColor(
  ratio: number,
  lowHpTimer: number,
  lowHpPulsePeriod: number,
): number {
  if (ratio > 0 && ratio < 0.25 && lowHpTimer > 0) {
    const pulse = Math.sin((lowHpTimer / lowHpPulsePeriod) * Math.PI * 2);
    return pulse > 0 ? 0xff3333 : HP_COLOR_DANGER;
  }
  return ratio > 0.5 ? HP_COLOR_SAFE : ratio > 0.25 ? HP_COLOR_WARN : HP_COLOR_DANGER;
}

export function shouldPulseFlask(hp: number, maxHp: number, flaskCurrent: number, threshold: number): boolean {
  return flaskCurrent > 0 && hpRatio(hp, maxHp) <= threshold;
}
