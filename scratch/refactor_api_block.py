import re

with open('scratch/api-request.js', 'r') as f:
    text = f.read()

# I will define pairs of (find, replace)
# Note that we use literal string replacement where possible.
replacements = [
    (
"""      appData.dashboardSettings = { ...appData.dashboardSettings, ...body };
      await autoSaveToTemp();
      return { success: true };""",
"""      updateData('Updated dashboard settings', doc => {
        doc.dashboardSettings = { ...doc.dashboardSettings, ...body };
      });
      return { success: true };"""
    ),
    (
"""      appData.schedule = body;
      await autoSaveToTemp();
      return { success: true };""",
"""      updateData('Updated schedule', doc => {
        doc.schedule = body;
      });
      return { success: true };"""
    ),
    (
"""      appData.mapping = body;
      await autoSaveToTemp();
      return { success: true };""",
"""      updateData('Updated risk mapping', doc => {
        doc.mapping = body;
      });
      return { success: true };"""
    ),
    (
"""      appData.simulationCache = body;
      await autoSaveToTemp();
      return { success: true };""",
"""      updateData('Updated simulation cache', doc => {
        doc.simulationCache = body;
      });
      return { success: true };"""
    ),
    (
"""      appData.briefingConfig = body;
      await autoSaveToTemp();
      return { success: true };""",
"""      updateData('Updated briefing config', doc => {
        doc.briefingConfig = body;
      });
      return { success: true };"""
    ),
    (
"""      const cleanBody = { ...body };
      delete cleanBody._isRestore;
      delete cleanBody.restoredDate;

      appData.risks.push(cleanBody);
      await autoSaveToTemp();
      return cleanBody;""",
"""      const cleanBody = { ...body };
      delete cleanBody._isRestore;
      delete cleanBody.restoredDate;

      updateData(`Created risk ${cleanBody.id}`, doc => {
        doc.risks.push(cleanBody);
      });
      return cleanBody;"""
    ),
    (
"""      const cleanBody = { ...body };
      delete cleanBody._isRestore;
      delete cleanBody.restoredDate;
      
      appData.risks[idx] = { ...appData.risks[idx], ...cleanBody, updatedAt: new Date().toISOString() };
      
      // Auto-save snapshot before update
      if (!body._isRestore) {
        appData.snapshots.push({
          id: generateId(appData.snapshots),
          date: new Date().toISOString(),
          note: body._isRestore ? `Restored version from ${new Date(body.restoredDate).toLocaleString()}` : 'Auto-saved before update',
          data: {
            risks: [appData.risks[idx]]
          }
        });
      }
      await autoSaveToTemp();
      return appData.risks[idx];""",
"""      const cleanBody = { ...body };
      delete cleanBody._isRestore;
      delete cleanBody.restoredDate;
      
      updateData(`Updated risk ${id}`, doc => {
        doc.risks[idx] = { ...doc.risks[idx], ...cleanBody, updatedAt: new Date().toISOString() };
        
        if (!body._isRestore) {
          doc.snapshots.push({
            id: generateId(doc.snapshots),
            date: new Date().toISOString(),
            note: body._isRestore ? `Restored version from ${new Date(body.restoredDate).toLocaleString()}` : 'Auto-saved before update',
            data: {
              risks: [doc.risks[idx]]
            }
          });
        }
      });
      return appData.risks.find(r => r.id === id);"""
    ),
    (
"""      const fields = body.fields || {};
      
      // Auto-save snapshot before update
      appData.snapshots.push({
        id: generateId(appData.snapshots),
        date: new Date().toISOString(),
        note: 'Auto-saved before custom field update',
        data: {
          risks: [appData.risks[idx]]
        }
      });

      appData.risks[idx] = { 
        ...appData.risks[idx], 
        customFields: { ...(appData.risks[idx].customFields || {}), ...fields },
        updatedAt: new Date().toISOString() 
      };
      await autoSaveToTemp();
      return appData.risks[idx];""",
"""      const fields = body.fields || {};
      
      updateData(`Updated custom fields for risk ${id}`, doc => {
        doc.snapshots.push({
          id: generateId(doc.snapshots),
          date: new Date().toISOString(),
          note: 'Auto-saved before custom field update',
          data: {
            risks: [doc.risks[idx]]
          }
        });

        doc.risks[idx] = { 
          ...doc.risks[idx], 
          customFields: { ...(doc.risks[idx].customFields || {}), ...fields },
          updatedAt: new Date().toISOString() 
        };
      });
      return appData.risks.find(r => r.id === id);"""
    ),
    (
"""      const idx = appData.risks.findIndex(r => r.id === id);
      if (idx === -1) throw new Error('Risk not found');
      appData.risks.splice(idx, 1);
      if (appData.mapping) {
        appData.mapping = appData.mapping.filter(m => m.riskId !== id);
      }
      await autoSaveToTemp();
      return { success: true };""",
"""      const idx = appData.risks.findIndex(r => r.id === id);
      if (idx === -1) throw new Error('Risk not found');
      updateData(`Deleted risk ${id}`, doc => {
        doc.risks.splice(idx, 1);
        if (doc.mapping) {
          doc.mapping = doc.mapping.filter(m => m.riskId !== id);
        }
      });
      return { success: true };"""
    ),
    (
"""      const newField = { id: generateId(appData.fields), ...body, createdAt: new Date().toISOString() };
      appData.fields.push(newField);
      await autoSaveToTemp();
      return newField;""",
"""      const newField = { id: generateId(appData.fields), ...body, createdAt: new Date().toISOString() };
      updateData('Created custom field', doc => {
        doc.fields.push(newField);
      });
      return newField;"""
    ),
    (
"""      appData.fields = appData.fields.filter(f => f.id !== id);
      await autoSaveToTemp();
      return { success: true };""",
"""      updateData(`Deleted custom field ${id}`, doc => {
        doc.fields = doc.fields.filter(f => f.id !== id);
      });
      return { success: true };"""
    ),
    (
"""      if (!risk.burndown) risk.burndown = [];
      const newEntry = { id: generateId(risk.burndown), ...body, date: new Date().toISOString() };
      risk.burndown.push(newEntry);
      await autoSaveToTemp();
      return newEntry;""",
"""      const newEntry = { id: generateId(risk.burndown || []), ...body, date: new Date().toISOString() };
      updateData(`Added burndown entry to risk ${riskId}`, doc => {
        const r = doc.risks.find(r => r.id === riskId);
        if (r) {
          if (!r.burndown) r.burndown = [];
          r.burndown.push(newEntry);
        }
      });
      return newEntry;"""
    ),
    (
"""      if (!risk.burndown) throw new Error('No burndown data found');
      const idx = risk.burndown.findIndex(b => b.id === entryId);
      if (idx === -1) throw new Error('Entry not found');
      risk.burndown.splice(idx, 1);
      await autoSaveToTemp();
      return { success: true };""",
"""      updateData(`Deleted burndown entry ${entryId} from risk ${riskId}`, doc => {
        const r = doc.risks.find(r => r.id === riskId);
        if (r && r.burndown) {
          const idx = r.burndown.findIndex(b => b.id === entryId);
          if (idx !== -1) r.burndown.splice(idx, 1);
        }
      });
      return { success: true };"""
    ),
    (
"""      const newSnapshot = { id: generateId(appData.snapshots), ...body, date: new Date().toISOString() };
      appData.snapshots.push(newSnapshot);
      await autoSaveToTemp();
      return newSnapshot;""",
"""      const newSnapshot = { id: generateId(appData.snapshots), ...body, date: new Date().toISOString() };
      updateData('Added snapshot', doc => {
        doc.snapshots.push(newSnapshot);
      });
      return newSnapshot;"""
    ),
    (
"""      const idx = appData.snapshots.findIndex(s => s.id === id);
      if (idx === -1) throw new Error('Snapshot not found');
      appData.snapshots.splice(idx, 1);
      await autoSaveToTemp();
      return { success: true };""",
"""      const idx = appData.snapshots.findIndex(s => s.id === id);
      if (idx === -1) throw new Error('Snapshot not found');
      updateData(`Deleted snapshot ${id}`, doc => {
        doc.snapshots.splice(idx, 1);
      });
      return { success: true };"""
    ),
    (
"""      const idx = appData.snapshots.findIndex(s => s.id === id);
      if (idx === -1) throw new Error('Snapshot not found');
      appData.snapshots[idx] = { ...appData.snapshots[idx], ...body, date: new Date().toISOString() };
      await autoSaveToTemp();
      return appData.snapshots[idx];""",
"""      const idx = appData.snapshots.findIndex(s => s.id === id);
      if (idx === -1) throw new Error('Snapshot not found');
      updateData(`Updated snapshot ${id}`, doc => {
        doc.snapshots[idx] = { ...doc.snapshots[idx], ...body, date: new Date().toISOString() };
      });
      return appData.snapshots.find(s => s.id === id);"""
    )
]

for old, new in replacements:
    if old not in text:
        print(f"WARNING: Could not find block:\n{old}")
    text = text.replace(old, new)

with open('scratch/api-request.js', 'w') as f:
    f.write(text)

