import { Container, Graphics } from 'pixi.js';
import { GameAction, actionKey } from '@core/InputManager';
import { t } from '@i18n';
import { PIXEL_FONT } from '@ui/fonts';
import { createUiText } from '@ui/factories';
import { GAME_HEIGHT, GAME_WIDTH, type Game } from '../../Game';
import type { HUD } from '@ui/HUD';
import { destroyNullableDisplayObject } from '@scenes/shared/DisplayObjectLifecycleHelpers';
import { isGameOverRespawnPressed } from '@scenes/shared/GameOverInputHelpers';

interface WorldGameOverRuntimeDeps {
  game: Game;
  hud: HUD;
  getMinimap: () => Container | null;
  onRespawn: () => void;
}

export class WorldGameOverRuntime {
  private overlay: Container | null = null;
  private active = false;

  constructor(private readonly deps: WorldGameOverRuntimeDeps) {}

  get isActive(): boolean {
    return this.active;
  }

  show(): void {
    this.active = true;

    const { game, hud } = this.deps;
    game.uiContainer.removeChildren();
    game.uiContainer.addChild(hud.container);
    const minimap = this.deps.getMinimap();
    if (minimap) game.uiContainer.addChild(minimap);

    hud.resetLowHpEffects();

    const overlay = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill({ color: 0x111111, alpha: 0.8 });
    overlay.addChild(bg);

    const title = createUiText(t('ui.death.youdied_world'), {
      fontFamily: PIXEL_FONT,
      fontSize: 14,
      fill: 0xff2222,
    });
    title.anchor.set(0.5);
    title.x = GAME_WIDTH / 2;
    title.y = GAME_HEIGHT / 2 - 20;
    overlay.addChild(title);

    const hint = createUiText(
      t('ui.death.return_save_point', { jump: actionKey(GameAction.JUMP), dash: actionKey(GameAction.DASH) }),
      { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0x888888 },
    );
    hint.anchor.set(0.5);
    hint.x = GAME_WIDTH / 2;
    hint.y = GAME_HEIGHT / 2 + 10;
    overlay.addChild(hint);

    this.overlay = overlay;
    game.legacyUIContainer.addChild(overlay);
  }

  updateInput(): boolean {
    if (!this.active) return false;
    if (isGameOverRespawnPressed(this.deps.game.input)) {
      this.deps.onRespawn();
    }
    return true;
  }

  clear(): void {
    this.active = false;
    this.overlay = destroyNullableDisplayObject(this.overlay, { children: true });
  }

  destroy(): void {
    this.clear();
  }
}
