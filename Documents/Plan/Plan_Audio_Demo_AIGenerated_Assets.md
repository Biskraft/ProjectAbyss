# Plan: Audio Demo — AI 생성 자산 워크플로우

> **문서 ID:** PLN-AUD-DEMO-01
> **작성일:** 2026-05-04
> **목적:** 데모 테스트 (echoris.io + itch.io) 사운드 자산 12건+ 을 Victor가 직접 AI 도구로 생성 → 통합하기 위한 *복붙 가능한 작업 시트*
> **선행 문서:**
> - `Documents/System/System_Audio_Direction.md` — 디렉션 SSoT (자산 매트릭스·영구 룰·파일명 컨벤션)
> - `memory/wiki/decisions/DEC-040-Audio-Pipeline.md` — @pixi/sound + ElevenLabs AI 100% + 무음 페이드 결정
> **사용자 컨텍스트:** Victor 는 사운드 도메인 지식 부족 (`memory/user_audio_low_knowledge.md`). 본 문서는 *판단 없이 따라하면 작동*하는 절차로 설계되었다.

---

## 0. 결정 요약 (선택지 없음 — 직접 결정 후 보고)

| 항목 | 결정 | 근거 |
|:---|:---|:---|
| 1차 도구 (SFX) | **ElevenLabs Sound Effects** | DEC-040 §결정 4 1차 레퍼런스 |
| 1차 도구 (BGM) | **ElevenLabs Music** | DEC-040 §결정 4 동일 플랫폼 일관성 |
| 검 Ego 보이스 | **사용 X** (타이핑 SFX 로 대체) | DEC-040 §결정 2. 베타 진입 시 재검토 |
| 백업 BGM 도구 | **도입 X** (1차 단일 플랫폼 우선) | 일관성 우선. ElevenLabs Music 이 부족하면 본 룰 폐기 후 AIVA 검토 |
| 1차 플랜 등급 | **무료 시작 → 라이선스 약관 캡처 후 유료 결정** | DEC-040 §다음 액션 3 |
| Suno / Udio | **사용 금지** | DEC-040 §폐기 — 학습 데이터 분쟁 회피 |
| 변환 도구 | **Audacity (무료) + ffmpeg (무료)** | 라이선스·비용 0 |
| 자산 1차 합계 | **20 항목 (변주 포함 ~50 파일)** | `System_Audio_Direction.md` §12-3 P0 게이트 |
| 출시 데모 품질 | **baseline 보장만** | 데모 테스트 = 검증용. 출시 전 인간 외주 교체 후속 결정 |

---

## 1. 사전 준비 (1회성, ~30분)

### 1-1. ElevenLabs 계정 가입

1. https://elevenlabs.io/ 접속
2. 우측 상단 *Sign Up* → 이메일 가입 (무료 플랜)
3. 로그인 후 좌측 메뉴 *Sound Effects* 와 *Music* 항목 확인
4. 프로필 → *Subscription* 페이지에서 **무료 플랜의 SFX/Music 한도 캡처** (스크린샷 보관)
5. *Terms of Service* + *Commercial Use* 약관 페이지 캡처 (라이선스 검증, DEC-040 §다음 액션 3)

> **검증 항목 (스크린샷 후 확인):**
> - [ ] 무료 플랜 상업적 사용 가능 여부
> - [ ] 학습 데이터 출처 표기 여부
> - [ ] 생성 자산의 저작권 귀속 (사용자 vs ElevenLabs)
> - [ ] 출처 명시 의무 여부

### 1-2. 변환 도구 설치

- **Audacity** — https://www.audacityteam.org/ (무료, 트리밍·루프 처리)
- **ffmpeg** — https://www.gyan.dev/ffmpeg/builds/ (Windows 빌드 다운로드 → PATH 등록)

설치 검증:
```powershell
ffmpeg -version
```

### 1-3. 작업 폴더 구조

```powershell
cd C:\Users\Victor\Documents\Works\ProjectAbyss
mkdir game\public\assets\audio
mkdir game\public\assets\audio\sfx
mkdir game\public\assets\audio\amb
mkdir game\public\assets\audio\mus
mkdir _audio_workdir
mkdir _audio_workdir\raw_mp3
mkdir _audio_workdir\trimmed_wav
```

