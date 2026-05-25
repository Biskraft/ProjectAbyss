export function centeredPanelPosition(viewW: number, viewH: number, panelW: number, panelH: number): { x: number; y: number } {
  return {
    x: Math.floor((viewW - panelW) / 2),
    y: Math.floor((viewH - panelH) / 2),
  };
}

export function scrollThumbMetrics(
  itemCount: number,
  gridCols: number,
  gridRows: number,
  cellH: number,
  cellGap: number,
  scrollRowOffset: number,
): { barH: number; thumbH: number; thumbY: number } | null {
  const totalRows = Math.ceil(itemCount / gridCols);
  if (totalRows <= gridRows) return null;

  const barH = gridRows * (cellH + cellGap) - cellGap;
  const thumbH = Math.max(10, barH * (gridRows / totalRows));
  const thumbY = (scrollRowOffset / (totalRows - gridRows)) * (barH - thumbH);
  return { barH, thumbH, thumbY };
}
