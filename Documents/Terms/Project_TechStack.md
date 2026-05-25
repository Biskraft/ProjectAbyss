# ECHORIS 湲곗닠 ?ㅽ깮 (Project Tech Stack)

## 援ы쁽 ?꾪솴 (Implementation Status)

> **理쒓렐 ?낅뜲?댄듃:** 2026-04-17
> **臾몄꽌 ?곹깭:** `?묒꽦 以?(Draft)`
> **沅뚯쐞 ?꾩튂:** ??臾몄꽌媛 ECHORIS 湲곗닠 ?ㅽ깮??SSoT?대ŉ, `CLAUDE.md`???붿빟 ?뚯씠釉붿? ??臾몄꽌?먯꽌 ?뚯깮?⑸땲??

---

## 0. ?꾩닔 李멸퀬 ?먮즺 (Mandatory References)

- Project Vision: `Documents/Terms/Project_Vision_Abyss.md`
- Document Index: `Documents/Terms/Document_Index.md`
- Sheets Writing Rules: `Documents/Terms/Sheets_Writing_Rules.md`
- Performance Budget: `Documents/System/System_Performance_Budget.md`
- Game Overview: `Reference/寃뚯엫 湲고쉷 媛쒖슂.md`

---

## 1. ?대씪?댁뼵???ㅽ깮 (Client Stack)

