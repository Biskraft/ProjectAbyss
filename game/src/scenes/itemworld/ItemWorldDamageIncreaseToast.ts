import { t } from '@i18n';

export function showItemWorldDamageIncreaseToast(
  beforeAtk: number,
  afterAtk: number,
  showToast: (message: string, color: number) => void,
): void {
  if (afterAtk <= beforeAtk || beforeAtk <= 0) return;
  const pct = Math.round(((afterAtk - beforeAtk) / beforeAtk) * 100);
  if (pct <= 0) return;
  showToast(t('toast.damage_increase', { pct, before: beforeAtk, after: afterAtk }), 0xffcc44);
}
