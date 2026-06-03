# Image-to-Pixel (로컬 설치)

[Tezumie/Image-to-Pixel](https://github.com/Tezumie/Image-to-Pixel) 라이브러리(MIT) + ECHORIS용 로컬 변환 도구.

이미지를 픽셀아트로 변환(다운스케일 + 디더링 + 팔레트 적용)한다. **브라우저 전용**(Node 불가), 인터넷 불필요(Lospec 슬러그 사용 시에만 네트워크).

## 구성

| 파일 | 용도 |
| :--- | :--- |
| `image-to-pixel.js` | 라이브러리 본체 (CDN `@main`에서 받음, 19KB) |
| `index.html` | 드롭→변환→PNG 다운로드 로컬 UI |

## 쓰는 법 (UI)

1. `tools/image-to-pixel/index.html` 을 브라우저로 연다 (더블클릭 또는 `start index.html`).
2. 이미지를 드롭(또는 클릭 선택)하면 자동 변환된다.
3. 조정:
   - **가로 픽셀 수(width):** 스프라이트 목표 폭. ECHORIS 기본 `32`.
   - **해상도(resolution):** `pixel` = 실제 축소 에셋(게임용 권장) / `original` = 원본 크기 픽셀화(미리보기).
   - **디더링:** `none` / `Floyd-Steinberg` / `ordered` / `2x2 Bayer` / `4x4 Bayer`. 강도 0-100.
   - **팔레트:** Lospec 슬러그(예: `na16`, `oil-6`) 입력 시 그 팔레트로. 비우면 아래 커스텀 hex 목록 사용, 둘 다 비우면 원본 색.
4. **PNG 다운로드** 로 결과 저장 → `game/public/assets/sprites/` 등에 배치.

## 쓰는 법 (코드 — 게임/스크립트에 통합 시)

```html
<script src="image-to-pixel.js"></script>
<script>
  const canvas = await pixelate({
    image: myImageOrCanvasOrURL,   // HTMLImage/Canvas/ImageData/URL 문자열
    width: 32,
    dither: 'Floyd-Steinberg',     // 'none' | 'Floyd-Steinberg' | 'ordered' | '2x2 Bayer' | '4x4 Bayer'
    strength: 20,                  // 0-100
    palette: ['#1b1b1e', '#f4f1de', '#e07a5f'], // 또는 Lospec 슬러그, 또는 null(원본 색)
    resolution: 'pixel',           // 'pixel' | 'original'
  });
  // canvas → PNG
  const url = canvas.toDataURL('image/png');
</script>
```

`pixelate()` 는 `Promise<HTMLCanvasElement>` 를 반환한다.

## 업데이트

라이브러리 최신화: `curl -sL https://cdn.jsdelivr.net/gh/Tezumie/Image-to-Pixel@main/image-to-pixel.js -o image-to-pixel.js`

## 주의

- `game/` 빌드와 무관(배포 안 됨). 순수 콘텐츠 제작 도구.
- Lospec 슬러그 팔레트는 lospec.com API 를 조회하므로 그때만 인터넷 필요. 커스텀 hex 배열은 오프라인.
