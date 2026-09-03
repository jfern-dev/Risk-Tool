import re

with open('src/pages/Briefing.jsx', 'r') as f:
    text = f.read()

# Replace cols={24} to cols={100}
text = text.replace("cols={24}", "cols={100}")

with open('src/pages/Briefing.jsx', 'w') as f:
    f.write(text)
