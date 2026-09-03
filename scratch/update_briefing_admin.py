import re

with open('src/pages/BriefingAdmin.jsx', 'r') as f:
    text = f.read()

# Replace WIDGET_TYPES defaultW from 4 to 17
text = re.sub(r'defaultW: 4', r'defaultW: 17', text)

# Replace gridCols: 24 to gridCols: 100 in initial state and payload
text = text.replace("gridCols: 24", "gridCols: 100")

# Replace cols={24} to cols={100}
text = text.replace("cols={24}", "cols={100}")

# Replace handleTileGrid math
old_tile = """    const tiled = config.layout.map((item, idx) => {
      const colIdx = idx % 6;
      const rowIdx = Math.floor(idx / 6);
      return {
        ...item,
        x: colIdx * 4,
        y: rowIdx * 4,
        w: 4,
        h: 4,
        minW: 1,
        minH: 1
      };
    });
    setConfig(prev => ({ ...prev, layout: tiled }));
    toast.success('Arranged all widgets in a 6-across (4x4) grid');"""

new_tile = """    const tiled = config.layout.map((item, idx) => {
      const colIdx = idx % 6;
      const rowIdx = Math.floor(idx / 6);
      return {
        ...item,
        x: colIdx * 16,
        y: rowIdx * 4,
        w: 16,
        h: 4,
        minW: 1,
        minH: 1
      };
    });
    setConfig(prev => ({ ...prev, layout: tiled }));
    toast.success('Arranged all widgets in a 6-across (16x4) grid');"""

text = text.replace(old_tile, new_tile)

with open('src/pages/BriefingAdmin.jsx', 'w') as f:
    f.write(text)
