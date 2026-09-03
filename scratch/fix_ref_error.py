import re

with open('src/pages/BriefingAdmin.jsx', 'r') as f:
    text = f.read()

text = text.replace("rowHeight: Math.floor(width / 100) }", "rowHeight: 15 }")
text = text.replace("rowHeight: Math.floor(width / 100) };", "rowHeight: 15 };")

with open('src/pages/BriefingAdmin.jsx', 'w') as f:
    f.write(text)
