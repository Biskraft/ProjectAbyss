#!/usr/bin/env node
// Replace lines 1226-1402 (1-indexed) of ui-components.html with new 3-column Anvil card.
import fs from 'fs';

const PATH = 'game/docs/ui-components.html';
const lines = fs.readFileSync(PATH, 'utf8').split('\n');

const NEW_CARD = `    <div class="card">
      <h3>Anvil Mode — 3-Column (Inventory · Anvil · Item Map) — v2 (2026-05-24)</h3>
      <p class="desc">
        이미지 reference 기반 새 통합 레이아웃. 좌(인벤토리 그리드) + 중(ANVIL: 64px
        아이콘 + 이름 + 호칭 + Recovery% + 단계형 RadialMap) + 우(ITEM MAP: L1~L5
        stratum 미니맵 스택). 이전 "FORGE 빈/Placed" 두 카드를 단일 통합으로 교체.
      </p>
      <div class="stage" style="background:#0a0a0a;padding:16px;border:1px solid #1a1a1a;overflow:auto">
        <div class="anvil3-root">
          <!-- ═══ LEFT: INVENTORY ═══ -->
          <div class="anvil3-col-left">
            <div class="anvil3-col-title">인벤토리</div>
            <div class="anvil3-tabs">
              <div class="anvil3-tab active">ALL</div>
              <div class="anvil3-tab">WPN</div>
              <div class="anvil3-tab">ARM</div>
              <div class="anvil3-tab">ACC</div>
            </div>
            <div class="anvil3-grid">
              <div class="anvil3-cell sel r-legendary"><span class="anvil3-icon">⚔</span></div>
              <div class="anvil3-cell r-magic"><span class="anvil3-badge b-equipped">E</span><span class="anvil3-icon">⚔</span></div>
              <div class="anvil3-cell"></div><div class="anvil3-cell"></div><div class="anvil3-cell"></div><div class="anvil3-cell"></div>
              <div class="anvil3-cell"></div><div class="anvil3-cell"></div><div class="anvil3-cell"></div><div class="anvil3-cell"></div><div class="anvil3-cell"></div><div class="anvil3-cell"></div>
              <div class="anvil3-cell"></div><div class="anvil3-cell"></div><div class="anvil3-cell"></div><div class="anvil3-cell"></div><div class="anvil3-cell"></div><div class="anvil3-cell"></div>
              <div class="anvil3-cell"></div><div class="anvil3-cell"></div><div class="anvil3-cell"></div><div class="anvil3-cell"></div><div class="anvil3-cell"></div><div class="anvil3-cell"></div>
              <div class="anvil3-cell"></div><div class="anvil3-cell"></div><div class="anvil3-cell"></div><div class="anvil3-cell"></div><div class="anvil3-cell"></div><div class="anvil3-cell"></div>
            </div>
          </div>

          <!-- ═══ CENTER: ANVIL ═══ -->
          <div class="anvil3-col-center">
            <div class="anvil3-col-title">ANVIL</div>
            <div class="anvil3-anvil-header">
              <!-- 64px 아이콘 (rarity frame) -->
              <div class="anvil3-icon-frame">
                <span class="anvil3-icon-big">⚔</span>
              </div>
              <div class="anvil3-anvil-meta">
                <div class="anvil3-item-name">IRON ECHO BLADE</div>
                <div class="anvil3-item-title">Surveyor's Blade</div>
                <div class="anvil3-recovery">Recovery <b>44%</b></div>
              </div>
            </div>

            <!-- 단계형 RadialMap 임베드 -->
            <div class="anvil3-radial">
              <svg viewBox="0 0 540 360" width="100%" preserveAspectRatio="xMidYMid meet">
                <rect width="540" height="360" fill="#0a0a0a"/>
                <!-- Stats panel (left) -->
                <g transform="translate(8 8)">
                  <rect width="80" height="344" fill="none" stroke="#3a3a3a" stroke-width="1"/>
                  <g font-family="Chakra Petch,sans-serif" text-anchor="middle">
                    <text x="40" y="22" fill="#ffd470" font-size="8" font-weight="700" letter-spacing="2">STRATUMS</text>
                    <text x="40" y="46" fill="#ffa41b" font-size="18" font-weight="700">5</text>
                    <line x1="10" y1="60" x2="70" y2="60" stroke="#3a3a3a"/>
                    <text x="40" y="80" fill="#888" font-size="8" font-weight="700" letter-spacing="1.5">YOUR ATK</text>
                    <text x="40" y="104" fill="#ccc" font-size="16" font-weight="700">38</text>
                    <line x1="10" y1="118" x2="70" y2="118" stroke="#3a3a3a"/>
                    <text x="40" y="138" fill="#ffd470" font-size="8" font-weight="700" letter-spacing="2">ATK GATE</text>
                    <text x="40" y="162" fill="#ff6060" font-size="18" font-weight="700">45</text>
                    <line x1="10" y1="176" x2="70" y2="176" stroke="#3a3a3a"/>
                    <text x="40" y="196" fill="#ffd470" font-size="8" font-weight="700" letter-spacing="2">IDENTITY</text>
                    <text x="40" y="220" fill="#ffa41b" font-size="18" font-weight="700">II</text>
                    <line x1="10" y1="234" x2="70" y2="234" stroke="#3a3a3a"/>
                    <text x="40" y="254" fill="#888" font-size="8" font-weight="700" letter-spacing="1.5">DIVES</text>
                    <text x="40" y="278" fill="#ccc" font-size="16" font-weight="700">7</text>
                  </g>
                </g>

                <!-- Stepped graph -->
                <g transform="translate(110 16)">
                  <g stroke="#ffa41b" stroke-width="1.5" stroke-dasharray="3 3" fill="none">
                    <line x1="160" y1="40" x2="160" y2="78"/>
                    <line x1="160" y1="116" x2="160" y2="154"/>
                    <line x1="160" y1="192" x2="160" y2="230"/>
                    <line x1="160" y1="268" x2="160" y2="282"/>
                  </g>
                  <g fill="#ffa41b">
                    <polygon points="156,74 164,74 160,82"/>
                    <polygon points="156,150 164,150 160,158"/>
                    <polygon points="156,226 164,226 160,234"/>
                    <polygon points="156,278 164,278 160,286"/>
                  </g>
                  <!-- S1 -->
                  <g transform="translate(0 16)">
                    <text x="-8" y="6" fill="#bbb" font-size="8" font-weight="700" letter-spacing="1" font-family="Chakra Petch,sans-serif">STRATUM 1</text>
                    <line x1="46" y1="2" x2="296" y2="2" stroke="#2a2a2a"/>
                    <g fill="#0a0a0a" stroke="#ffa41b" stroke-width="1">
                      <polygon points="90,2 96,-4 102,2 96,8"/>
                      <polygon points="124,2 130,-4 136,2 130,8"/>
                      <polygon points="194,2 200,-4 206,2 200,8"/>
                      <polygon points="228,2 234,-4 240,2 234,8"/>
                    </g>
                    <g stroke="#5a3a1a" stroke-width="1" stroke-dasharray="2 2">
                      <line x1="96" y1="2" x2="160" y2="2"/><line x1="160" y1="2" x2="234" y2="2"/>
                    </g>
                    <polygon points="160,-12 174,2 160,16 146,2" fill="#5a3a14" stroke="#ffa41b" opacity="0.4"/>
                    <polygon points="160,-8 170,2 160,12 150,2" fill="#ffa41b" stroke="#ffd470" stroke-width="1.5"/>
                    <polygon points="160,-3 164,2 160,7 156,2" fill="#1a1a1a"/>
                  </g>
                  <!-- S2 -->
                  <g transform="translate(0 92)">
                    <text x="-8" y="6" fill="#bbb" font-size="8" font-weight="700" letter-spacing="1" font-family="Chakra Petch,sans-serif">STRATUM 2</text>
                    <line x1="46" y1="2" x2="296" y2="2" stroke="#2a2a2a"/>
                    <g fill="#0a0a0a" stroke="#ffa41b" stroke-width="1">
                      <polygon points="74,2 80,-4 86,2 80,8"/><polygon points="108,2 114,-4 120,2 114,8"/><polygon points="142,2 148,-4 154,2 148,8"/>
                      <polygon points="184,2 190,-4 196,2 190,8"/><polygon points="218,2 224,-4 230,2 224,8"/><polygon points="252,2 258,-4 264,2 258,8"/>
                    </g>
                    <g stroke="#5a3a1a" stroke-width="1" stroke-dasharray="2 2">
                      <line x1="80" y1="2" x2="160" y2="2"/><line x1="160" y1="2" x2="258" y2="2"/>
                    </g>
                    <polygon points="160,-12 174,2 160,16 146,2" fill="#5a3a14" stroke="#ffa41b" opacity="0.4"/>
                    <polygon points="160,-8 170,2 160,12 150,2" fill="#ffa41b" stroke="#ffd470" stroke-width="1.5"/>
                    <polygon points="160,-3 164,2 160,7 156,2" fill="#1a1a1a"/>
                  </g>
                  <!-- HERE cursor (S2→S3 사이) -->
                  <g transform="translate(160 135)">
                    <circle cx="0" cy="0" r="6" fill="none" stroke="#bcd0e0" opacity="0.5"/>
                    <polygon points="-4,-3 4,-3 0,4" fill="#e0eaf2"/>
                    <text x="12" y="3" fill="#e0eaf2" font-size="7" font-weight="700" letter-spacing="1" font-family="Chakra Petch,sans-serif">HERE</text>
                  </g>
                  <!-- S3 -->
                  <g transform="translate(0 168)">
                    <text x="-8" y="6" fill="#888" font-size="8" font-weight="700" letter-spacing="1" font-family="Chakra Petch,sans-serif">STRATUM 3</text>
                    <line x1="46" y1="2" x2="296" y2="2" stroke="#2a2a2a"/>
                    <g fill="#0a0a0a" stroke="#ffa41b" stroke-width="1" opacity="0.6">
                      <polygon points="64,2 70,-4 76,2 70,8"/><polygon points="98,2 104,-4 110,2 104,8"/><polygon points="132,2 138,-4 144,2 138,8"/>
                      <polygon points="190,2 196,-4 202,2 196,8"/><polygon points="224,2 230,-4 236,2 230,8"/><polygon points="258,2 264,-4 270,2 264,8"/>
                    </g>
                    <g opacity="0.6">
                      <polygon points="160,-12 174,2 160,16 146,2" fill="#5a3a14" stroke="#ffa41b" opacity="0.4"/>
                      <polygon points="160,-8 170,2 160,12 150,2" fill="#ffa41b" stroke="#ffd470" stroke-width="1.5"/>
                    </g>
                  </g>
                  <!-- S4 placeholder -->
                  <g transform="translate(0 244)" opacity="0.35">
                    <text x="-8" y="6" fill="#666" font-size="8" font-weight="700" letter-spacing="1" font-family="Chakra Petch,sans-serif">STRATUM 4</text>
                    <line x1="46" y1="2" x2="296" y2="2" stroke="#2a2a2a"/>
                    <polygon points="160,-10 172,2 160,14 148,2" fill="none" stroke="#ffa41b"/>
                  </g>
                  <!-- S5 ABYSS placeholder -->
                  <g transform="translate(0 292)" opacity="0.35">
                    <text x="-8" y="6" fill="#ff6060" font-size="8" font-weight="700" letter-spacing="1" font-family="Chakra Petch,sans-serif">STRATUM 5</text>
                    <line x1="46" y1="2" x2="296" y2="2" stroke="#3a1414"/>
                    <polygon points="160,-12 174,2 160,16 146,2" fill="none" stroke="#ff4d4d"/>
                    <text x="190" y="6" fill="#ff8080" font-size="7" font-weight="400" letter-spacing="2" opacity="0.7" font-family="Chakra Petch,sans-serif">· ABYSS</text>
                  </g>
                </g>

                <!-- Legend -->
                <g transform="translate(440 16)">
                  <rect width="88" height="196" fill="none" stroke="#3a3a3a"/>
                  <g font-family="Chakra Petch,sans-serif" font-size="8" font-weight="700" letter-spacing="1.2" fill="#ccc">
                    <polygon points="14,24 22,16 30,24 22,32" fill="#ffa41b" stroke="#ffd470"/>
                    <polygon points="20,24 22,22 24,24 22,26" fill="#1a1a1a"/>
                    <text x="40" y="28">BOSS</text>
                    <polygon points="16,56 22,50 28,56 22,62" fill="#0a0a0a" stroke="#ffa41b"/>
                    <text x="40" y="60">BRANCH</text>
                    <line x1="12" y1="92" x2="32" y2="92" stroke="#ffa41b" stroke-width="1.5" stroke-dasharray="3 3"/>
                    <text x="40" y="96">DIVE</text>
                    <line x1="12" y1="124" x2="32" y2="124" stroke="#5a3a1a" stroke-dasharray="2 2"/>
                    <text x="40" y="128">PATH</text>
                    <circle cx="22" cy="160" r="6" fill="none" stroke="#bcd0e0" opacity="0.5"/>
                    <polygon points="18,157 26,157 22,164" fill="#e0eaf2"/>
                    <text x="40" y="164">HERE</text>
                  </g>
                </g>
              </svg>
            </div>
          </div>

          <!-- ═══ RIGHT: ITEM MAP ═══ -->
          <div class="anvil3-col-right">
            <div class="anvil3-col-title">ITEM MAP</div>
            <div class="anvil3-mapstack">
              <!-- L5 -->
              <div class="anvil3-mapcard active">
                <div class="anvil3-maplabel">L5</div>
                <svg viewBox="0 0 200 60" width="100%" preserveAspectRatio="xMidYMid meet">
                  <rect width="200" height="60" fill="#1a1a1a"/>
                  <g fill="#2a2a2a">
                    <rect x="20" y="20" width="20" height="14"/><rect x="45" y="14" width="24" height="20"/>
                    <rect x="74" y="24" width="20" height="14"/><rect x="100" y="18" width="22" height="16"/>
                    <rect x="128" y="22" width="20" height="14"/><rect x="154" y="16" width="24" height="20"/>
                  </g>
                  <rect x="170" y="20" width="14" height="14" fill="#ff4d4d" stroke="#ff8080"/>
                </svg>
              </div>
              <!-- L4 -->
              <div class="anvil3-mapcard">
                <div class="anvil3-maplabel">L4</div>
                <svg viewBox="0 0 200 60" width="100%" preserveAspectRatio="xMidYMid meet">
                  <rect width="200" height="60" fill="#1a1a1a"/>
                  <g fill="#2a2a2a">
                    <rect x="15" y="22" width="22" height="14"/><rect x="42" y="16" width="22" height="20"/>
                    <rect x="70" y="22" width="22" height="14"/><rect x="98" y="18" width="22" height="16"/>
                    <rect x="125" y="22" width="22" height="14"/><rect x="152" y="18" width="22" height="16"/>
                  </g>
                </svg>
              </div>
              <!-- L3 -->
              <div class="anvil3-mapcard">
                <div class="anvil3-maplabel">L3</div>
                <svg viewBox="0 0 200 60" width="100%" preserveAspectRatio="xMidYMid meet">
                  <rect width="200" height="60" fill="#1a1a1a"/>
                  <g fill="#2a2a2a">
                    <rect x="12" y="20" width="20" height="16"/><rect x="38" y="14" width="24" height="22"/>
                    <rect x="68" y="22" width="22" height="14"/><rect x="96" y="18" width="22" height="18"/>
                    <rect x="124" y="22" width="22" height="14"/><rect x="152" y="14" width="24" height="22"/>
                  </g>
                </svg>
              </div>
              <!-- L2 -->
              <div class="anvil3-mapcard">
                <div class="anvil3-maplabel">L2</div>
                <svg viewBox="0 0 200 60" width="100%" preserveAspectRatio="xMidYMid meet">
                  <rect width="200" height="60" fill="#1a1a1a"/>
                  <g fill="#2a2a2a">
                    <rect x="20" y="22" width="22" height="14"/><rect x="48" y="16" width="22" height="22"/>
                    <rect x="76" y="22" width="22" height="14"/><rect x="104" y="20" width="22" height="16"/>
                    <rect x="132" y="24" width="22" height="14"/><rect x="160" y="20" width="22" height="16"/>
                  </g>
                </svg>
              </div>
              <!-- L1 -->
              <div class="anvil3-mapcard">
                <div class="anvil3-maplabel">L1</div>
                <svg viewBox="0 0 200 60" width="100%" preserveAspectRatio="xMidYMid meet">
                  <rect width="200" height="60" fill="#1a1a1a"/>
                  <g fill="#2a2a2a">
                    <rect x="80" y="22" width="20" height="14"/><rect x="104" y="16" width="22" height="22"/>
                    <rect x="130" y="22" width="20" height="14"/>
                  </g>
                  <polygon points="116,26 122,22 122,30" fill="#ffa41b"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>
        /* ── 3-Column Anvil Layout (v2 2026-05-24) ── */
        .anvil3-root{display:flex;gap:12px;width:100%;color:#ccc;font-family:'Chakra Petch',sans-serif;font-size:11px}
        .anvil3-col-title{font-size:12px;font-weight:700;letter-spacing:2px;color:#ffa41b;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #3a3a3a}
        .anvil3-col-left{flex:0 0 220px}
        .anvil3-col-center{flex:1 1 540px;min-width:480px}
        .anvil3-col-right{flex:0 0 240px}
        /* Inventory */
        .anvil3-tabs{display:flex;gap:4px;margin-bottom:8px}
        .anvil3-tab{flex:1;padding:4px 8px;border:1px solid #3a3a3a;background:#1a1a1a;font-size:10px;text-align:center;letter-spacing:1px}
        .anvil3-tab.active{border-color:#ffa41b;color:#ffa41b}
        .anvil3-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:3px}
        .anvil3-cell{aspect-ratio:1;background:#1a1a1a;border:1px solid #2a2a2a;display:flex;align-items:center;justify-content:center;position:relative;font-size:14px;color:#666}
        .anvil3-cell.sel{border:2px solid #ffa41b;box-shadow:0 0 6px rgba(255,164,27,0.4)}
        .anvil3-cell.r-magic{border-color:#6969ff}
        .anvil3-cell.r-rare{border-color:#ffff00}
        .anvil3-cell.r-legendary{border-color:#ff8000}
        .anvil3-cell.r-ancient{border-color:#00ff00}
        .anvil3-cell.sel.r-legendary{border-color:#ffaa44}
        .anvil3-badge{position:absolute;top:-2px;right:-2px;background:#ffa41b;color:#000;font-size:8px;font-weight:700;padding:1px 3px;border-radius:1px;line-height:1}
        .anvil3-icon{color:#ccc}
        /* Anvil center */
        .anvil3-anvil-header{display:flex;gap:12px;align-items:flex-start;margin-bottom:12px}
        .anvil3-icon-frame{flex:0 0 64px;width:64px;height:64px;background:#1a1a1a;border:2px solid #ff8000;display:flex;align-items:center;justify-content:center;box-shadow:0 0 8px rgba(255,128,0,0.3)}
        .anvil3-icon-big{font-size:36px;color:#ffd470}
        .anvil3-anvil-meta{flex:1;padding-top:2px}
        .anvil3-item-name{font-size:18px;font-weight:700;letter-spacing:1px;color:#ffa41b;line-height:1.1}
        .anvil3-item-title{font-size:13px;font-weight:400;color:#ccc;letter-spacing:0.5px;margin-top:2px}
        .anvil3-recovery{font-size:14px;color:#fff;margin-top:12px;letter-spacing:1px}
        .anvil3-recovery b{color:#ffa41b;font-size:16px;margin-left:4px}
        .anvil3-radial{background:#0a0a0a;border:1px solid #1a1a1a;padding:4px}
        /* Item Map */
        .anvil3-mapstack{display:flex;flex-direction:column;gap:6px}
        .anvil3-mapcard{position:relative;border:1px solid #3a3a3a;background:#1a1a1a;padding:4px}
        .anvil3-mapcard.active{border-color:#ffa41b;box-shadow:0 0 4px rgba(255,164,27,0.3)}
        .anvil3-maplabel{position:absolute;top:4px;left:6px;font-size:10px;font-weight:700;color:#ffa41b;letter-spacing:1.5px;z-index:2;text-shadow:0 0 4px #000}
      </style>
    </div>`;

// Replace lines 1226-1402 (1-indexed) → 0-indexed 1225-1401
const before = lines.slice(0, 1225);
const after = lines.slice(1402);
const newLines = NEW_CARD.split('\n');
const out = [...before, ...newLines, ...after];
fs.writeFileSync(PATH, out.join('\n'));
console.log('replaced', 1226, '-', 1402, '→', newLines.length, 'lines');
console.log('total after:', out.length);
