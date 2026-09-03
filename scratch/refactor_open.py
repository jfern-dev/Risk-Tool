import re

with open('scratch/main.js', 'r') as f:
    content = f.read()

open_old = """      // We also auto-save these to temp files
      await autoSaveToTemp();
    } else {
      let isZip = true;
      const zip = new AdmZip(filePath);
      try {
        zip.extractAllTo(workDir, true);
        
        // Handle migration from attachments -> attachment folder naming
        try {
          const legacyAttachmentDir = path.join(workDir, 'attachments');
          const newAttachmentDir = path.join(workDir, 'attachment');
          const stat = await fs.stat(newAttachmentDir).catch(()=>null);
          if (stat && stat.isDirectory()) {
            await fs.rename(newAttachmentDir, legacyAttachmentDir).catch(()=>null); // We rename to attachments internally for temp dir
          }
        } catch (e) {}

      } catch (e) {
        isZip = false;
      }
      
      let configStr = '{}', adminStr = '{}', rioStr = '[]', scheduleStr = '{"tasks":[],"dependencies":[]}', mappingStr = '[]', mcStr = 'null';

      if (isZip) {
        // Read new format if they exist
        try { configStr = await fs.readFile(path.join(workDir, 'Config.json'), 'utf-8'); } catch (e) {
          // Fallback to data.json
          try { 
             const oldData = await fs.readFile(path.join(workDir, 'data.json'), 'utf-8'); 
             const p = JSON.parse(oldData);
             configStr = JSON.stringify({ dashboardSettings: p.dashboardSettings, briefingConfig: p.briefingConfig || {} });
             adminStr = JSON.stringify({ fields: p.fields, snapshots: p.snapshots });
             rioStr = JSON.stringify(p.risks || []);
             mcStr = JSON.stringify(p.simulationCache || null);
          } catch (ee) {}
        }
        try { adminStr = await fs.readFile(path.join(workDir, 'Admin.json'), 'utf-8'); } catch (e) {}
        try { rioStr = await fs.readFile(path.join(workDir, 'RIO.json'), 'utf-8'); } catch (e) {}
        try { scheduleStr = await fs.readFile(path.join(workDir, 'Schedule.json'), 'utf-8'); } catch (e) {
          try { scheduleStr = await fs.readFile(path.join(workDir, 'schedule.json'), 'utf-8'); } catch (ee) {}
        }
        try { mappingStr = await fs.readFile(path.join(workDir, 'RIO-Schedule.json'), 'utf-8'); } catch (e) {
          try { mappingStr = await fs.readFile(path.join(workDir, 'mapping.json'), 'utf-8'); } catch (ee) {}
        }
        try { mcStr = await fs.readFile(path.join(workDir, 'Monte-Carlo.json'), 'utf-8'); } catch (e) {}
      } else {
        const dataStr = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(dataStr);
        appData = { ...parsed };
      }
      
      if (isZip) {
        const configParsed = JSON.parse(configStr);
        const adminParsed = JSON.parse(adminStr);
        appData = {
          dashboardSettings: configParsed.dashboardSettings || { hiddenFields: [] },
          briefingConfig: configParsed.briefingConfig || { selectedItems: [], layout: [] },
          fields: adminParsed.fields || [],
          snapshots: adminParsed.snapshots || [],
          risks: JSON.parse(rioStr) || [],
          schedule: JSON.parse(scheduleStr) || { tasks: [], dependencies: [] },
          mapping: JSON.parse(mappingStr) || [],
          simulationCache: JSON.parse(mcStr) || null
        };
      }
    }  if (!appData.dashboardSettings.picklists) {"""

