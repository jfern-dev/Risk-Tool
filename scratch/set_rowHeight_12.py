import re

def update_file(filepath):
    with open(filepath, 'r') as f:
        text = f.read()

    # Change rowHeight from 15 to 12
    text = text.replace("rowHeight: 15", "rowHeight: 12")
    text = text.replace("rowHeight={15}", "rowHeight={12}")

    with open(filepath, 'w') as f:
        f.write(text)

update_file('src/pages/BriefingAdmin.jsx')
update_file('src/pages/Briefing.jsx')
