> **✅ 3스탯 체계 적용 완료:** ATK 게이트로 치환 완료. System_World_StatGating.md 참조.

# 취침 전 작업 브리프 — T-12, T-13, T-15, T-16, T-17, T-20

> 가벼운 작업 6개. 각각 독립적이므로 순서 무관. 하루 1~2개씩 소화 가능.

---

## T-12: 세라 실루엣 (Screen 17)

### 스펙
대장간에서 밖으로 나가기 직전, 에코가 1초 진동 → 에르다가 위를 봄 → 지붕 위 여성 실루엣 → "...누구지." 독백 → 화면 전환 시 사라짐.

### 구현

**트리거:** `dialogues.ts`에 event 트리거 등록. Screen 16(마르타 쪽지) 대화 완료 후 자동 발화.

```typescript
// dialogues.ts 에 추가
{
  id: 'screen17_sela_silhouette',
  type: 'event',
  eventName: 'marta_note_complete',
  once: true,
  lines: [
    { text: '...누구지.' },
  ],
}
```

**실루엣 엔티티:** 별도 클래스 불필요. LdtkWorldScene 내 임시 Graphics로 처리.

```typescript
// LdtkWorldScene.ts — marta_note_complete 이벤트 핸들러 안에서:
// 1. 에코 진동 연출 (player 스프라이트 1초 떨림)
//    - player.container에 x 오프셋 ±1px, 60fps로 1초간 진동
// 2. 지붕 위에 반투명 여성 실루엣 Graphics 생성
//    - 단순 검은 타원(머리) + 직사각형(몸통), alpha 0.6
//    - 위치: 대장간 지붕 좌표 (LDtk 레벨 기준 상단)
// 3. 대화 "...누구지." 표시 (DialogueManager.fireEvent)
// 4. 대화 완료 후 실루엣 alpha 0→0 페이드아웃 (500ms)
// 5. 실루엣 Graphics destroy
```

**주의:** 상호작용 불가. 공격 불가. 충돌 없음. 순수 시각 연출.

**완료 기준:**
- [ ] 마르타 쪽지 대화 후 에코 진동 1초 재생
- [ ] 지붕 위 검은 실루엣 표시
- [ ] "...누구지." 독백 표시
- [ ] 대화 종료 후 실루엣 페이드아웃

---

## T-13: 마르타 쪽지 현현 (Screen 16)

### 스펙
에코를 선반에 올려놓으면 선반 뒤에서 쪽지 떨어짐. 펼치면 처음엔 빈 종이. 1~2초 후 글씨 페이드인.

### 구현

**트리거:** Screen 15(대장간 귀환) 대사 시퀀스 끝에 자동 연결.

**쪽지 연출 순서:**
1. 에코를 선반에 올려놓는 대사 후 → 쪽지 떨어지는 SFX (있으면)
2. 대화 시스템으로 빈 종이 표현:
```typescript
// dialogues.ts
{
  id: 'screen16_marta_note',
  type: 'event',
  eventName: 'echo_shelved',
  once: true,
  lines: [
    // 빈 종이 → 글씨 나타남은 DialogueBox 특수 모드로 처리
    { speaker: '쪽지', speakerColor: 0xcc88ff, text: '...' },  // 1~2초 대기
    { speaker: '쪽지', speakerColor: 0xcc88ff, text: '에르다야.' },
    { speaker: '쪽지', speakerColor: 0xcc88ff, text: '에코가 처음 울렸다면 이 글이 보일 거다.' },
    { speaker: '쪽지', speakerColor: 0xcc88ff, text: '놀라지 마. 에코는 원래 그런 망치야.' },
    { speaker: '쪽지', speakerColor: 0xcc88ff, text: '네가 준비되면 다시 울릴 수 있어.' },
    { speaker: '쪽지', speakerColor: 0xcc88ff, text: '— 마르타' },
    // 에르다 반응
    { text: '...스승님.' },
    { text: '10년 전에 사라지고. 남긴 건 이 대장간이랑 에코뿐이었는데.' },
    { text: '에코가 원래 그런 망치라고? 그러면 스승님도...' },
  ],
}
```

**특수 잉크 연출 (선택):**
DialogueBox에 간단한 페이드인 효과 추가 가능:
- `'...'` 라인 표시 시 bodyText alpha를 0→1로 1.5초 페이드
- 또는 MVP에서는 단순히 `'...'` 1줄 표시 후 Z키로 다음 줄 진행 (페이드 없이)

**최소 구현은 대사 데이터 등록만으로 완료.** 페이드인 연출은 폴리시.