`_audio_workdir/` 는 *임시 작업 폴더* (게임 빌드에 포함 X). `.gitignore` 에 추가 권장.

---

## 2. 워크플로우 (자산 1건당 ~5분)

```
[ElevenLabs UI]
  ↓ ① 영문 프롬프트 입력 (§3)
  ↓ ② Generate 클릭 (3~5회 반복하여 변주 생성)
  ↓ ③ 베스트 변주 1개 선별 (§4 큐레이션 가이드)
  ↓ ④ MP3 다운로드 → _audio_workdir/raw_mp3/

[Audacity]
  ↓ ⑤ MP3 import → 트리밍 (앞뒤 무음 제거)
  ↓ ⑥ 루프 자산만: 크로스페이드 0.5초 적용 (Edit → Crossfade)
  ↓ ⑦ Export as WAV → _audio_workdir/trimmed_wav/

[ffmpeg]
  ↓ ⑧ WAV → OGG 변환 + LUFS 정규화 (§5 명령어 시트)
  ↓ ⑨ 파일명 컨벤션 적용 → game/public/assets/audio/

[코드]
  ⑩ @pixi/sound 통합 (별도 작업, lead-programmer 위임)
```

---

## 3. 프롬프트 시트 — 영문 strict (복붙용)

> **사용법:** ElevenLabs Sound Effects / Music 입력창에 *영문 프롬프트 그대로 복사*. 파라미터(길이·loop) 는 별도 옵션으로 설정.
> **변주:** 각 자산 3~5회 Generate 후 베스트 1 선별.
> **금지어:** "cute", "happy", "uplifting", "bright", "casual" — CLAUDE.md §타깃 비타깃 신호 (친절함·부드러움·캐주얼) 회피.

### 3-1. 환경 베드 (Sound Effects, loopable)

#### #1 World Tier 2/3 Environmental Bed
```
Industrial megastructure ambience, vast cavernous reverb, low 60Hz drone foundation, distant builder footsteps barely audible, faint metallic structure groans, ventilation airflow, ghost industrial atmosphere, BLAME manga inspired, no melody, no human voice, no music, loopable 30 seconds
```
- 길이: 30s — Loop: ON — 파일: `amb_world_shaft_tier3_bed.ogg`

#### #2 Plaza Environmental Bed (Item World hub)
```
Quiet vast plaza ambience inside abandoned megastructure, broken ceiling debris occasionally falling in distance, faint cyan data terminal hum at low 60Hz, residual humanoid breathing barely audible, sacred silence, Murakami End-of-the-World empty plaza atmosphere, library hush, no melody, no voice, loopable 30 seconds
```
- 길이: 30s — Loop: ON — 파일: `amb_iw_plaza_bed.ogg`

#### #3 Memorial / Old Well Environmental Bed (Archive shrine)
```
Ancient library silence, faint paper rustling, soft dust falling, low cyan data cube synchronization hum, archive node ambience, Murakami librarian dream-reading mood, BLAME data preservation node, deeply quiet, no melody, no voice, loopable 30 seconds
```
- 길이: 30s — Loop: ON — 파일: `amb_iw_memorial_bed.ogg`

#### #4 Inner Sanctum Environmental Bed (boss chamber)
```
Boss chamber ambience before fight, deep sub-bass seal hum, giant shadow entity faint breathing, oppressive silence, low frequency 30-60Hz dominant, distant warning drone, sealed presence awakening, no melody, no voice, 15 seconds
```
- 길이: 15s — Loop: OFF — 파일: `amb_iw_sanctum_bed.ogg`

#### #5 Rust Lane Environmental Bed (Rustborn 1차 다이브 전용, P0)
```
Forgotten alley ambience, light rain noise without rainfall feeling, corroded metal creaks, low cello drone in C minor, distant ghost forge hammer ring every 90 seconds at very low volume, ghost forge memory atmosphere, the rain forgot this street, the smith departed long ago, melancholy and absence, no melody, no voice, loopable 30 seconds
```
- 길이: 30s — Loop: ON — 파일: `amb_iw_lane_rust_bed.ogg`

### 3-2. 거리 이벤트 (Sound Effects, one-shot)

