/**
 * textureInstrumentation.ts — dynamic texture 생성 호출 사이트 추적 (?debug 한정).
 *
 * Phase 1.B.5 (Plan_Perf_60FPS.md). spike 원인 후보:
 *   - renderer.generateTexture(target)
 *   - RenderTexture.create(options)
 *
 * 각 호출을 PerfMonitor.track('gpu.genTexture' / 'gpu.rtCreate', ms) 로 누적.
 * spike snapshot 의 breakdown 에 등장하면 그 frame 의 dynamic texture 작업이 원인.
 *
 * 호출 비용: performance.now() × 2 = ~0.001ms per call. 측정 noise 무시 가능.
 *
 * 활성화: `?debug` URL 일 때만. main.ts 가 init 후 호출.
 */

import { RenderTexture, TexturePool, type Renderer } from 'pixi.js';
import { PerfMonitor } from './PerfMonitor';

let installed = false;

export function installTextureInstrumentation(renderer: Renderer): void {
  if (installed) return;
  installed = true;

  // 1) renderer.generateTexture(target)
  // PIXI v8: Renderer 의 인스턴스 메서드. type 보존 위해 bind + wrap.
  const origGenerate = renderer.generateTexture.bind(renderer);
  (renderer as unknown as { generateTexture: typeof origGenerate }).generateTexture = ((...args: Parameters<typeof origGenerate>) => {
    const t0 = performance.now();
    try {
      return origGenerate(...args);
    } finally {
      PerfMonitor.track('gpu.genTexture', performance.now() - t0);
    }
  }) as typeof origGenerate;

  // 2) RenderTexture.create(options) — static factory.
  const origRtCreate = RenderTexture.create;
  (RenderTexture as unknown as { create: typeof origRtCreate }).create = ((options) => {
    const t0 = performance.now();
    try {
      return origRtCreate(options);
    } finally {
      PerfMonitor.track('gpu.rtCreate', performance.now() - t0);
    }
  }) as typeof origRtCreate;

  // 3) TexturePool.getOptimalTexture — Filter/Mask 가 내부적으로 RT 가져옴.
  //    pool 재사용 시 빠르지만 새 size 요청 시 새 alloc → spike 후보.
  const pool = TexturePool as unknown as {
    getOptimalTexture: (w: number, h: number, r: number, a: boolean, m?: boolean) => unknown;
  };
  const origGetOptimal = pool.getOptimalTexture.bind(TexturePool);
  pool.getOptimalTexture = ((w, h, r, a, m) => {
    const t0 = performance.now();
    try {
      return origGetOptimal(w, h, r, a, m);
    } finally {
      PerfMonitor.track('gpu.poolGet', performance.now() - t0);
    }
  }) as typeof pool.getOptimalTexture;

  console.info('[perf] texture instrumentation installed (gpu.genTexture, gpu.rtCreate, gpu.poolGet)');
}
