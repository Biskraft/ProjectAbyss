# ProjectAbyss 앞으로의 전체 계획

이 문서는 현재 `game/` 리팩터링 진행 상태를 기준으로, 앞으로의 작업 순서와 우선순위를 정리한 실행 계획이다.

## 1. 현재까지 완료된 작업

- `TitleScene`, `WorldScene`, `LdtkWorldScene`, `ItemWorldScene`의 전역 UI 소유권 문제와 일부 누수 문제를 우선 수정했다.
- `LdtkWorldScene`에서 UI 책임 일부를 `WorldUiController`로 분리했다.
- `ItemWorldScene`에서 전역 UI 책임을 `ItemWorldUiController`로 분리했다.
- `ItemWorldScene`의 진행 상태 일부를 `ItemWorldProgressController`로 분리했다.
- `ItemWorldScene`의 맵 상태 일부를 `ItemWorldMapController`로 분리했다.
- 최근 기준 타입 검증은 `game/`에서 `npx.cmd tsc --noEmit` 통과 상태다.

## 2. 전체 목표

핵심 목표는 두 가지다.

- 실제 플레이 버그와 UI 잔류 문제를 줄이면서, 씬의 책임을 통제 가능한 단위로 나눈다.
- `LdtkWorldScene.ts`와 `ItemWorldScene.ts`에 집중된 거대 책임을 컨트롤러/서비스로 분리해 이후 기능 추가 비용을 낮춘다.

## 3. 우선순위 원칙

작업 순서는 아래 원칙을 따른다.

1. 실제 버그와 누수 위험을 먼저 잡는다.
2. 그다음 UI 소유권을 분리한다.
3. 그다음 진행 흐름과 맵/스폰 로직을 분리한다.
4. 마지막에 상호작용 시스템과 장면 전환 로직을 정리한다.

즉, 구조 개선 자체보다도 먼저 현재 동작 안정성을 확보하는 방향으로 진행한다.

## 4. 단계별 실행 계획

### 4-1. 1단계: 현재 분리 작업 안정화

목표:

- 최근에 분리한 `WorldUiController`, `ItemWorldUiController`, `ItemWorldProgressController`, `ItemWorldMapController`가 실제 플레이 흐름에서 안정적으로 동작하는지 확인한다.

할 일:

- Item World 진입/복귀 반복 테스트
- 타이틀 왕복 테스트
- 월드맵, 인벤토리, 결과창, 온보딩, 보스 선택창 잔류 여부 확인
- 복귀 후 HUD/미니맵 재부착 상태 확인

완료 기준:

- UI 중복, 잔류, 복귀 누락이 재현되지 않아야 한다.

### 4-2. 2단계: `ItemWorldMapController` 확장

목표:

- `ItemWorldScene`에 남아 있는 맵 조립 책임을 더 분리한다.

우선 이동 대상:

- `computeDoorMask`
- `applyDoorMaskToFullGrid`
- `buildFullMap`의 하위 후처리 단계
- room restore/persist와 연결되는 맵 후처리 로직

주의점:

- 이 단계는 시각 결과와 충돌 판정에 직접 영향이 있으므로, 한 번에 크게 옮기지 않고 작은 단위로 나눈다.

완료 기준:

- `ItemWorldScene`가 맵 조립 세부사항을 직접 거의 알지 않게 된다.

### 4-3. 3단계: `ItemWorldSpawnController` 도입

목표:

- 적, 보스, 정적 엔티티 생성 책임을 `ItemWorldScene`에서 분리한다.

우선 이동 대상:

- 방 단위 적 생성
- 보스 생성
- 정적 엔티티 생성
- 정적 엔티티 갱신/정리

기대 효과:

- Item World의 맵 로직과 전투 오브젝트 생성 로직이 분리되어 수정 범위가 줄어든다.

### 4-4. 4단계: `LdtkWorldScene` 추가 분리

목표:

