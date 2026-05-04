/**
 * KeyPrompt.ts - Dead Cells style dark-box key icon rendering.
 *
 * Usage:
 *   const icon = KeyPrompt.createKeyIcon('Z');
 *   const prompt = KeyPrompt.createPrompt('Z', 'Save');
 */

import { Container, Graphics, BitmapText } from 'pixi.js';
import { PIXEL_FONT } from './fonts';
import { actionKey, GameAction, getActiveInput } from '@core/InputManager';
import { onDeviceChange } from '@core/input/InputDeviceTracker';
import { PAD_BINDINGS } from '@core/input/padBindings';
import { getButtonGlyph } from '@core/input/padGlyphs';
import type { ControllerBrand } from '@core/input/gamepadStandard';

// Dark box visual constants (640x360 base)
const KEY_BOX_SIZE = 7;
const KEY_BOX_BG = 0x1a1a1a;
const KEY_BOX_BG_ALPHA = 0.85;
const KEY_BOX_BORDER = 0x666666;
const KEY_BOX_BORDER_W = 1;
const KEY_BOX_TEXT_COLOR = 0xffffff;
const KEY_BOX_FONT_SIZE = 5;
const KEY_BOX_RADIUS = 1;

// Gauge fill — DEC-035 키컬러 orange. 입력 잠금/홀드 confirm 등 진행률 표기에 공통 사용.
// alpha 0.85 — 부모가 dim 되더라도 게이지가 충분히 보이도록 강하게.
const KEY_BOX_GAUGE_COLOR = 0xff8000;
const KEY_BOX_GAUGE_ALPHA = 0.85;

// Context prompt — world-space interactable prompts (must be legible at 640x360)
const CONTEXT_KEY_SIZE = 14;
const CONTEXT_FONT_SIZE = 8;
const CONTEXT_LABEL_COLOR = 0xffffff;
const CONTEXT_BG = 0x000000;
const CONTEXT_BG_ALPHA = 0.7;
const CONTEXT_PADDING = 4;
const CONTEXT_GAP = 3;

export class KeyPrompt {

  /** Key icon — dark box with letter. Font scales proportionally to box size. */
  static createKeyIcon(key: string, size = KEY_BOX_SIZE): Container {
    const c = new Container();
    const bg = new Graphics();
    const radius = Math.max(1, Math.floor(size / 7));
    const borderW = Math.max(1, Math.floor(size / 7));

    bg.roundRect(0, 0, size, size, radius)
      .fill({ color: KEY_BOX_BG, alpha: KEY_BOX_BG_ALPHA });
    bg.roundRect(0, 0, size, size, radius)
      .stroke({ color: KEY_BOX_BORDER, width: borderW });
    c.addChild(bg);

    // 게이지 placeholder — bg 위, label 아래. setKeyIconProgress 가 채운다.
    const gauge = new Graphics();
    c.addChild(gauge);

    // Font ~70% of box size for readability
    const fontSize = Math.max(4, Math.floor(size * 0.65));
    const label = new BitmapText({
      text: key.toUpperCase(),
      style: { fontFamily: PIXEL_FONT, fontSize, fill: KEY_BOX_TEXT_COLOR },
    });
    label.x = Math.floor((size - label.width) / 2);
    label.y = Math.floor((size - label.height) / 2);
    c.addChild(label);

    // size 를 컨테이너에 stash 해 setKeyIconProgress 가 reflect 없이 사용한다.
    // _keyIconLabel 도 stash — createKeyIconForAction 의 hot-swap 핸들러가
    // children.find 없이 직접 BitmapText 갱신할 수 있도록.
    (c as any)._keyIconSize = size;
    (c as any)._keyIconGauge = gauge;
    (c as any)._keyIconLabel = label;

    return c;
  }

