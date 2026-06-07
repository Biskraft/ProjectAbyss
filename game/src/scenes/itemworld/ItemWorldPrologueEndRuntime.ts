import { Container, Graphics } from 'pixi.js';
import type { LdtkEntity } from '@level/LdtkLoader';
import type { Player } from '@entities/Player';
import { detachDisplayObject } from '@scenes/shared/DisplayObjectLifecycleHelpers';
import { getProgress01 } from '@scenes/shared/NumericHelpers';
import type { Game } from '../../Game';

/**
 * ItemWorldPrologueEndRuntime ??Ch.0 ?꾨·濡쒓렇 醫낅즺 ?쒗??P2.1~P5).
 *
 * 諛쒕룞: scene='prologue' ??4吏痢?`ItemStratum_Prologue_04`)??諛곗튂??LDtk
 * `Trigger` ?뷀떚??TriggerName="prologue_end") 議댁쓣 ?뚮젅?댁뼱媛 ?곗튂?섎㈃ 1??
 *
 * ?쒗??釉붾줈????議곗옉 ?좉툑):
 *   malsoja   : 留먯냼???깆옣(P2.1). ?곗깋 ?몄틦???멸컙???몃윭媛 ?잛븘?ㅻⅨ??鍮꾧탳??.
 *   threat    : ?꾩긽 李??(P3 The Sin). ?붾㈃ ?붿쟾쨌?붾뱾由셋룻뵆?섏떆. 留먯냼?먭? ?꾩긽??李?뒗??
 *   cinematic : 以뚯씤/?꾩쟾 ?붿쟾(P4~P5 Cascade). 寃? ?붾㈃?쇰줈 鍮⑤젮?좊떎.
 *   ??onDone(): ?ъ씠 ?꾩씠?쒓퀎瑜?鍮좎졇?섍? Ch.1(Start_Room_01, 諛깆뾽 蹂듭썝)濡??꾪솚.
 *
 * 留먯냼??鍮꾩＜?쇱? placeholder(Graphics) ???뺤떇 ?ㅽ봽?쇱씠????대뱶 而룹떊 ?꾪듃 誘몄젙
 * (Design_Art_Direction 짠14.4 / Plan_Ch0 짠7 ?붿뿬 ?묒뾽).
 *
 * update() 媛 ?쒗??以?true 瑜?諛섑솚 ???몄텧遺媛 early-return ?섏뿬 寃뚯엫?뚮젅?대?
 * 硫덉텣??WorldEndingRuntime ? ?숈씪 釉붾줈???⑦꽩).
 */

interface ItemWorldPrologueEndRuntimeDeps {
  game: Game;
  getPlayer: () => Player;
  /** ?ъ쓽 ??ㅽ겕由??섏씠???ㅻ쾭?덉씠(寃??. alpha 吏곸젒 ?쒖뼱. */
  getFadeOverlay: () => Graphics;
  /** ?붾뱶 醫뚰몴 ?덉씠????留먯냼??placeholder 遺李? */
  getEntityLayer: () => Container;
  /** scene === 'prologue' ???뚮쭔 諛쒕룞. */
  isPrologue: () => boolean;
  shake: (intensity: number) => void;
  flash: () => void;
  /** ?쒗??醫낅즺 ??Ch.1 ?꾪솚. */
  onDone: () => void;
}

type Phase = 'idle' | 'malsoja' | 'whiteOut' | 'done';

const MALSOJA_MS = 1800;
const WHITE_OUT_MS = 1000;
const FADE_W = 960;
const FADE_H = 544;

export class ItemWorldPrologueEndRuntime {
  private trigger: { x: number; y: number; w: number; h: number } | null = null;
  private phase: Phase = 'idle';
  private timer = 0;
  private malsoja: Container | null = null;
  private malsojaJitter = 0;
  private flashTimer = 0;
  private directorHandoffStarted = false;

  constructor(private readonly deps: ItemWorldPrologueEndRuntimeDeps) {}

  /** LDtk Trigger(TriggerName="prologue_end") 議댁쓣 ?붾뱶 AABB 濡??깅줉. pivot [0,1]=醫뚰븯?? */
  register(entity: LdtkEntity, offX: number, offY: number): void {
    this.trigger = {
      x: offX + entity.px[0],
      y: offY + entity.px[1] - entity.height,
      w: entity.width,
      h: entity.height,
    };
  }

  clear(): void {
    if (this.malsoja) detachDisplayObject(this.malsoja);
    this.malsoja = null;
    this.trigger = null;
    this.phase = 'idle';
    this.timer = 0;
    this.directorHandoffStarted = false;
  }

