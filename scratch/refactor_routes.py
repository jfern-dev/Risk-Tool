import re

with open('scratch/main.js', 'r') as f:
    content = f.read()

replacements = [
    # dashboard settings
    (r"appData\.dashboardSettings = \{ \.\.\.appData\.dashboardSettings, \.\.\.body \};",
     r"updateData('Updated dashboard settings', doc => { doc.dashboardSettings = { ...doc.dashboardSettings, ...body }; });"),
     
    # schedule
    (r"appData\.schedule = body;",
     r"updateData('Updated schedule', doc => { doc.schedule = body; });"),
     
    # mapping
    (r"appData\.mapping = body;",
     r"updateData('Updated risk mapping', doc => { doc.mapping = body; });"),
     
    # simulation cache
    (r"appData\.simulationCache = body;",
     r"updateData('Updated simulation cache', doc => { doc.simulationCache = body; });"),
     
    # briefing config
    (r"appData\.briefingConfig = body;",
     r"updateData('Updated briefing config', doc => { doc.briefingConfig = body; });"),

    # create risk
    (r"appData\.risks\.push\(cleanBody\);",
     r"updateData(`Created risk ${cleanBody.id}`, doc => { doc.risks.push(cleanBody); });"),
     
    # update risk
    (r"appData\.risks\[idx\] = \{ \.\.\.appData\.risks\[idx\], \.\.\.cleanBody, updatedAt: new Date\(\)\.toISOString\(\) \};",
     r"updateData(`Updated risk ${id}`, doc => { doc.risks[idx] = { ...doc.risks[idx], ...cleanBody, updatedAt: new Date().toISOString() }; });"),
     
    # update custom fields
    (r"appData\.risks\[idx\] = \{ \.\.\.appData\.risks\[idx\], customFields: \.\.\. \};",
     r"updateData(`Updated custom fields for risk ${id}`, doc => { doc.risks[idx] = { ...doc.risks[idx], customFields: { ...doc.risks[idx].customFields, ...fields } }; });"),
     
    # Wait, update-custom-fields is complex. Let's look at the original code.
]

for old, new in replacements:
    content = re.sub(old, new, content)

with open('scratch/main.js', 'w') as f:
    f.write(content)
