"""
Dead Cells data.cdb -> CastleDB 1.5 호환 변환기

Dead Cells는 CastleDB를 포크하여 커스텀 typeStr(16, 17, 18)과
비표준 display 값을 사용한다. 이 스크립트는 해당 필드를 CastleDB 1.5가
인식할 수 있는 값으로 변환한다.

변환 내역:
  - "format" 키 제거 (CastleDB 1.5 미지원)
  - typeStr "16" (DC 커스텀 숫자/배열) -> "13" (Dynamic)
  - typeStr "17" (DC 커스텀 dict/props) -> "13" (Dynamic)
  - typeStr "18" (DC 커스텀 벡터/좌표) -> "13" (Dynamic)
  - display: 1 (정수) -> display: null
"""

import json
import sys
import shutil
from pathlib import Path

SRC = Path(r"c:\Program Files (x86)\Steam\steamapps\common\Dead Cells\res\data.cdb")
DST = SRC.parent / "data_castledb15.cdb"

CUSTOM_TYPES = {"16", "17", "18"}
REPLACEMENT_TYPE = "13"  # Dynamic


def convert(data: dict) -> dict:
    stats = {"format_removed": False, "type_converted": 0, "display_fixed": 0}

    # 1. Remove non-standard "format" key
    if "format" in data:
        del data["format"]
        stats["format_removed"] = True

    # 2. Fix columns
    for sheet in data.get("sheets", []):
        for col in sheet.get("columns", []):
            # Convert custom typeStr -> Dynamic
            if col.get("typeStr") in CUSTOM_TYPES:
                col["typeStr"] = REPLACEMENT_TYPE
                stats["type_converted"] += 1

            # Fix integer display -> null
            if isinstance(col.get("display"), int):
                col["display"] = None
                stats["display_fixed"] += 1

    return stats


def main():
    if not SRC.exists():
        print(f"[ERROR] Source not found: {SRC}")
        sys.exit(1)

    print(f"[READ]  {SRC}")
    with open(SRC, "r", encoding="utf-8") as f:
        data = json.load(f)

    stats = convert(data)

    print(f"[WRITE] {DST}")
    with open(DST, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))

    print(f"[DONE]  format removed: {stats['format_removed']}")
    print(f"        typeStr converted: {stats['type_converted']} columns (16/17/18 -> 13)")
    print(f"        display fixed: {stats['display_fixed']} columns (int -> null)")
    print(f"        Output: {DST}")
    print(f"        CastleDB 1.5에서 {DST.name}을 열어 확인하세요.")


if __name__ == "__main__":
    main()