#### #6 Plaza Memorial Bell
```
Single low bronze memorial bell chime at 200-600Hz fundamental, ceremonial Murakami End-of-the-World town bell, slow attack, 4-6 second reverb tail, deep mourning resonance, Hollow Knight Resting Grounds inspired, no melody, no voice, single strike, 6 seconds total
```
- 길이: 6s — 파일: `sfx_iw_plaza_bell_01.ogg`

#### #7 Plaza Cyan Data Chirp
```
Brief cyan data terminal synchronization chirp, high frequency 4-8kHz, 0.05 second click, BLAME megastructure data node pulse, electronic sync signal, no melody, no voice
```
- 길이: 0.05s — 파일: `sfx_iw_plaza_chirp_01.ogg`

#### #8 Memorial Page Turn
```
Soft paper page turn, gentle parchment rustle in library silence, no other sounds, intimate close-mic, 1 second
```
- 길이: 1s — 파일: `sfx_iw_memorial_pageturn_01.ogg`

### 3-3. 검 Ego 사인음 — Rustborn (Sound Effects, one-shot)

#### #9 Rustborn Awaken
```
High pitched metallic awakening chime at 3-6kHz, rusted blade catching light for the first time in centuries, faint sword harmonic resonance, brief 0.4 second reverb, awakening of dormant consciousness, no melody, no voice, 1.2 seconds
```
- 길이: 1.2s — 파일: `sfx_ego_awaken_01.ogg`

#### #10 Rustborn Speak-In Sting
```
Brief metallic ping at G6 (1.6kHz), single forged hard-edge tick, sword speaking sting cue, dry attack with minimal decay, no melody, no voice, 0.15 seconds
```
- 길이: 0.15s — 파일: `sfx_ego_speakin_t0_01.ogg`

#### #11 Rustborn Type-Tick (4 variations)
```
Very short metallic typewriter click, forged hard edge sword character, 30 millisecond duration, single dry click with no resonance, sword speaking text typing sound, generate 4 unique micro-variations
```
- 길이: 0.03s × 4 — 파일: `sfx_ego_typetick_01.ogg` ~ `sfx_ego_typetick_04.ogg`

### 3-4. 발소리 (Sound Effects, one-shot 6종)

#### #12 Footsteps — 3 surfaces × 2 variations
```
[Metal grate] Sharp metal grate footstep, brief tap with short metallic resonance, 0.2 second, generate 2 distinct variations
[Corroded metal] Corroded rusty metal footstep, low rusty creak with thump, 0.2 second, generate 2 distinct variations
[Wet residue] Wet residue footstep, faint splash with low thud, 0.2 second, generate 2 distinct variations
```
- 파일: `sfx_player_footstep_metal_{01,02}.ogg`, `sfx_player_footstep_rust_{01,02}.ogg`, `sfx_player_footstep_wet_{01,02}.ogg`

### 3-5. Rustborn 히트 SFX 8종 (Sound Effects, one-shot)

#### #13 Combat Hits
```
[Slash 1] Rusted blade slash whoosh, metallic friction with rust scraping, mid-high 2-8kHz, 0.3 second
[Impact 1] Rusted sword first hit on shadow flesh, dry "chang" sound at 200-1200Hz, 0.2 second
[Impact 2] Rusted sword second hit, slightly higher pitch (+3% to first), dry "chang+" sound, 0.2 second
[Impact 3] Rusted sword third hit finisher, deep "kwang" at +7% pitch with low frequency 150-400Hz emphasis, 0.3 second
[Finisher resonance] Rustborn 3rd hit resonance ringing tail, 0.3 second of metallic sword resonance
[Hit reaction] Shadow entity scattering noise, 0.1 second short noise burst with light dissipation
[Critical hit] Higher pitched critical strike, sharp metallic clang, 0.25 second
[Killing blow] Final blow with extended metallic resonance, 0.5 second
```
- 파일: `sfx_combat_rustborn_whoosh_01.ogg`, `sfx_combat_rustborn_impact_{01,02,03}.ogg`, `sfx_combat_rustborn_finisher_01.ogg`, `sfx_combat_shadow_hitreact_01.ogg`, `sfx_combat_rustborn_crit_01.ogg`, `sfx_combat_rustborn_kill_01.ogg`

### 3-6. 진입 페이드 + Trapdoor 시퀀스 6종 (Sound Effects, one-shot)