| 遺꾨쪟         | 湲곗닠             | 踰꾩쟾     | ?⑸룄                                                                 |
| :----------- | :--------------- | :------- | :------------------------------------------------------------------- |
| ?뚮뜑??      | PixiJS           | ^8.6.6   | 2D ?뚮뜑留?(WebGL ?곗꽑, WebGPU ???                                  |
| ??쇰㏊       | @pixi/tilemap    | ^4.1.0   | LDtk ????덉씠???뚮뜑留?(Auto/IntGrid)                               |
| ?몄뼱         | TypeScript       | ^5.7.0   | 硫붿씤 ?몄뼱. `strict` 紐⑤뱶, `@core/*`/`@scenes/*` path alias           |
| 鍮뚮뱶         | Vite             | ^6.0.0   | 媛쒕컻 ?쒕쾭 + ?꾨줈?뺤뀡 踰덈뱾. `?raw` ?꾪룷?몃줈 CSV ?몃씪??踰덈뱾           |
| ?ㅻ뵒??      | Howler.js        | (?덉젙)   | BGM/SFX ?ъ깮 (Phase 2 ?꾩엯 ?덉젙)                                     |
| ?낅젰         | ?먯껜 援ы쁽        | -        | KeyboardInput + KEY_CHAR_TO_CODE fallback (?쒓? IME ???            |
| ?먯뀑 濡쒕뜑    | ?먯껜 援ы쁽 (`@core/AssetLoader`) | -        | `assetPath()`濡?`BASE_URL` ?댁냼 (GitHub Pages / 濡쒖뺄 dev ?명솚)       |

### 二쇱슂 ?붾젆?좊━

```
game/
?쒋?? src/
??  ?쒋?? core/          # AssetLoader, Input, Events, FrameClock
??  ?쒋?? scenes/        # LdtkWorldScene, ItemWorldScene, BootScene
??  ?쒋?? effects/       # PaletteSwapFilter, HitStop, ScreenShake
??  ?쒋?? data/          # CSV 濡쒕뜑 (areaPalettes, weaponLore, ...)
??  ?쒋?? entities/      # Player, Enemy, Memory Shard
??  ?붴?? ui/            # HUD, DepthGauge, LoreDisplay
?쒋?? public/assets/     # ?뺤쟻 ?먯뀑 (atlas/, ldtk ?놁씠 public 吏곸냽)
?붴?? dist/              # `npx vite build` 異쒕젰
```

---

## 2. ?덈꺼 ?먮뵒??(Level Editor)

| ??ぉ          | ?댁슜                                                                                        |
| :------------ | :------------------------------------------------------------------------------------------ |
| ?꾧뎄          | **LDtk (Level Designer Toolkit)** ??`world_layout: GridVania` Multi-World 紐⑤뱶              |
| ?꾨줈?앺듃      | `game/public/assets/World_ProjectAbyss.ldtk`                                                |
| ?덉씠??洹쒖빟   | BG(Background) / Walls(IntGrid+Auto) / Shadow / Entities                                    |
| ?뷀떚???ㅼ씠諛?| PascalCase (`PlayerSpawn`, `SavePoint`, `ItemDrop` ??. ?꾨뱶 key/enum??PascalCase          |
| ?고????뚯꽌   | ?먯껜 援ы쁽 (`@core/LdtkLoader`). Tiled? ?ъ슜?섏? ?딆쓬 (`CLAUDE.md` 援??쒓린???먭린 ?덉젙)     |
| 硫?곗썡??     | 媛?Level??`worldX/worldY` 醫뚰몴濡?World Map 援ъ꽦. ???꾩씠??Neighbour ?뷀듃由?湲곕컲           |

### ??쇱뀑 沅뚯쐞??洹쒖튃 (Tileset Authority)

- **LDtk??`__tilesetRelPath`??李몄“?⑹씠硫? ?ㅼ젣 ?뚮뜑留???쇱뀑? CSV `Content_System_Area_Palette.csv`??`Tileset` 而щ읆??寃곗젙?⑸땲??* (DEC-024).
- ?고??꾩뿉??`aliasAreaTilesetForLdtkTiles(areaId, tiles, atlases)`媛 CSV 吏???꾪??쇱뒪瑜?LDtk媛 湲곕??섎뒗 寃쎈줈?먮룄 蹂꾩묶 ?깅줉?⑸땲??
- ?뺣텇??LDtk ?뚯씪???섏젙?섏? ?딄퀬 CSV ??以꾨쭔 諛붽퓭 諛붿씠????쇱뀑??援먯껜?????덉뒿?덈떎.

---

## 3. ?곗씠??SSoT / CSV ?뚯씠?꾨씪??(Content Pipeline)

### ?먯튃: ?곗씠?곕뒗 ?꾨? CSV, 肄붾뱶??由щ뜑留??뚯쑀

紐⑤뱺 肄섑뀗痢??ㅽ꺈, ?쒕∼, ?붾젅?? 濡쒖뼱, ?ㅽ룿 ?뚯씠釉???`Sheets/`??CSV??湲곕줉?섎ŉ, TypeScript??`?raw` ?꾪룷?몃줈 鍮뚮뱶??꾩뿉 踰덈뱾?⑸땲?? CastleDB/Google Sheets ?ㅽ??쇱쓽 愿怨꾪삎 李몄“瑜?CSV濡?援ы쁽?⑸땲??

### ?꾩옱 ?쒗듃 紐⑸줉 (`Sheets/`)

| ?뚯씪                                       | ??븷                                      |
| :----------------------------------------- | :---------------------------------------- |
| `Content_System_Area_Palette.csv`          | 諛붿씠???붾젅??+ ??쇱뀑 (沅뚯쐞)             |
| `Content_System_Damage_Formula.csv`        | ?곕?吏 怨듭떇 ?곸닔                          |
| `Content_Stats_Character_Base.csv`         | ?뚮젅?댁뼱 湲곕낯 ?ㅽ꺈                        |
| `Content_Stats_Enemy.csv`                  | ???ㅽ꺈 ?뚯씠釉?                           |
| `Content_Stats_Weapon_List.csv`            | 臾닿린 紐⑸줉 (100醫?紐⑺몴)                    |
| `Documents/Content/_archive/LoreWeapons_DEC023/` | DEC-023 weapon lore archive (CSV/runtime path retired) |
| `Content_Rarity.csv`                       | ?덉뼱由ы떚 諛곗쑉 / 湲곗뼲 ?⑦렪 ?щ’ / 吏痢???  |
| `Content_Combat_Combo.csv`                 | 肄ㅻ낫 ?쇱슦??                              |
| `Content_Memory Shards.csv`                    | 湲곗뼲 ?⑦렪 醫낅쪟/?④낵                        |
| `Content_Item_DropRate.csv`                | ?쒕∼ ?뺣쪧 ?뚯씠釉?                         |
| `Content_Item_Growth.csv`                  | ?꾩씠??EXP ?깆옣 怨≪꽑                      |
| `Content_ItemWorld_MemoryRooms.csv`        | 湲곗뼲??諛??쒗뵆由?                         |
| `Content_ItemWorld_SpawnTable.csv`         | ?꾩씠?쒓퀎 ?ㅽ룿 ?뚯씠釉?                     |
| `Content_StrataConfig.csv`                 | 吏痢듬퀎 ?뚮씪誘명꽣                           |
| `LoreTexts/` (?대뜑)                        | 臾닿린/?섍꼍/紐ъ뒪??濡쒖뼱 蹂몃Ц (Markdown)     |

### ?섏씠釉뚮━???꾨왂 (CSV + Markdown)

- **CSV**: ?レ옄/ID/enum ??寃利?媛?ν븳 援ъ“???곗씠??
- **Markdown** (`Sheets/LoreTexts/*.md`): 湲??쒖닠臾??ㅺ뎅??濡쒖뼱 蹂몃Ц
- CSV?먯꽌 `LoreKey` 而щ읆?쇰줈 MD ?뚯씪??李몄“?⑸땲??(DEC-023).

### ?몃씪???щ㎎ (Sheets_Writing_Rules)

- ?붾젅???ㅽ넲: `"0.00:3a1a28|0.20:6a2a3a|..."` (t:hex pairs, `|` 援щ텇)
- 諛곗뿴: `"a;b;c"` (?몃?肄쒕줎 援щ텇)
- 二쇱꽍 而щ읆: `Description` 留덉?留?而щ읆?쇰줈 怨좎젙

---

## 4. 鍮꾩＜???뚮뜑留??뚯씠?꾨씪??(Visual Pipeline)

| ?④퀎              | 援ъ꽦?붿냼                     | ?ㅻ챸                                                                 |
| :---------------- | :--------------------------- | :------------------------------------------------------------------- |
| ?붾젅???ㅼ솑       | `effects/PaletteSwapFilter`  | 1D LUT (256횞N ?꾪??쇱뒪). 諛붿씠?대퀎 row ?몃뜳?ㅻ줈 ?ㅼ떆媛??됱“ 蹂寃?    |
| ?붾젅???꾪??쇱뒪   | `getAreaPaletteAtlas()`      | 紐⑤뱺 AreaID瑜????μ쓽 GPU ?띿뒪泥섎줈 ?⑦궧 (Dead Cells ?ㅽ???         |
| 硫???꾪??쇱뒪     | `ensureAreaTilesetsLoaded()` | ?뚮젅?댁뼱媛 吏꾩엯??諛붿씠?댁쓽 ??쇱뀑留?lazy 濡쒕뱶 (DEC-022)              |
| ??쇱뀑 蹂꾩묶       | `aliasAreaTilesetForLdtkTiles()` | CSV 沅뚯쐞 留ㅼ빱?덉쬁 (DEC-024)                                         |
| ?곸뒪 洹몃씪?붿뼵??  | PaletteSwapFilter uniform    | `depthBias` + `depthCenter`濡??섏쭅 吏꾪뻾???곕Ⅸ 紐낅룄 蹂??            |
| ?덉씠??遺꾨━       | BG/WALL AreaID ?댁쨷??       | `world_shaft_bg` vs `world_shaft_wall`濡?諛곌꼍-踰??붾젅???낅┰         |
| ?덊듃?ㅽ넲/?곗씠??  | `effects/HitStop`, `ScreenShake` | ?꾪닾 ?寃⑷컧 ?듭떖 (Design_Combat_HitFeedback)                     |

---

## 5. 鍮뚮뱶 & 諛고룷 (Build & Deploy)

### 5.1 寃뚯엫 ?대씪?댁뼵????GitHub Pages (echoris.io)

| ?④퀎       | 紐낅졊/?뚯씪                                | 異쒕젰                      |
| :--------- | :--------------------------------------- | :------------------------ |
| ???泥댄겕  | `cd game && npx tsc --noEmit`            | ?먮윭 0 ?꾩닔               |
| 鍮뚮뱶       | `cd game && npx vite build`              | `game/dist/` (~806KB)     |
| ?뚰겕?뚮줈??| `.github/workflows/deploy.yml`           | `game/dist ??site/play/`  |
| ?꾨찓??    | `public/CNAME` ??`echoris.io`            | Cloudflare DNS            |
| ?몃━嫄?    | `git push origin main`                   | GitHub Actions ?먮룞 ?ㅽ뻾  |

- **二쇱쓽:** gh-pages 釉뚮옖移섎뒗 ?ъ슜?섏? ?딆뒿?덈떎. `build_type: workflow`濡?Actions媛 artifact瑜?Pages??吏곸젒 寃뚯떆?⑸땲??
- `npx gh-pages` CLI??Windows??LDtk backup 湲??뚯씪紐?臾몄젣濡??ъ슜 湲덉??낅땲??

### 5.2 GDD 臾몄꽌 ?ъ씠????Vercel (MkDocs)

| ??ぉ       | 媛?                                                      |
| :--------- | :------------------------------------------------------- |
| ?앹꽦湲?    | MkDocs Material (>=9.5)                                  |
| ?ㅼ젙       | `mkdocs.yml` (docs_dir: `Documents`)                     |
| ?몄뒪??    | Vercel (`vercel.json` ??`uv pip install` + `mkdocs build`) |
| 異쒕젰       | `site/`                                                  |
| ?섏〈??    | `requirements.txt` (mkdocs>=1.6, mkdocs-material>=9.5)   |
| URL        | https://level-deesign-for-pvp.vercel.app                 |

---

## 6. ?대? ?꾧뎄 (Internal Tools)

| ?ㅽ겕由쏀듃                                          | ??븷                                   |
| :------------------------------------------------ | :------------------------------------- |
| `Tools/annotate_atlas.py` (?덉젙)                  | ?꾪??쇱뒪 ????몃뜳??二쇱꽍              |
| `Tools/compose_tileset.py` (?덉젙)                 | ?먮낯 ????대?吏 ??寃뚯엫 ?꾪??쇱뒪 ?⑹꽦 |
| `Tools/extract_used_tiles.py` (?덉젙)              | LDtk?먯꽌 ?ㅼ젣 ?ъ슜 ??쇰쭔 異붿텧         |
| `Reference/wiki_to_md.py`                         | ?꾪궎 XML ?ㅽ봽 ??Markdown 蹂??        |
| `Reference/wiki_to_md_robust.py`                  | ?꾪궎 蹂???덉젙??踰꾩쟾                  |

---

## 7. ?쒕쾭 ?ㅽ깮 (Future ??Phase 3+)

?꾩옱 Phase 1~2???꾩쟻?쇰줈 ?대씪?댁뼵???⑤룆 ?숈옉?대ŉ, ?쒕쾭??Phase 3 (肄붿샃 踰좏?) ?쒖옉 ???꾩엯?⑸땲??

| 遺꾨쪟       | 湲곗닠        | ?⑸룄                                    |
| :--------- | :---------- | :-------------------------------------- |
| ?고???    | Node.js     | 寃뚯엫 ?쒕쾭 (珥덇린 ?꾨줈?좏???             |
| ?듭떊       | WebSocket   | ?ㅼ떆媛??곹깭 ?숆린??                     |
| 硫붿씤 DB    | PostgreSQL  | 怨꾩젙/?몃깽?좊━/吏꾪뻾??                   |
| 罹먯떆       | Redis       | ?몄뀡/留ㅼ튂 ?곹깭                          |
| ?⑸쪟 諛⑹떇  | URL 留곹겕    | ?몃? 濡쒕퉬 ?녿뒗 invite-by-link (DEC-017) |

?곸꽭 ?ㅺ퀎??`Documents/Research/TwoPlayerNetcode_Architecture_Research.md`, `Documents/Research/URLJoin_CoopSession_Research.md`, `Documents/Research/SaveSync_CoopSession_Research.md` 李몄“.

---

## 8. 媛쒕컻 ?섍꼍 (Dev Environment)

| ??ぉ          | 媛?                                                      |
| :------------ | :------------------------------------------------------- |
| OS (沅뚯옣)     | Windows 11 / macOS (Vite dev??OS 臾닿?)                  |
| Shell         | bash (Git Bash on Windows) ??PowerShell? CP949 ?몄퐫??二쇱쓽 |
| Node          | 20.x (GitHub Actions? ?숈씪)                             |
| Python        | 3.11+ (MkDocs/?꾧뎄 ?ㅽ겕由쏀듃)                             |
| Git           | 蹂몄꽑 釉뚮옖移?`main`, force push 湲덉?                       |
| IDE           | VS Code + LDtk ?뺤옣                                      |

---

## 9. 愿???섏궗寃곗젙 (Related Decisions)

| 踰덊샇    | ?쒕ぉ                                  | ?꾩튂                                      |
| :------ | :------------------------------------ | :---------------------------------------- |
| DEC-021 | Dead Cells 洹몃젅?댁뒪耳???붾젅???뺤떇?? | `memory/wiki/decisions/DEC-021.md`        |
| DEC-022 | 硫???꾪??쇱뒪 lazy 濡쒕뵫               | `memory/wiki/decisions/DEC-022.md`        |
| DEC-023 | CSV + Markdown ?섏씠釉뚮━??濡쒖뼱        | `memory/wiki/decisions/DEC-023.md`        |
| DEC-024 | CSV Tileset 而щ읆 沅뚯쐞 (LDtk 蹂꾩묶)     | `memory/wiki/decisions/DEC-024.md`        |
