/**
 * FpsCounter.ts — Debug 모드 상시 FPS / Sprite count overlay.
 *
 * Debug.infoVisible (Shift+I) 일 때만 표시. uiContainer 에 native 해상도로 렌더링.
 * 1초마다 갱신 (매 프레임이면 측정 자체가 비용).
 *
 * 표시 항목:
 *   - FPS (1초 평균)
 *   - Frame time (ms, peak)
 *   - Sprite count (stage 트리 walk)
 *   - JS heap (Chromium 한정 — performance.memory)
 */

interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

import { BitmapText, Container, Graphics } from 'pixi.js';
import { PIXEL_FONT } from './fonts';
import { Debug } from '@core/Debug';
import { PerfMonitor } from '@utils/PerfMonitor';

const SAMPLE_INTERVAL_MS = 500; // 0.5s 갱신
const TEXT_COLOR = 0xffe060;
const BG_COLOR = 0x000000;
const BG_ALPHA = 0.65;
const PADDING = 4;

export class FpsCounter {
  container: Container;
  private bg: Graphics;
  private text: BitmapText;

  /** Frame timing 누적 (1초 윈도우). */
  private accumMs = 0;
  private frames = 0;
  private peakFrameMs = 0;

  /** Sprite count 캐시 — 매 프레임 측정 비용 회피. */
  private spriteCount = 0;

  /**
   * @param uiScale Game.uiScale — native 해상도 좌표 변환용.
   */
  constructor(private uiScale: number) {
    this.container = new Container();
    this.container.x = 4 * uiScale;
    this.container.y = 4 * uiScale;

    this.bg = new Graphics();
    this.container.addChild(this.bg);

    this.text = new BitmapText({
      text: 'FPS …',
      style: {
        fontFamily: PIXEL_FONT,
        fontSize: 8 * uiScale,
        fill: TEXT_COLOR,
      },
    });
    this.text.x = PADDING * uiScale;
    this.text.y = PADDING * uiScale;
    this.container.addChild(this.text);

    this.container.visible = false;
    this.redrawBg();
  }

  /**
   * 매 프레임 호출. deltaMs = ticker.deltaMS.
   * stage = Pixi root (sprite count walk 대상).
   */
  update(deltaMs: number, stage: Container): void {
    this.container.visible = Debug.infoVisible;
    if (!Debug.infoVisible) return;

    this.accumMs += deltaMs;
    this.frames++;
    if (deltaMs > this.peakFrameMs) this.peakFrameMs = deltaMs;

    if (this.accumMs >= SAMPLE_INTERVAL_MS) {
      const fps = (this.frames * 1000) / this.accumMs;
      this.spriteCount = countDescendants(stage);
      const memLine = formatMemoryLine();
      // Phase 0.1: 단계별 ms breakdown (PerfMonitor) + 최근 spike.
      const perfLines = PerfMonitor.snapshot()
        .filter(s => s.avgMs >= 0.05) // 0.05ms 미만은 노이즈
        .slice(0, 6)                  // 상위 6개만
        .map(s => `${s.stage.padEnd(14)} ${s.avgMs.toFixed(2).padStart(5)} ms`)
        .join('\n');
      const spikes = PerfMonitor.recentSpikes();
      // spike 요약 + 최신 spike 의 top 3 stage (ms + count).
      let spikeLine = '';
      if (spikes.length > 0) {
        const msList = spikes.map(s => s.totalMs.toFixed(0)).join(',');
        const last = spikes[spikes.length - 1];
        const top3 = last.breakdown.slice(0, 3).map(b => {
          const cnt = b.count > 0 ? `x${b.count}` : '';
          return `← ${b.stage} ${b.ms.toFixed(0)}ms ${cnt}`.trim();
        }).join('\n');
        spikeLine = `spikes ${msList}\n${top3}`;
      }
      this.text.text =
        `FPS  ${fps.toFixed(1).padStart(5)}\n` +
        `peak ${this.peakFrameMs.toFixed(1).padStart(5)} ms\n` +
        `nodes ${this.spriteCount.toString().padStart(5)}` +
        (memLine ? `\n${memLine}` : '') +
        (perfLines ? `\n--\n${perfLines}` : '') +
        (spikeLine ? `\n${spikeLine}` : '');
      this.accumMs = 0;
      this.frames = 0;
      this.peakFrameMs = 0;
      this.redrawBg();
    }
  }

  private redrawBg(): void {
    const w = this.text.width + PADDING * 2 * this.uiScale;
    const h = this.text.height + PADDING * 2 * this.uiScale;
    this.bg.clear();
    this.bg.rect(0, 0, w, h).fill({ color: BG_COLOR, alpha: BG_ALPHA });
  }

  destroy(): void {
    if (this.container.parent) this.container.parent.removeChild(this.container);
    this.container.destroy({ children: true });
  }
}

/**
 * `performance.memory` 는 Chromium 전용 (Firefox/Safari 미지원). 해당 API 가 없으면
 * `null` 을 반환해 표시를 생략한다. used / heap 표시는 MB 단위 (소수 1 자리).
 */
function formatMemoryLine(): string | null {
  const perf = performance as Performance & { memory?: PerformanceMemory };
  const mem = perf.memory;
  if (!mem) return null;
  const usedMB = mem.usedJSHeapSize / (1024 * 1024);
  const totalMB = mem.totalJSHeapSize / (1024 * 1024);
  return `mem  ${usedMB.toFixed(1).padStart(5)} / ${totalMB.toFixed(0)} MB`;
}

/**
 * PIXI Container 트리의 모든 descendant 노드 수 카운트. visible / cullable
 * 무관하게 트리에 등록된 노드 전수. sprite 외 Container 도 포함 (PIXI 의 draw
 * 후보 수). 비용은 노드 수에 비례 — 0.5초마다만 호출.
 */
function countDescendants(c: Container): number {
  let n = 0;
  const stack: Container[] = [c];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    for (const child of cur.children) {
      n++;
      if ((child as Container).children?.length) {
        stack.push(child as Container);
      }
    }
  }
  return n;
}