open_new = """      // We also auto-save these to temp files
      await autoSaveToTemp();
    } else {
      let loadedAutomerge = false;
      try {
        const fileData = await fs.readFile(filePath);
        appData = Automerge.load(fileData);
        loadedAutomerge = true;
      } catch (err) {
        // Not a valid automerge file, try legacy zip or json
      }

      if (!loadedAutomerge) {
        let isZip = true;
        const zip = new AdmZip(filePath);
        try {
          zip.extractAllTo(workDir, true);
          
          try {
            const legacyAttachmentDir = path.join(workDir, 'attachments');
            const newAttachmentDir = path.join(workDir, 'attachment');
            const stat = await fs.stat(newAttachmentDir).catch(()=>null);
            if (stat && stat.isDirectory()) {
              await fs.rename(newAttachmentDir, legacyAttachmentDir).catch(()=>null); 
            }
          } catch (e) {}
  
        } catch (e) {
          isZip = false;
        }
        
        let configStr = '{}', adminStr = '{}', rioStr = '[]', scheduleStr = '{"tasks":[],"dependencies":[]}', mappingStr = '[]', mcStr = 'null';
  
        if (isZip) {
          try { configStr = await fs.readFile(path.join(workDir, 'Config.json'), 'utf-8'); } catch (e) {
            try { 
               const oldData = await fs.readFile(path.join(workDir, 'data.json'), 'utf-8'); 
               const p = JSON.parse(oldData);
               configStr = JSON.stringify({ dashboardSettings: p.dashboardSettings, briefingConfig: p.briefingConfig || {} });
               adminStr = JSON.stringify({ fields: p.fields, snapshots: p.snapshots });
               rioStr = JSON.stringify(p.risks || []);
               mcStr = JSON.stringify(p.simulationCache || null);
            } catch (ee) {}
          }
          try { adminStr = await fs.readFile(path.join(workDir, 'Admin.json'), 'utf-8'); } catch (e) {}
          try { rioStr = await fs.readFile(path.join(workDir, 'RIO.json'), 'utf-8'); } catch (e) {}
          try { scheduleStr = await fs.readFile(path.join(workDir, 'Schedule.json'), 'utf-8'); } catch (e) {
            try { scheduleStr = await fs.readFile(path.join(workDir, 'schedule.json'), 'utf-8'); } catch (ee) {}
          }
          try { mappingStr = await fs.readFile(path.join(workDir, 'RIO-Schedule.json'), 'utf-8'); } catch (e) {
            try { mappingStr = await fs.readFile(path.join(workDir, 'mapping.json'), 'utf-8'); } catch (ee) {}
          }
          try { mcStr = await fs.readFile(path.join(workDir, 'Monte-Carlo.json'), 'utf-8'); } catch (e) {}
        } else {
          const dataStr = await fs.readFile(filePath, 'utf-8');
          const parsed = JSON.parse(dataStr);
          appData = Automerge.from(parsed);
        }
        
        if (isZip) {
          const configParsed = JSON.parse(configStr);
          const adminParsed = JSON.parse(adminStr);
          appData = Automerge.from({
            dashboardSettings: configParsed.dashboardSettings || { hiddenFields: [] },
            briefingConfig: configParsed.briefingConfig || { selectedItems: [], layout: [] },
            fields: adminParsed.fields || [],
            snapshots: adminParsed.snapshots || [],
            risks: JSON.parse(rioStr) || [],
            schedule: JSON.parse(scheduleStr) || { tasks: [], dependencies: [] },
            mapping: JSON.parse(mappingStr) || [],
            simulationCache: JSON.parse(mcStr) || null,
            _attachments: {}
          });
        }
        
        // Handle migration to automerge file
        const archiveDir = path.join(app.getPath('userData'), 'archives');
        await fs.mkdir(archiveDir, { recursive: true });
        const archiveName = path.basename(filePath);
        await fs.copyFile(filePath, path.join(archiveDir, archiveName));
        
        const saveDialog = await dialog.showSaveDialog(mainWindow, {
          title: 'Save New Automerge Workspace',
          defaultPath: currentFilePath ? currentFilePath.replace('.erm', '.am') : 'risk-workspace.am',
          filters: [{ name: 'Automerge File', extensions: ['am'] }]
        });
        
        if (!saveDialog.canceled && saveDialog.filePath) {
          currentFilePath = saveDialog.filePath;
          await fs.writeFile(currentFilePath, Automerge.save(appData));
        }
      }
    }  if (!appData.dashboardSettings.picklists) {"""
content = content.replace(open_old, open_new)

with open('scratch/main.js', 'w') as f:
    f.write(content)
