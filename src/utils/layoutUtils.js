/**
 * Normalizes and scales briefing layouts for the 24-column / 15px row-height grid.
 */
export const normalizeBriefingLayout = (rawConfig) => {
  if (!rawConfig) return { selectedItems: [], layout: [], gridCols: 24, rowHeight: 15 };
  let layout = rawConfig.layout || [];

  // Ensure every item fits properly within the 24-column grid and has minW/minH
  layout = layout.map(item => {
    let w = Number(item.w) || 4;
    let h = Number(item.h) || 4;
    let x = Number(item.x) || 0;
    let y = Number(item.y) || 0;

    // Keep within bounds
    if (w > 24) w = 24;
    if (x + w > 24) x = Math.max(0, 24 - w);

    return {
      ...item,
      x,
      y,
      w,
      h,
      minW: 1,
      minH: 1
    };
  });

  return {
    ...rawConfig,
    gridCols: 24,
    rowHeight: 15,
    layout
  };
};