- `LdtkWorldScene`를 UI 이후 단계까지 계속 분해한다.

후보 컨트롤러:

- `WorldInteractionController`
- `WorldTransitionController`
- 필요하면 `WorldProgressService`

우선 이동 대상:

- 문, 스위치, 세이브포인트, 시크릿 월, 앤빌, 제단, 포털
- 레벨 전환, 포털 진입, Item World 진입/복귀
- 저장 및 복귀 지점 처리

완료 기준:

- `LdtkWorldScene`는 최종 오케스트레이션만 담당하고, 개별 상호작용 구현은 외부 객체가 맡는다.

### 4-5. 5단계: 공용 규칙 문서화

목표:

- 앞으로 같은 문제를 반복하지 않도록 씬/UI/전역 컨테이너 사용 규칙을 명문화한다.

문서화 대상:

- 어떤 UI가 `scene.container` 아래에 있어야 하는지
- 어떤 UI가 전역 `uiContainer`에 붙을 수 있는지
- 전역 UI attach/detach/destroy 책임이 누구에게 있는지
- overlay scene 사용 시 기존 씬 UI를 어떻게 처리해야 하는지

완료 기준:

- 새 기능 추가 시 같은 구조 실수를 반복하지 않게 된다.

## 5. 병행 검증 계획

각 단계마다 아래 검증을 반복한다.

### 코드 검증

- `cd game`
- `npx.cmd tsc --noEmit`

가능하면 이후 환경 문제가 정리되면 아래도 다시 확인한다.

- `npm.cmd run build`
- `npm.cmd run dev`

### 수동 플레이 검증

매 단계마다 최소 아래 흐름은 다시 본다.

1. 타이틀 진입
2. 게임 시작
3. 인벤토리 열기/닫기
4. Item World 진입
5. 결과창 확인
6. 월드 복귀
7. 같은 흐름 2~3회 반복
8. 다시 타이틀로 나갔다가 재시작

확인 포인트:

- HUD 중복 여부
- 미니맵 복귀 여부
- 결과창 중복 여부
- 온보딩/보스 선택/프롬프트 잔류 여부
- 반복 진입 시 성능 저하나 이상 상태 발생 여부

## 6. 위험 구간

앞으로 특히 주의해야 하는 구간은 아래와 같다.

- `ItemWorldScene.ts`
  - 파일이 크고 책임이 많이 남아 있어, 이동 중 회귀 위험이 높다.
- `LdtkWorldScene.ts`
  - 상호작용 오브젝트와 전환 로직이 깊게 결합되어 있다.
- 전역 UI 컨테이너 사용부
  - attach/detach 순서가 어긋나면 바로 중복/잔류 문제로 이어진다.
- 맵 조립 로직
  - 타일, 충돌, 문 마스크, 포털 복원은 눈에 잘 띄지 않는 회귀를 만들기 쉽다.

## 7. 실무 기준 다음 액션

지금 시점의 바로 다음 작업 순서는 아래로 잡는다.

1. `ItemWorldMapController`에 `door mask` 및 `fullGrid` 후처리 일부 이동
2. `ItemWorldSpawnController` 도입
3. `LdtkWorldScene`의 `WorldInteractionController` 분리
4. 공용 UI/씬 규칙 문서화
5. 반복 플레이 테스트 및 회귀 수정

## 8. 완료 상태 판단 기준

아래 상태에 도달하면 이번 리팩터링 라운드는 1차 완료로 본다.

- `LdtkWorldScene`와 `ItemWorldScene`의 UI 책임이 대부분 외부 컨트롤러로 빠져 있음
- Item World 진행 상태와 맵 상태가 씬 외부 객체로 관리됨
- 적/보스/정적 엔티티 생성도 별도 컨트롤러로 분리됨
- Item World 진입/복귀 반복 시 UI 잔류 버그가 재현되지 않음
- 타입 검증과 기본 플레이 검증이 안정적으로 통과함
