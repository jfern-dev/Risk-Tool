import re

with open('src/utils/layoutUtils.js', 'r') as f:
    text = f.read()

new_content = """/**
 * Normalizes and scales briefing layouts for the 100-column / 15px row-height grid.
 */
export const normalizeBriefingLayout = (rawConfig) => {
  if (!rawConfig) return { selectedItems: [], layout: [], gridCols: 100, rowHeight: 15 };
  let layout = rawConfig.layout || [];
  
  const isLegacy = rawConfig.gridCols === 24 || !rawConfig.gridCols;
  const scale = isLegacy ? (100.0 / 24.0) : 1;

  // Ensure every item fits properly within the 100-column grid and has minW/minH
  layout = layout.map(item => {
    let w = Number(item.w) || (isLegacy ? 4 : 17);
    let h = Number(item.h) || 4;
    let x = Number(item.x) || 0;
    let y = Number(item.y) || 0;

    if (isLegacy) {
      w = Math.round(w * scale);
      x = Math.round(x * scale);
    }

    // Keep within bounds
    if (w > 100) w = 100;
    if (x + w > 100) x = Math.max(0, 100 - w);

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
    gridCols: 100,
    rowHeight: 15,
    layout
  };
};
"""

with open('src/utils/layoutUtils.js', 'w') as f:
    f.write(new_content)
