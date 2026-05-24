/**
 * PerfMonitor.ts — 게임 루프 단계별 ms 측정 + 5초 평균 + spike 감지.
 *
 * Phase 0.1 (Plan_Perf_60FPS.md) 측정 인프라.
 *
 * 사용:
 *   PerfMonitor.begin('scene.update');
 *   // ... 측정 대상 코드 ...
 *   PerfMonitor.end('scene.update');
 *
 *   const avg = PerfMonitor.avgMs('scene.update'); // 1초 윈도우 평균 (ms)
 *   const all = PerfMonitor.snapshot();             // 모든 stage 평균
 *
 * 비용: performance.now() 2회 + Map 조회. ~0.001ms per call. 측정 단계 10개 이하면 무시 가능.
 * GC spike 감지: 한 프레임 전체 ms > GC_SPIKE_MS 면 spike 카운터 ++, 최근 5건 보관.
 */

const WINDOW_MS = 1000;          // 1초 평균
const GC_SPIKE_MS = 33.34;       // 30fps 미만 = 1프레임 33ms+ = spike 후보
const SPIKE_HISTORY = 5;

type StageStat = {
  /** 활성 frame 누적 ms (윈도우 시작 이후). */
  accumMs: number;
  /** 활성 frame 카운트. */
  frames: number;
  /** 마지막 begin() 시각. -1 = 닫힘 상태. */
  openAt: number;
  /** 직전 윈도우 평균 (ms/frame). 표시용. */
  lastAvgMs: number;
  /** 현재 frame 누적 ms (frameBegin 마다 reset). spike snapshot 용. */
  thisFrameMs: number;
  /** 현재 frame 호출 횟수 (track() 카운트). spike snapshot 용. */
  thisFrameCount: number;
};

/** spike 발생 시 그 frame 의 stage 별 ms + 호출 카운트 캡쳐. */
export type SpikeSnapshot = {
  /** spike 발생 시각 (performance.now). */
  at: number;
  /** 그 frame 의 전체 ms. */
  totalMs: number;
  /** stage → ms (그 frame 의 누적). count 는 track() 호출 시 1+. */
  breakdown: Array<{ stage: string; ms: number; count: number }>;
};

class PerfMonitorImpl {
  private stats = new Map<string, StageStat>();
  /** 윈도우 시작 시각. */
  private windowStart = performance.now();
  /** 마지막 spike 5건 (ms + breakdown). */
  private spikes: SpikeSnapshot[] = [];
  /** 마지막 frame begin 시각 (frameBegin 호출 시 갱신). */
  private frameBeginAt = 0;

  /** 새 frame 시작. spike 감지 트리거 + 직전 frame 의 stage breakdown 캡쳐. */
  frameBegin(): void {
    const now = performance.now();
    if (this.frameBeginAt > 0) {
      const dt = now - this.frameBeginAt;
      if (dt > GC_SPIKE_MS) {
        // 직전 frame 의 stage 별 ms + count breakdown 캡쳐 (큰 → 작은 순).
        const breakdown: Array<{ stage: string; ms: number; count: number }> = [];
        for (const [stage, st] of this.stats) {
          if (st.thisFrameMs >= 0.1 || st.thisFrameCount > 0) {
            breakdown.push({ stage, ms: st.thisFrameMs, count: st.thisFrameCount });
          }
        }
        breakdown.sort((a, b) => b.ms - a.ms);
        this.spikes.push({ at: now, totalMs: dt, breakdown });
        if (this.spikes.length > SPIKE_HISTORY) this.spikes.shift();
      }
    }
    // 새 frame 진입 — 각 stage 의 thisFrameMs/Count reset.
    for (const st of this.stats.values()) {
      st.thisFrameMs = 0;
      st.thisFrameCount = 0;
    }
    this.frameBeginAt = now;
  }

  /** 단계 측정 시작. */
  begin(stage: string): void {
    let st = this.stats.get(stage);
    if (!st) {
      st = { accumMs: 0, frames: 0, openAt: -1, lastAvgMs: 0, thisFrameMs: 0, thisFrameCount: 0 };
      this.stats.set(stage, st);
    }
    st.openAt = performance.now();
  }

  /** 단계 측정 종료 + 누적. begin 미호출 시 무시. */
  end(stage: string): void {
    const st = this.stats.get(stage);
    if (!st || st.openAt < 0) return;
    const ms = performance.now() - st.openAt;
    st.accumMs += ms;
    st.thisFrameMs += ms;
    st.frames += 1;
    st.openAt = -1;
  }

  /**
   * 카테고리 직접 누적 (begin/end 없이). nested 또는 monkey-patch 측정용.
   * 호출자가 ms 계산. count 1+ 도 자동.
   */
  track(category: string, ms: number): void {
    let st = this.stats.get(category);
    if (!st) {
      st = { accumMs: 0, frames: 0, openAt: -1, lastAvgMs: 0, thisFrameMs: 0, thisFrameCount: 0 };
      this.stats.set(category, st);
    }
    st.accumMs += ms;
    st.thisFrameMs += ms;
    st.thisFrameCount += 1;
    st.frames += 1;
  }

  /** 1초 윈도우 경과 시 평균 갱신. Game loop 마지막에 호출 권장. */
  tickWindow(): void {
    const now = performance.now();
    if (now - this.windowStart < WINDOW_MS) return;
    for (const st of this.stats.values()) {
      st.lastAvgMs = st.frames > 0 ? st.accumMs / st.frames : 0;
      st.accumMs = 0;
      st.frames = 0;
    }
    this.windowStart = now;
  }

  /** 단계 평균 ms (직전 윈도우). */
  avgMs(stage: string): number {
    return this.stats.get(stage)?.lastAvgMs ?? 0;
  }

  /** 모든 단계 스냅샷 (정렬: ms 내림차순). */
  snapshot(): Array<{ stage: string; avgMs: number }> {
    const arr: Array<{ stage: string; avgMs: number }> = [];
    for (const [stage, st] of this.stats) {
      arr.push({ stage, avgMs: st.lastAvgMs });
    }
    arr.sort((a, b) => b.avgMs - a.avgMs);
    return arr;
  }

  /** 최근 spike 5건 (frame 시간 33ms+) + 그 frame 의 stage breakdown. */
  recentSpikes(): ReadonlyArray<SpikeSnapshot> {
    return this.spikes;
  }

  /** 디버그용 — 윈도우/spike 초기화. */
  reset(): void {
    this.stats.clear();
    this.spikes = [];
    this.windowStart = performance.now();
    this.frameBeginAt = 0;
  }
}

export const PerfMonitor = new PerfMonitorImpl();