#### #14 Item World Entry Sequence
```
[Anvil resonance] Anvil surface micro resonance when interacted, low high frequency hum, 0.3 second
[Trapdoor activate] Orange forge-light pillar activation, low warm hum + high frequency spark, 0.5 second
[Floor crack] Metal concrete cracking and shattering, deep low frequency cracking with debris, 0.5-1.0 second
[Descent wind] Falling air whoosh, gradually intensifying from quiet to loud, diegetic falling, 1 second
[Erda breath hold] Held breath silence then sharp air intake at the end, 1.5 seconds total
[Plaza emergence chime] Re-entry chime as new plaza environment fades in, faint resonance, 0.5 second
```
- 파일: `sfx_iw_anvil_resonance.ogg`, `sfx_iw_trapdoor_activate.ogg`, `sfx_iw_floor_crack.ogg`, `sfx_iw_descent_wind.ogg`, `sfx_player_breath_dive.ogg`, `sfx_iw_plaza_emerge.ogg`

### 3-7. 메모리 코어 펄스 5색 기질 (Sound Effects, one-shot)

#### #15 Core Memory Pulse — 5 temperaments
```
[Forge] Forge hammer single strike + ember hiss tail, anger temperament orange tone, 0.6 second
[Iron] Cyan-teal bell chime + crystal ping, resolve temperament cool tone, 0.6 second
[Rust] Corrosion noise + low cello single note, melancholy temperament gray tone, 0.6 second
[Spark] White light chime three notes ascending, curiosity temperament pale yellow tone, 0.6 second
[Shadow] Sub-bass + brief whistle tail, cunning temperament dark purple tone, 0.6 second
```
- 파일: `sfx_iw_corepulse_{forge,iron,rust,spark,shadow}_01.ogg`

### 3-8. BGM 5종 (Music, loopable)

> **BGM 동기화 주의:** Tier 3 탐험 / 전투 BGM 은 같은 BPM·키·마디 수·루프 포인트를 공유해야 한다 (`System_Audio_Direction.md` §14 예외 처리). 두 트랙을 *같은 세션에서 연달아 생성* 하고, 두 번째 프롬프트에 *"Same key as previous, BPM 60"* 명시.

#### #16 World Tier 3 Exploration BGM
```
ElevenLabs Music — Minimalist industrial ambient exploration BGM, BLAME megastructure mood, melancholic cello and viola lead, sparse industrial percussion, synth pad foundation, no vocals, no dominant melody, atmospheric, slow tempo 60 BPM, key A minor, Hollow Knight Christopher Larkin inspired, 2-3 minutes loopable
```
- 파일: `mus_explore_tier3_calm_loop.ogg`

#### #17 World Tier 3 Combat BGM
```
ElevenLabs Music — Same key A minor and BPM 60 as Tier 3 exploration, BLAME industrial combat tension, added drum kit and bass percussion layer, melancholic cello sustained, no vocals, atmospheric combat, 2-3 minutes loopable, must align bar count with exploration version
```
- 파일: `mus_combat_tier3_intense_loop.ogg`

#### #18 Rust Lane BGM (Rustborn 1차 다이브)
```
ElevenLabs Music — Rust temperament item world combat loop, low cello drone foundation in C minor, light rain noise texture, occasional ghost forge hammer ring at very low volume every 90 seconds, melancholy combat tension, the smith departed atmosphere, Dead Cells Yoann Laulan inspired metallic rhythm but slower and more melancholic, no vocals, 2-3 minutes loopable
```
- 파일: `mus_iw_lane_rust_loop.ogg`

#### #19 Common Boss BGM (Sanctum)
```
ElevenLabs Music — Item world boss chamber BGM, sub-bass seal foundation, aggressive percussion layer, oppressive shadow giant atmosphere, Made in Abyss Kevin Penkin Idofront inspired, escalating intensity layers stem-able for HP phase 2, no vocals, dark and looming, 2-3 minutes loopable
```
- 파일: `mus_iw_sanctum_boss_loop.ogg`

