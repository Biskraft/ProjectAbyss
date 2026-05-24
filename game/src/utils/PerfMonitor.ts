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
};

class PerfMonitorImpl {
  private stats = new Map<string, StageStat>();
  /** 윈도우 시작 시각. */
  private windowStart = performance.now();
  /** 마지막 spike 5건 (ms). */
  private spikes: Array<{ at: number; ms: number }> = [];
  /** 마지막 frame begin 시각 (frameBegin 호출 시 갱신). */
  private frameBeginAt = 0;

  /** 새 frame 시작. spike 감지 트리거. */
  frameBegin(): void {
    const now = performance.now();
    if (this.frameBeginAt > 0) {
      const dt = now - this.frameBeginAt;
      if (dt > GC_SPIKE_MS) {
        this.spikes.push({ at: now, ms: dt });
        if (this.spikes.length > SPIKE_HISTORY) this.spikes.shift();
      }
    }
    this.frameBeginAt = now;
  }

  /** 단계 측정 시작. */
  begin(stage: string): void {
    let st = this.stats.get(stage);
    if (!st) {
      st = { accumMs: 0, frames: 0, openAt: -1, lastAvgMs: 0 };
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
    st.frames += 1;
    st.openAt = -1;
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

  /** 최근 spike 5건 (frame 시간 33ms+). */
  recentSpikes(): ReadonlyArray<{ at: number; ms: number }> {
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
