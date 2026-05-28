# Item World Entry Corridor

## Behavior

- Item World entries can show an LDtk-authored corridor before normal ItemStratum gameplay.
- Corridor levels named `ItemStratum_Corridor_1`, `_2`, and `_3` are shuffled deterministically as the opening group when present.
- Corridor levels named `ItemStratum_Corridor_4` and higher are shuffled deterministically per item/stratum and appended as a 10-segment tail. If fewer than 10 variants exist, the tail repeats shuffled cycles.
- Corridor templates are excluded from normal ItemStratum room template selection.

## Handoff

- Exiting the corridor happens only after the player falls to the corridor map's bottom boundary; authored low platforms inside corridor segments do not hand off to ItemStratum.
- Corridor exit no longer preserves the corridor x-position.
- The player starts at the current stratum start room's LDtk `Player` entity if present, even if that point is in mid-air.
- If no LDtk `Player` entity exists for the start room, the fallback remains the floor spawn search.

## Visuals

- Corridor platforms stay black with the corridor grayscale/contrast filter.
- The parallax background also receives the corridor filter, but with an additional brightness pass so the corridor background reads like the bright outside-world backdrop instead of the dark ItemStratum interior.
