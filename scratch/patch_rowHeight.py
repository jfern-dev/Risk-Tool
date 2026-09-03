import re

def update_file(filepath):
    with open(filepath, 'r') as f:
        text = f.read()

    text = text.replace("rowHeight: 15", "rowHeight: Math.floor(width / 100)")
    # But wait, in the state initialization `width` is not defined yet or is 800.
    # Actually, we don't need to persist rowHeight in config if it's dynamic based on width!
    # But we can just replace it for droppingItem
    text = text.replace("rowHeight: 15,\n                      margin: [2, 2]", "rowHeight: Math.floor(width / 100),\n                      margin: [2, 2]")

    with open(filepath, 'w') as f:
        f.write(text)

update_file('src/pages/BriefingAdmin.jsx')