**완료 기준:**
- [ ] 에코 선반 올리기 후 쪽지 대화 자동 발화
- [ ] 마르타 쪽지 6줄 + 에르다 반응 3줄 순차 표시
- [ ] 1회만 재생 (재방문 시 미발화)

---

## T-15: TitleScene (Screen 0)

### 스펙
검은 화면에 의뢰서 텍스트 → "Press Any Key" → LdtkWorldScene 전환.

### 구현

**파일:** `game/src/scenes/TitleScene.ts` (신규)

```typescript
import { Graphics, BitmapText } from 'pixi.js';
import { Scene } from '@core/Scene';
import { PIXEL_FONT } from '@ui/fonts';
import type { Game } from '../Game';
import { LdtkWorldScene } from './LdtkWorldScene';

export class TitleScene extends Scene {
  private canProceed = false;

  async init(): Promise<void> {
    // 검은 배경 (기본)

    // 의뢰서 텍스트 (Screen 0 원문)
    const lines = [
      '의뢰서: 낡은 검 수리.',
      '선불 30동화.',
      '장소: 성채 외곽 벤-나흐트 대장간.',
      '의뢰인 이름: 없음.',
    ];

    let y = 100;
    for (const line of lines) {
      const text = new BitmapText({
        text: line,
        style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xcccccc },
      });
      text.anchor.set(0.5, 0);
      text.x = 240;
      text.y = y;
      this.container.addChild(text);
      y += 16;
    }

    // "Press Any Key" (1.5초 후 표시, 깜빡임)
    const hint = new BitmapText({
      text: 'PRESS ANY KEY',
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0x666666 },
    });
    hint.anchor.set(0.5, 0);
    hint.x = 240;
    hint.y = 200;
    hint.visible = false;
    this.container.addChild(hint);

    setTimeout(() => {
      hint.visible = true;
      this.canProceed = true;
    }, 1500);

    // 깜빡임은 update에서 처리
    (this as any)._hint = hint;
  }

  update(dt: number): void {
    // 깜빡임
    const hint = (this as any)._hint as BitmapText;
    if (hint?.visible) {
      hint.alpha = 0.5 + Math.sin(Date.now() / 400) * 0.5;
    }

    // 아무 키 입력
    if (this.canProceed && this.game.input.anyKeyJustPressed()) {
      this.game.sceneManager.replace(new LdtkWorldScene(this.game));
    }
  }
}
```

**main.ts 수정:**
```typescript
// 기존: await game.sceneManager.push(new LdtkWorldScene(game));
// 변경: await game.sceneManager.push(new TitleScene(game));
```

**InputManager 수정 (필요 시):**
`anyKeyJustPressed(): boolean` 메서드 추가. 기존 `justPressed` 맵에서 아무 키나 true면 반환.

**완료 기준:**
- [ ] 게임 시작 시 의뢰서 텍스트 4줄 표시
- [ ] 1.5초 후 "PRESS ANY KEY" 깜빡임
- [ ] 아무 키 → LdtkWorldScene 전환

---

## T-16: EndScene (Screen 22+)

### 스펙
30분 마무리 독백 후 페이드 아웃 → 플레이 통계 → "The Abyss deepens..."

### 구현

**파일:** `game/src/scenes/EndScene.ts` (신규)

**트리거:** Screen 22 마무리 독백("이번엔 내가 직접") 완료 후, LdtkWorldScene에서 EndScene으로 전환.

```typescript
export class EndScene extends Scene {
  async init(): Promise<void> {
    // 2초 암전 유지

    // 통계 표시 (3초 후)
    // - 처치한 적 수: game.stats.enemiesKilled
    // - 획득한 아이템 수: game.stats.itemsCollected
    // - 깨뜨린 게이트 수: game.stats.gatesBroken
    // - 플레이 시간: game.stats.playTimeMs → MM:SS 포맷

    // 5초 후 하단에:
    // "The Abyss deepens..."

    // 8초 후:
    // "PRESS ANY KEY TO RETURN TO TITLE"
  }
}
```

**Game.ts에 통계 추적 추가:**
```typescript
// Game 클래스에 stats 객체 추가
stats = {
  enemiesKilled: 0,
  itemsCollected: 0,
  gatesBroken: 0,
  playTimeMs: 0,
};
```
- `enemiesKilled`: Enemy.onDeath 시 +1
- `itemsCollected`: ItemDrop 픽업 시 +1
- `gatesBroken`: StatGate 파괴 시 +1
- `playTimeMs`: update 루프에서 dt 누적

**완료 기준:**
- [ ] 마무리 독백 후 화면 페이드 아웃
- [ ] 4개 통계 항목 표시
- [ ] "The Abyss deepens..." 텍스트 표시
- [ ] 아무 키 → TitleScene 복귀

---

