import re

def update_file(filepath):
    with open(filepath, 'r') as f:
        text = f.read()

    # Change margins
    text = text.replace("margin: [8, 8]", "margin: [2, 2]")
    text = text.replace("margin={[8, 8]}", "margin={[2, 2]}")
    text = text.replace("margin={[4, 4]}", "margin={[2, 2]}")

    # Change rowHeight=15 to dynamic width/100
    # For BriefingAdmin.jsx and Briefing.jsx, the GridLayout component has width={width}
    # So we can replace rowHeight={15} with rowHeight={width / 100}
    text = text.replace("rowHeight={15}", "rowHeight={Math.floor(width / 100)}")

    with open(filepath, 'w') as f:
        f.write(text)

update_file('src/pages/BriefingAdmin.jsx')
update_file('src/pages/Briefing.jsx')