#### #20 Save Point Forge BGM
```
ElevenLabs Music — Smithy theme save point BGM, warm woodwinds (bassoon, English horn), gentle hammer rhythm percussion, low piano foundation, the only home feeling, only safe place, Hades Darren Korb inspired warmth but more restrained and Murakami-quiet, no vocals, slow tempo 70 BPM, 2-3 minutes loopable
```
- 파일: `mus_savepoint_forge_loop.ogg`

---

## 4. 자산 큐레이션 가이드 (Victor 자체 선별 기준)

> Victor 가 사운드 도메인 지식이 부족하므로, *주관 판단 없이 객관 기준*으로 베스트 1을 선별할 수 있도록 체크리스트화한다. 변주 3~5개 중 **체크리스트 통과 개수가 가장 많은 것** 을 채택.

### 4-1. 톤 정합 체크리스트 (모든 자산 공통)

| # | 점검 항목 | 통과 조건 |
|:---:|:---|:---|
| C1 | **인간 보이스 없음** | 어떤 형태의 발성·코러스·합창도 없어야 한다. 들리면 즉시 탈락 |
| C2 | **밝은/경쾌한 멜로디 없음** | 디즈니 풍·캐주얼 모바일 풍 멜로디 즉시 탈락 |
| C3 | **부드러움 거절** | 따뜻한 발라드 톤, 안내 톤, 도움 톤 즉시 탈락 (CLAUDE.md §타깃 비타깃) |
| C4 | **음역 범위 정합** | 환경 베드 = 저주파 우세 / SFX 임팩트 = 150–400 Hz 저음 / Ego 사인음 = 1.6–6 kHz 고주파 |
| C5 | **잔향 길이 정합** | 환경 베드 = 광활 (긴 잔향) / SFX = 짧음 (≤ 120ms) / 종 = 4–6초 |
| C6 | **유령 청각** (Lane/환경) | "사람 없는 공간에서 들리는 잔재" 톤. 활기·인구 느낌 즉시 탈락 |

### 4-2. SFX 개별 체크리스트

| 자산 카테고리 | 추가 체크 |
|:---|:---|
| 환경 베드 | 30초 끝부분과 시작부분이 *루프 가능* 한가 (Audacity 로 확인) |
| 메모리얼 종 | 단일 청동 종, 4–6초 잔향, 멜로디 X |
| 시안 chirp | 0.05초 짧은 클릭, 고주파 4–8 kHz 명확 |
| Ego 각성음 | 검날 빛이 *번뜩이는* 느낌. 따뜻함 X, 차가운 금속 ○ |
| Type-Tick | 30ms 이내, 라운드 로빈 4종이 *서로 미묘하게* 다름 |
| 히트 임팩트 | 저음 펀치(150–400 Hz) 있는가. 노트북 스피커에서도 체감되는가 |
| 발소리 | 같은 재질 2변주가 *동일 재질로 들리되 살짝 다름* |
| Trapdoor 낙하 바람 | 점진적 증폭, 정점에서 뚝 끊김 (페이즈 5 무음 게이트) |

### 4-3. BGM 개별 체크리스트

| 자산 | 추가 체크 |
|:---|:---|
| Tier 3 탐험/전투 | BPM·키·마디 수가 *동일*. Audacity 로 두 트랙 동시 재생 시 박자 어긋남 X |
| Rust Lane | 낮은 첼로 드론이 *주축*. 멜로딕 라인 우세하면 탈락 |
| 보스 BGM | sub-bass 우세 + 타악 강도 충분. 멜로디 우세 시 탈락 |
| 세이브 포인트 | 따뜻하지만 *가볍지 않음*. 디즈니 풍 즉시 탈락 |
| 모든 BGM | 루프 포인트가 음악적으로 자연스러운가 (마디 끝에서 시작점으로 부드럽게 연결) |

### 4-4. 톤 점검 — 1차 niche 신호 검증 (자체 질문)

3~5개 변주를 들어볼 때 *각 변주마다 자문*하라:

> "이 사운드를 BLAME!/메이드 인 어비스/Transistor 팬에게 들려주면 *louder* 한 신호인가, 또는 무해히 통과하는가? 1차 niche 신호를 *약화*시키는가?"

약화 신호(부드러움/친절함/캐주얼)가 1개라도 들리면 즉시 탈락. 모든 변주가 약화되면 *프롬프트를 다시 작성*해서 재생성한다.

---

## 5. 변환 파이프라인 (ffmpeg / Audacity)