  /**
   * createKeyIcon 으로 만든 [C] 등 키 박스 안에 아래→위로 차오르는 진행률
   * 게이지를 그린다. DEC-035 키컬러 orange 통일.
   *
   *   - LorePopup 입력 잠금 wipe → 게이지로 교체
   *   - 향후 hold-to-confirm (예: 아이템 폐기) 도 동일 헬퍼로 진행률 표기
   *
   * @param icon createKeyIcon() 반환 Container
   * @param progress 0..1 (clamp). 0 이하면 clear 만 하고 숨김.
   */
  static setKeyIconProgress(icon: Container, progress: number): void {
    const gauge = (icon as any)._keyIconGauge as Graphics | undefined;
    const size = (icon as any)._keyIconSize as number | undefined;
    if (!gauge || !size) return;
    gauge.clear();
    if (progress <= 0) return;
    const p = progress >= 1 ? 1 : progress;
    const fillH = size * p;
    gauge.rect(0, size - fillH, size, fillH)
      .fill({ color: KEY_BOX_GAUGE_COLOR, alpha: KEY_BOX_GAUGE_ALPHA });
  }

  /**
   * createKeyIcon 의 GameAction 버전. 디바이스 hot-swap (Shift 패드 잡기 등) 시
   * 글리프가 자동 갱신되도록 InputDeviceTracker.onDeviceChange 를 구독.
   *
   *   - HUD / ControlsOverlay 등 *영구* 아이콘에 사용. 일회성 prompt 는 createKeyIcon 으로 충분.
   *   - 메모리 leak 주의: 컨테이너가 destroy 되어도 listener 는 남는다 — 향후 destroy 훅 추가 검토.
   */
  /**
   * createKeyIcon 의 GameAction 버전. 디바이스 hot-swap 시 글리프 자동 갱신.
   *
   * 구현 노트 (사용자 검증 2026-05-04): PixiJS v8 가 *이미 렌더된* 컨테이너의
   * 자식 변경 (text 갱신·BitmapText 재생성·wrapper inner 교체 모두) 을 시각으로
   * 반영 못하는 케이스가 있어, init 시점에 키보드 + 패드 inner 를 *둘 다 미리
   * 생성* 해 wrapper 에 attach 하고 device flip 시 visible 만 토글한다.
   * visibility 토글은 Pixi 의 가장 기본 동작이라 안정.
   *
   * 브랜드(Xbox/PS/Switch) 가 다른 패드로 swap 되면 그 브랜드 inner 를 lazy
   * 생성 (cache.set). 동일 브랜드 재진입은 cache hit.
   */
  static createKeyIconForAction(action: GameAction, size = KEY_BOX_SIZE): Container {
    const wrapper = new Container();
    /** glyph 문자열 → 해당 inner 컨테이너 캐시. */
    const cache = new Map<string, Container>();

    const ensureInner = (glyph: string): Container => {
      let inner = cache.get(glyph);
      if (!inner) {
        inner = KeyPrompt.createKeyIcon(glyph, size);
        wrapper.addChild(inner);
        cache.set(glyph, inner);
      }
      return inner;
    };

    const showGlyph = (glyph: string): void => {
      const target = ensureInner(glyph);
      for (const [g, c] of cache) c.visible = (g === glyph);
      // setKeyIconProgress 호환 — 현재 보이는 inner 의 stash 를 wrapper 에 미러링.
      KeyPrompt._mirrorIconStash(wrapper, target);
    };

    // Init: 키보드 + 기본 브랜드 (xbox) inner 를 미리 생성. 둘 다 first-render 통과.
    const kbGlyph = (getActiveInput()?.getKeyDisplay(action) ?? '?').toUpperCase();
    const padGlyph = KeyPrompt._padGlyphFor(action, 'xbox');
    if (padGlyph) ensureInner(padGlyph);
    ensureInner(kbGlyph);
    showGlyph(kbGlyph);

    // Device flip 시 적합한 glyph 보이기.
    onDeviceChange(() => {
      showGlyph(actionKey(action).toUpperCase());
    });

    return wrapper;
  }

  /** 액션 → 패드 글리프. 매핑 없으면 null. */
  private static _padGlyphFor(action: GameAction, brand: ControllerBrand): string | null {
    const btns = PAD_BINDINGS[action];
    if (!btns || btns.length === 0) return null;
    return getButtonGlyph(btns[0], brand).toUpperCase();
  }

