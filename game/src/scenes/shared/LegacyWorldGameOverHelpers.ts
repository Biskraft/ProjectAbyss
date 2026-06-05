import { Container, Graphics } from 'pixi.js';
import { GameAction, actionKey } from '@core/InputManager';
import { t } from '@i18n';
import { createUiText } from '@ui/factories';
import { PIXEL_FONT } from '@ui/fonts';
import { GAME_HEIGHT, GAME_WIDTH } from '../../Game';

export function createLegacyWorldGameOverOverlay(): Container {
  const overlay = new Container();

  const bg = new Graphics();
  bg.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill({ color: 0x000000, alpha: 0.7 });
  overlay.addChild(bg);

  const title = createUiText(t('ui.world.game_over'), { fontFamily: PIXEL_FONT, fontSize: 12, fill: 0xff4444 });
  title.anchor.set(0.5);
  title.x = 240;
  title.y = 120;
  overlay.addChild(title);

  const hint = createUiText(
    t('ui.world.respawn_hint', { jump: actionKey(GameAction.JUMP), dash: actionKey(GameAction.DASH) }),
    { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xaaaaaa },
  );
  hint.anchor.set(0.5);
  hint.x = 240;
  hint.y = 150;
  overlay.addChild(hint);

  return overlay;
}
