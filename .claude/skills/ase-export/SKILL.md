---
name: ase-export
description: Export Aseprite (.ase/.aseprite) files to PNG spritesheet + JSON. Use this skill whenever the user mentions exporting ase files, aseprite export, sprite sheet export, or needs to convert .ase to .png. Also trigger when the user says "ase export", "export ase", "ase-export", or references updating sprite sheets from Aseprite source files.
---

# Aseprite Export

Export `.ase` / `.aseprite` files to PNG spritesheet + JSON using the Aseprite CLI.

## Aseprite Path

```
C:\Program Files (x86)\Steam\steamapps\common\Aseprite\aseprite.exe
```

## Usage

### No arguments — export all UI assets

When invoked without arguments (e.g., `/ase-export`), export every `.ase` file in:

```
game/public/assets/ui/
```

### With file path argument

When invoked with a path (e.g., `/ase-export game/public/assets/sprites/fx_slash.ase`), export only that file.

### With directory argument

When invoked with a directory (e.g., `/ase-export game/public/assets/sprites/`), export all `.ase` and `.aseprite` files in that directory.

## Export Command

For each `.ase` / `.aseprite` file, run:

```bash
"/c/Program Files (x86)/Steam/steamapps/common/Aseprite/aseprite.exe" -b "{input}" --sheet "{basename}_sheet.png" --data "{basename}.json" --format json-array --sheet-type packed --split-slices --list-slices
```

Where:
- `{input}` = full path to the `.ase` file
- `{basename}` = same directory + filename without extension
- `-b` = batch mode (no UI)
- `--sheet-type packed` = optimal packing
- `--split-slices` = each slice becomes a separate entry
- `--list-slices` = include slice metadata in JSON

## Output

Each input file produces two outputs in the same directory:

| Input | Output 1 | Output 2 |
|:------|:---------|:---------|
| `ui_hud_01.ase` | `ui_hud_01_sheet.png` | `ui_hud_01.json` |
| `fx_slash.ase` | `fx_slash_sheet.png` | `fx_slash.json` |

## Process

1. Find all target `.ase` / `.aseprite` files (based on arguments)
2. For each file, run the Aseprite CLI export command
3. Report success/failure for each file
4. Show total count: "Exported N files"

## Error Handling

- If Aseprite is not found at the expected path, show the error and suggest checking the installation
- If a file fails to export, log the error and continue with remaining files
- Ignore Aseprite extension warnings (PixelLab dlg errors are harmless, suppress stderr noise)

## Example

```
> /ase-export

Exporting Aseprite files from game/public/assets/ui/...
  [OK] ui_hud_01.ase → ui_hud_01_sheet.png + ui_hud_01.json
Exported 1 file.

> /ase-export game/public/assets/sprites/fx_slash.ase

Exporting: fx_slash.ase
  [OK] fx_slash.ase → fx_slash_sheet.png + fx_slash.json
Exported 1 file.
```