  /**
   * createKeyIconForAction 의 wrapper 가 setKeyIconProgress 호출 대상이 될 수
   * 있도록 inner 의 stash 를 wrapper 에도 미러링.
   */
  private static _mirrorIconStash(wrapper: Container, inner: Container): void {
    (wrapper as any)._keyIconSize = (inner as any)._keyIconSize;
    (wrapper as any)._keyIconGauge = (inner as any)._keyIconGauge;
    (wrapper as any)._keyIconLabel = (inner as any)._keyIconLabel;
  }

  /**
   * Context prompt ([Z] Save style).
   * @param scale uiScale for native-res rendering (default 1 for world-space)
   */
  static createPrompt(key: string, action: string, scale = 1): Container {
    const c = new Container();
    const s = scale;
    const keySize = CONTEXT_KEY_SIZE * s;
    const fontSize = CONTEXT_FONT_SIZE * s;
    const pad = CONTEXT_PADDING * s;
    const gap = CONTEXT_GAP * s;

    const keyIcon = KeyPrompt.createKeyIcon(key, keySize);
    keyIcon.x = pad;
    keyIcon.y = pad;
    c.addChild(keyIcon);

    const label = new BitmapText({
      text: action,
      style: { fontFamily: PIXEL_FONT, fontSize, fill: CONTEXT_LABEL_COLOR },
    });
    label.x = pad + keySize + gap;
    label.y = pad + Math.floor((keySize - label.height) / 2);
    c.addChild(label);

    // Background panel (auto-sized)
    const totalW = label.x + label.width + pad;
    const totalH = keySize + pad * 2;
    const bg = new Graphics();
    bg.roundRect(0, 0, totalW, totalH, 2 * s)
      .fill({ color: CONTEXT_BG, alpha: CONTEXT_BG_ALPHA });
    c.addChildAt(bg, 0);

    return c;
  }

  /**
   * createPrompt 의 GameAction 버전. 디바이스 hot-swap 시 키 박스 글리프 자동 갱신.
   * 일회성 컨텍스트 프롬프트(상호작용 가까이 갈 때만 보이는 anvil/trapdoor 등) 는
   * 매번 새로 생성되므로 createPrompt + actionKey() 로 충분 — 영구 prompt 에만 사용.
   */
  static createPromptForAction(action: GameAction, label: string, scale = 1): Container {
    const c = KeyPrompt.createPrompt(actionKey(action), label, scale);
    const keyIcon = c.children[1] as Container | undefined;
    const size = keyIcon ? (keyIcon as any)._keyIconSize as number | undefined : undefined;
    if (!keyIcon || !size) return c;
    const fontSize = Math.max(4, Math.floor(size * 0.65));
    onDeviceChange(() => {
      const newText = actionKey(action).toUpperCase();
      const oldLabel = (keyIcon as any)._keyIconLabel as BitmapText | undefined;
      if (oldLabel && oldLabel.text === newText) return;
      const newLabel = new BitmapText({
        text: newText,
        style: { fontFamily: PIXEL_FONT, fontSize, fill: KEY_BOX_TEXT_COLOR },
      });
      keyIcon.addChild(newLabel);
      newLabel.x = Math.floor((size - newLabel.width) / 2);
      newLabel.y = Math.floor((size - newLabel.height) / 2);
      if (oldLabel) keyIcon.removeChild(oldLabel);
      (keyIcon as any)._keyIconLabel = newLabel;
    });
    return c;
  }

  /** Convert e.code to human-readable label */
  static codeToLabel(code: string): string {
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    const map: Record<string, string> = {
      'Space': 'SPC',
      'ShiftLeft': 'SH', 'ShiftRight': 'SH',
      'ControlLeft': 'CT', 'ControlRight': 'CT',
      'ArrowLeft': '\u2190', 'ArrowRight': '\u2192',
      'ArrowUp': '\u2191', 'ArrowDown': '\u2193',
      'Escape': 'ESC', 'Enter': 'ENT', 'Tab': 'TAB',
      'Backspace': 'BS',
    };
    return map[code] || code;
  }
}
