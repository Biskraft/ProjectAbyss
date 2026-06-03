import type { Game } from '../Game';
import { brandLabel } from '@core/input/padGlyphs';
import { t } from '@i18n';
import type { ToastManager } from './Toast';

export function attachGamepadToast(game: Game, toast: ToastManager): () => void {
  const offConnect = game.gamepad.onConnectEvent((brand) => {
    toast.show(t('toast.gamepad_connected', { brand: brandLabel(brand) }), 0x88ddff);
  });
  const offDisconnect = game.gamepad.onDisconnectEvent(() => {
    toast.show(t('toast.gamepad_disconnected'), 0xffaa44);
  });
  return () => {
    offConnect();
    offDisconnect();
  };
}