## T-17: 튜토리얼 힌트 5종

### 스펙
상황별 1회 팝업. 반투명 패널, 4초 후 자동 소멸 또는 Z키 스킵.

### 구현

**파일:** `game/src/ui/TutorialHint.ts` (신규)

기존 Toast와 유사하되, 위치가 다르고 (화면 상단 중앙), 배경 패널이 있음.

```typescript
export class TutorialHint {
  private shown: Set<string> = new Set();
  // Toast와 동일한 구조, 위치만 상단, 배경 반투명 박스

  tryShow(id: string, text: string): void {
    if (this.shown.has(id)) return;
    this.shown.add(id);
    // 반투명 박스 + 텍스트 표시
    // 4초 후 페이드아웃 또는 Z키로 즉시 닫기
  }
}
```

**5개 힌트 ID + 텍스트 + 트리거:**

| ID | 텍스트 | 트리거 위치 |
|:--|:--|:--|
| `hint_combat` | ← →: 이동  Z: 공격  X: 점프 | Screen 1 진입 (첫 번째 방) |
| `hint_item` | 아이템 위를 지나가면 자동 획득 | 첫 ItemDrop 스폰 시 |
| `hint_portal` | ↑: 기억의 지층 진입 | 첫 Portal 스폰 시 |
| `hint_gate` | 장비를 강화하면 장벽을 뚫을 수 있습니다 | StatGate 최초 접촉 시 |
| `hint_inventory` | TAB: 인벤토리  Z: 장착/해제 | 첫 아이템 획득 후 3초 뒤 |

**연동:** LdtkWorldScene.ts에서 각 이벤트 발생 시 `tutorialHint.tryShow(id, text)` 호출.

**완료 기준:**
- [ ] 5개 힌트가 각각 해당 상황에서 1회만 표시
- [ ] 4초 후 자동 소멸
- [ ] Z키로 즉시 닫기 가능
- [ ] 재방문/재시작 시 미표시 (세션 내 1회)

---

## T-20: 풀 플레이테스트

### 스펙
Build 0 전체를 30분 연속 플레이하며 이슈를 기록한다.

### 체크리스트

**기능 검증:**
- [ ] 타이틀 화면 → 키 입력 → Entrance 스폰
- [ ] Screen 1~6: 이동/점프/전투 정상
- [ ] Screen 6.5: 능력 게이트 시각적 차단 + 에르다 독백
- [ ] Screen 7~8: 대장간 진입 + 모루 위 검 상호작용
- [ ] Screen 9: 에코 공명 → 바닥 붕괴 → 아이템계 진입
- [ ] Screen 10~12: 아이템계 탐험 + 전투
- [ ] Screen 13: 보스 처치 → "+8 ATK" UI
- [ ] Screen 14: 탈출 제단 → 대장간 귀환
- [ ] Screen 15: No.1 구체 에코 부착 + 에르다 독백
- [ ] Screen 16: 마르타 쪽지 현현 + 에르다 반응
- [ ] Screen 17: 세라 실루엣 (있으면)
- [ ] Screen 18: 허브 도착 + 이렌 다스 대화
- [ ] Screen 19: 오렌 대화 + 의뢰 수락
- [ ] Screen 20-21: 지하 균열 + ATK 게이트 노출
- [ ] Screen 22: 의뢰 완료 + 마무리 독백 → EndScene
- [ ] 세이브/로드 후 진행 보존

**경험 검증 (주관):**
- [ ] 에코 공명이 "와!" 모먼트인가? (감정적 닻점 역할)
- [ ] "+8 ATK" 표시가 핵심 루프 클릭을 유발하는가?
- [ ] 대사가 플레이 흐름을 끊는 구간이 있는가? (어디?)
- [ ] 오디오가 전투 쾌감을 증폭하는가?
- [ ] ATK 게이트 앞에서 "아이템계를 더 돌면 열 수 있겠다"고 자연스럽게 느끼는가?
- [ ] 30분 완료 후 "한 번 더" 의욕이 드는가?

**타이밍 측정:**
- [ ] 총 플레이 시간: ___분
- [ ] Act 1 (숲길): ___분 (목표 8분)
- [ ] Act 2 (대장간+공명): ___분 (목표 4분)
- [ ] Act 3 (아이템계): ___분 (목표 6분)
- [ ] Act 4-5 (귀환+거부): ___분 (목표 4분)
- [ ] Act 6-7 (허브+게이트): ___분 (목표 8분)

**이슈 기록 포맷:**
```
[시간] [Screen] [심각도 H/M/L] 설명
예: [12:30] [Screen 13] [M] 보스 처치 후 "+8 ATK" 텍스트가 너무 작아서 못 봄
```