### 5-1. Audacity 트리밍 + 루프 처리

1. MP3 import (`File → Import → Audio`)
2. 앞뒤 무음 영역 선택 → Delete
3. **루프 자산만:** 시작 0.5초와 끝 0.5초를 선택 → `Effect → Crossfade Tracks` (또는 수동 페이드) 적용
4. `File → Export → Export as WAV` → `_audio_workdir/trimmed_wav/` 에 저장

### 5-2. ffmpeg WAV → OGG + LUFS 정규화 (PowerShell)

#### 단일 SFX (LUFS −12)
```powershell
ffmpeg -i _audio_workdir\trimmed_wav\input.wav `
  -af "loudnorm=I=-12:TP=-1:LRA=7" `
  -c:a libvorbis -q:a 4 `
  game\public\assets\audio\sfx\output.ogg
```

#### 환경 베드 (LUFS −22)
```powershell
ffmpeg -i _audio_workdir\trimmed_wav\input.wav `
  -af "loudnorm=I=-22:TP=-6:LRA=7" `
  -c:a libvorbis -q:a 4 `
  game\public\assets\audio\amb\output.ogg
```

#### BGM 탐험 (LUFS −18)
```powershell
ffmpeg -i _audio_workdir\trimmed_wav\input.wav `
  -af "loudnorm=I=-18:TP=-3:LRA=10" `
  -c:a libvorbis -q:a 5 `
  game\public\assets\audio\mus\output.ogg
```

#### BGM 전투/보스 (LUFS −16)
```powershell
ffmpeg -i _audio_workdir\trimmed_wav\input.wav `
  -af "loudnorm=I=-16:TP=-2:LRA=10" `
  -c:a libvorbis -q:a 5 `
  game\public\assets\audio\mus\output.ogg
```

#### UI SFX (LUFS −20)
```powershell
ffmpeg -i _audio_workdir\trimmed_wav\input.wav `
  -af "loudnorm=I=-20:TP=-4:LRA=7" `
  -c:a libvorbis -q:a 4 `
  game\public\assets\audio\sfx\output.ogg