  /** ?쒗??吏꾪뻾 以묒씠硫?true (寃뚯엫?뚮젅??釉붾줉). */
  update(dt: number): boolean {
    if (this.phase === 'idle') {
      if (!this.trigger || !this.deps.isPrologue()) return false;
      const p = this.deps.getPlayer();
      const cx = p.x + p.width / 2;
      const cy = p.y + p.height / 2;
      const t = this.trigger;
      const inside = cx >= t.x && cx < t.x + t.w && cy >= t.y && cy < t.y + t.h;
      if (!inside) return false;
      this.startSequence();
      return true;
    }
    if (this.phase === 'done') return true;

    this.timer += dt;
    const fade = this.deps.getFadeOverlay();

    if (this.phase === 'malsoja') {
      const k = getProgress01(this.timer, MALSOJA_MS);
      if (this.malsoja) {
        this.malsoja.alpha = k;
        this.malsojaJitter += dt;
        this.malsoja.x = this.malsojaBaseX + Math.sin(this.malsojaJitter * 0.013) * 1.5;
      }
      if (this.timer >= MALSOJA_MS) {
        this.phase = 'whiteOut';
        this.timer = 0;
      }
      return true;
    }

    if (this.phase === 'whiteOut') {
      const k = getProgress01(this.timer, WHITE_OUT_MS);
      this.drawWhiteFade(fade);
      fade.alpha = k;
      this.deps.shake(1 + k * 2);
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.flashTimer = 360;
        this.deps.flash();
      }
      if (this.malsoja) {
        this.malsojaJitter += dt;
        const amp = 1.5 + k * 3;
        this.malsoja.x = this.malsojaBaseX + (Math.random() - 0.5) * amp;
        this.malsoja.y = this.malsojaBaseY + (Math.random() - 0.5) * amp;
        this.malsoja.alpha = 1 - k;
      }
      if (this.timer >= WHITE_OUT_MS) {
        this.phase = 'done';
        fade.alpha = 1;
        this.startDirectorHandoff();
      }
      return true;
    }
    return true;
  }

  private startDirectorHandoff(): void {
    if (this.directorHandoffStarted) return;
    this.directorHandoffStarted = true;
    const started = this.deps.game.transitionDirector.startCoverSwapReveal({
      cover: 'white',
      startCovered: true,
      durationOutMs: 0,
      durationInMs: 0,
      holdFrames: 1,
      onSwap: () => this.deps.onDone(),
    });
    if (!started) this.deps.onDone();
  }

  private drawWhiteFade(fade: Graphics): void {
    fade.clear();
    fade.rect(0, 0, FADE_W, FADE_H).fill(0xffffff);
  }

  private malsojaBaseX = 0;
  private malsojaBaseY = 0;

  private startSequence(): void {
    this.phase = 'malsoja';
    this.timer = 0;
    const p = this.deps.getPlayer();
    // ?뚮젅?댁뼱 ?욎そ(諛붾씪蹂대뒗 諛⑺뼢)???깆옣 ???붾㈃ ?덉뿉 ?ㅼ뼱?ㅻ룄濡?
    const dir = p.facingRight ? 1 : -1;
    this.malsojaBaseX = p.x + p.width / 2 + dir * 56;
    this.malsojaBaseY = p.y + p.height;
    this.malsoja = this.buildMalsojaPlaceholder();
    this.malsoja.x = this.malsojaBaseX;
    this.malsoja.y = this.malsojaBaseY;
    this.malsoja.alpha = 0;
    this.deps.getEntityLayer().addChild(this.malsoja);
  }

  /**
   * 留먯냼??placeholder ???곗깋 ?몄틦???멸컙???ㅻ（??32px ??. 湲멸쾶 ?섏뼱??紐?
   * ?뺤껜瑜????쒕윭?댁? ?딅뒗 怨듯뿀(遺덇?吏쨌怨좊룆 ?먯튃). ?뺤떇 ?꾪듃 援먯껜 ?덉젙.
   */
  private buildMalsojaPlaceholder(): Container {
    const c = new Container();
    const g = new Graphics();
    // 諛쒖튂 洹몃┝??
    g.ellipse(0, 0, 16, 5).fill({ color: 0x000000, alpha: 0.35 });
    // 湲멸쾶 ?섏뼱????紐명넻(pivot=諛쒖튂, ?꾨줈 ?잛쓬).
    g.moveTo(-10, -2);
    g.bezierCurveTo(-13, -34, -7, -64, 0, -76);
    g.bezierCurveTo(7, -64, 13, -34, 10, -2);
    g.closePath();
    g.fill({ color: 0xf4f4f8, alpha: 0.92 });
    // 癒몃━(?뺤껜 遺덈챸?? ???댁쭩 湲곗슫 ???
    g.ellipse(0, -80, 8, 11).fill({ color: 0xfafaff, alpha: 0.95 });
    // 怨듯뿀(?쇨뎬 ?먮━) ???댄빐 遺덇??μ꽦.
    g.ellipse(1, -80, 3.5, 6).fill({ color: 0x05060a, alpha: 0.9 });
    c.addChild(g);
    return c;
  }
}

