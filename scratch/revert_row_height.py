import re

def update_file(filepath):
    with open(filepath, 'r') as f:
        text = f.read()

    # Revert dynamic rowHeight back to fixed 15
    text = text.replace("rowHeight={Math.floor(width / 100)}", "rowHeight={15}")
    text = text.replace("rowHeight: Math.floor(width / 100)", "rowHeight: 15")

    with open(filepath, 'w') as f:
        f.write(text)

update_file('src/pages/BriefingAdmin.jsx')
update_file('src/pages/Briefing.jsx')