```

LUFS 값은 `System_Audio_Direction.md` §11-1 라우드니스 타깃 SSoT 와 1:1 정합.

### 5-3. 일괄 변환 스크립트 (옵션)

20+ 파일을 한 번에 변환할 때:

```powershell
# convert_all_sfx.ps1
Get-ChildItem _audio_workdir\trimmed_wav\sfx_*.wav | ForEach-Object {
  $out = "game\public\assets\audio\sfx\$($_.BaseName).ogg"
  ffmpeg -i $_.FullName -af "loudnorm=I=-12:TP=-1:LRA=7" -c:a libvorbis -q:a 4 $out
}
```

---

## 6. 파일 배치 + @pixi/sound 통합 체크리스트

### 6-1. 파일 배치 검증

```powershell
ls game\public\assets\audio\amb\
ls game\public\assets\audio\sfx\
ls game\public\assets\audio\mus\
```

기대 결과:
- `amb/` — 5 환경 베드
- `sfx/` — 30+ SFX (히트 8 + 발소리 6 + Ego 6 + 진입 6 + 메모리 코어 5 + 거리 이벤트 3)
- `mus/` — 5 BGM

### 6-2. 파일명 컨벤션 자체 검증

`System_Audio_Direction.md` §12-2 영문 strict 룰 통과:

- [ ] 모든 파일명이 `[category]_[context]_[name]_[variant].[ext]` 형식
- [ ] 한국어/한자 파일명 0
- [ ] 공백·특수문자 0 (언더스코어만)
- [ ] 확장자 `.ogg`

### 6-3. @pixi/sound 통합 (lead-programmer 위임)

본 작업은 Victor 가 직접 하지 않는다. 자산 배치 완료 후 lead-programmer 에게 다음 작업 위임:

- `npm install @pixi/sound`
- `game/src/audio/Sfx.ts` 백엔드 교체 (DEC-040)
- `AudioBus.ts`, `AmbientLayer.ts`, `MusicConductor.ts`, `EgoSting.ts` 신설 (`System_Audio_Direction.md` §13-2)
- 호출처 5곳 회귀 테스트

---

## 7. 시간 견적 + 비용

| 단계 | 시간 | 비용 |
|:---|:---|:---|
| 사전 준비 (계정/도구 설치) | 30 분 | $0 |
| 프롬프트 시트 준비 | 0 (본 문서 복붙) | $0 |
| 자산 생성 (20 항목 × 5분 평균) | 100 분 | 무료 한도 시도 → 부족 시 ElevenLabs Creator $11/월 |
| 큐레이션 + 트리밍 (Audacity) | 60 분 | $0 |
| ffmpeg 변환 + 배치 | 30 분 | $0 |
| **합계 (Victor 작업분)** | **약 4시간** | **$0–22** |
| @pixi/sound 통합 (lead-programmer) | 별도 4–8시간 | $0 |

> **무료 한도 초과 시:** ElevenLabs Creator 플랜 ~$11/월 → 한 달 만에 데모 자산 완료 후 해지. 총 비용 ~$11.

---

## 8. 자체 검증 체크리스트 (작업 완료 시)

Victor 가 모든 자산 생성 후 다음을 자체 검증:

### 8-1. 통합 톤 검증

- [ ] 20 항목 모두 `_audio_workdir/trimmed_wav/` 와 `game/public/assets/audio/` 에 존재
- [ ] 파일명이 `System_Audio_Direction.md` §12-2 컨벤션과 1:1 정합
- [ ] 환경 베드 5종을 *순서대로 30초씩* 들었을 때 모두 *같은 세계*로 들리는가 (BLAME!/무라카미 합성 톤 일관)
- [ ] BGM 5종 중 어느 것도 *디즈니 풍·캐주얼 모바일 풍·발라드* 색이 들리지 않는가
- [ ] 검 Ego 사인음 (각성/Speak-In/Type-Tick) 이 *금속성 hard edge* 톤을 일관 유지하는가

### 8-2. 동기화 검증

- [ ] Tier 3 탐험 BGM ↔ Tier 3 전투 BGM Audacity 동시 재생 시 박자 어긋남 없는가
- [ ] Trapdoor 시퀀스 6종을 순서대로 재생할 때 *디제틱 흐름* 으로 자연스러운가 (anvil → activate → crack → wind → breath → emerge)
- [ ] 메모리얼 종 (저주파) 과 시안 chirp (고주파) 가 동시 재생되어도 변별 가능한가

### 8-3. 1차 niche 신호 검증

- [ ] 각 자산을 들으며 자문: "BLAME!/메이드 인 어비스/Transistor 팬에게 louder 한 신호인가?" — 약화 신호 0
- [ ] 비타깃 신호 (친절함·부드러움·안내 강화·캐주얼) 가 들리는 자산 0

### 8-4. 라이선스 검증

- [ ] ElevenLabs ToS / Commercial Use 페이지 캡처 보관
- [ ] 무료 플랜 한도와 상업적 사용 권리 확인 캡처
- [ ] 데모 출시 시점 (Phase 2 알파) 라이선스 안전성 재확인

---

## 9. 후속 결정 (본 작업 완료 후)

| 항목 | 트리거 | 결정 시점 |
|:---|:---|:---|
| ElevenLabs 유료 플랜 전환 | 무료 한도 초과 시 | 본 작업 중 즉시 |
| 5색 기질 Lane 환경 베드 4종 추가 (Forge/Iron/Spark/Shadow) | 해당 dominant 핸드크래프트 무기 도입 시 | Phase 2 후반 |
| AIVA 보조 도구 도입 | ElevenLabs Music 품질 부족 판정 시 | 본 작업 §4 큐레이션에서 *모든 변주 탈락* 패턴 발견 시 |
| 검 Ego 정식 보이스 캐스팅 | 베타 진입 + 시장 신호 충족 | DEC-040 §후속 |
| 핵심 트랙 인간 외주 교체 | 출시 전 | DEC-040 §후속 |

---

## 10. 변경 이력

| 일자 | 변경 |
|:---|:---|
| 2026-05-04 | 초안. 도메인 권한 위임 후 자체 정합성 분석으로 직접 결정. ElevenLabs SE + Music + Audacity + ffmpeg 워크플로우 확정. 프롬프트 시트 20 항목 영문 strict. 자체 검증 체크리스트 + 라이선스 검증 단계 포함 |
