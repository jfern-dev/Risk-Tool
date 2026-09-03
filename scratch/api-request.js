ipcMain.handle('api-request', async (event, { path: reqPath, method, body }) => {
  try {
    const formatRiskId = (id, type) => {
      if (!id) return id;
      let formatted = id.trim();
      if (type === 'Risk') {
        formatted = formatted.replace(/^[IO]-/, '');
        if (!formatted.startsWith('R-')) formatted = 'R-' + formatted;
      } else if (type === 'Issue') {
        formatted = formatted.replace(/^[RO]-/, '');
        if (!formatted.startsWith('I-')) formatted = 'I-' + formatted;
      } else if (type === 'Opportunity') {
        formatted = formatted.replace(/^[RI]-/, '');
        if (!formatted.startsWith('O-')) formatted = 'O-' + formatted;
      }
      return formatted;
    };

    // GET /api/dashboardSettings
    if (reqPath === '/api/dashboardSettings' && method === 'GET') {
      if (!appData.dashboardSettings) {
        appData.dashboardSettings = { hiddenFields: [] };
      }
      if (!appData.dashboardSettings.picklists) {
        appData.dashboardSettings.picklists = {
          level: { options: ['Program', 'Internal'], isMultiSelect: false },
          riskCategory: { options: ['Schedule', 'Cost', 'Technical'], isMultiSelect: true },
          handlingStrategy: { options: ['Accept', 'Decline', 'Transfer', 'Mitigate/Execute'], isMultiSelect: false }
        };
      }
      if (!appData.dashboardSettings.calendar) {
        appData.dashboardSettings.calendar = {
          includeWeekends: false,
          holidays: []
        };
      }
      if (!appData.dashboardSettings.probabilityMapping) {
        appData.dashboardSettings.probabilityMapping = { 
          1: { min: 1, max: 20 }, 
          2: { min: 21, max: 40 }, 
          3: { min: 41, max: 60 }, 
          4: { min: 61, max: 80 }, 
          5: { min: 81, max: 99 } 
        };
      }
      if (!appData.dashboardSettings.enabledModules) {
        appData.dashboardSettings.enabledModules = {
          rio: true,
          monteCarlo: true,
          schedule: false,
          briefing: false,
          briefingAdmin: false
        };
      }
      return appData.dashboardSettings;
    }
    
    // PUT /api/dashboardSettings
    if (reqPath === '/api/dashboardSettings' && method === 'PUT') {
      appData.dashboardSettings = { ...appData.dashboardSettings, ...body };
      await autoSaveToTemp();
      return appData.dashboardSettings;
    }

    // GET /api/schedule
    if (reqPath === '/api/schedule' && method === 'GET') {
      return appData.schedule || { tasks: [], dependencies: [] };
    }

    // PUT /api/schedule
    if (reqPath === '/api/schedule' && method === 'PUT') {
      appData.schedule = body;
      await autoSaveToTemp();
      return appData.schedule;
    }

    // GET /api/mapping
    if (reqPath === '/api/mapping' && method === 'GET') {
      return appData.mapping || [];
    }

    // PUT /api/mapping
    if (reqPath === '/api/mapping' && method === 'PUT') {
      appData.mapping = body;
      await autoSaveToTemp();
      return appData.mapping;
    }

    // GET /api/simulationCache
    if (reqPath === '/api/simulationCache' && method === 'GET') {
      console.log('GET /api/simulationCache returning:', !!appData.simulationCache);
      return appData.simulationCache || null;
    }

    // PUT /api/simulationCache
    if (reqPath === '/api/simulationCache' && method === 'PUT') {
      console.log('PUT /api/simulationCache saving body keys:', Object.keys(body));
      appData.simulationCache = body;
      await autoSaveToTemp();
      return appData.simulationCache;
    }

    // GET /api/snapshots
    if (reqPath === '/api/briefingConfig' && method === 'GET') {
      return appData.briefingConfig || { selectedItems: [], layout: [] };
    }

    // PUT /api/briefingConfig
    if (reqPath === '/api/briefingConfig' && method === 'PUT') {
      appData.briefingConfig = body;
      await autoSaveToTemp();
      return appData.briefingConfig;
    }

    // GET /api/snapshots
    if (reqPath === '/api/snapshots' && method === 'GET') {
      return appData.snapshots;
    }
    // POST /api/snapshots
    if (reqPath === '/api/snapshots' && method === 'POST') {
      const newSnapshot = {
        id: generateId(appData.snapshots),
        note: body.note || 'Manual Snapshot',
        date: new Date().toISOString(),
        risks: JSON.parse(JSON.stringify(appData.risks)) // deep copy
      };
      appData.snapshots.push(newSnapshot);
      await autoSaveToTemp();
      return newSnapshot;
    }

    // GET /api/risks
    if (reqPath === '/api/risks' && method === 'GET') {
      return appData.risks;
    }
    // POST /api/risks
    if (reqPath === '/api/risks' && method === 'POST') {
      if (body.userRiskId) {
        body.userRiskId = formatRiskId(body.userRiskId, body.itemType);
      }
      if (body.userRiskId && appData.risks.some(r => r.userRiskId === body.userRiskId)) {
        throw new Error('An item with this ID already exists. Please choose a unique ID.');
      }
      const newRisk = {
        id: generateId(appData.risks),
        ...body,
        initialLikelihood: body.likelihood || 1,
        initialImpact: body.impact || 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      appData.risks.push(newRisk);
      await autoSaveToTemp();
      return newRisk;
    }
    
    // POST /api/risks/:id/snapshots
    let match = reqPath.match(/^\/api\/risks\/(\d+)\/snapshots$/);
    if (match && method === 'POST') {
      const riskId = parseInt(match[1]);
      const risk = appData.risks.find(r => r.id === riskId);
      if (!risk) throw new Error('Risk not found');
      if (!risk.snapshots) risk.snapshots = [];
      const riskCopy = JSON.parse(JSON.stringify(risk));
      delete riskCopy.snapshots;
      const newSnapshot = {
        id: generateId(risk.snapshots),
        note: body.note || 'Manual Item Snapshot',
        date: new Date().toISOString(),
        data: riskCopy
      };
      risk.snapshots.push(newSnapshot);
      await autoSaveToTemp();
      return risk;
    }

    // GET /api/risks/:id/snapshots
    match = reqPath.match(/^\/api\/risks\/(\d+)\/snapshots$/);
    if (match && method === 'GET') {
      const riskId = parseInt(match[1]);
      const risk = appData.risks.find(r => r.id === riskId);
      if (!risk) throw new Error('Risk not found');
      return risk.snapshots || [];
    }

    // PUT /api/risks/:id
    match = reqPath.match(/^\/api\/risks\/(\d+)$/);
    if (match && method === 'PUT') {
      const id = parseInt(match[1]);
      const idx = appData.risks.findIndex(r => r.id === id);
      if (idx === -1) throw new Error('Risk not found');
      
      if (body.userRiskId) {
        body.userRiskId = formatRiskId(body.userRiskId, body.itemType || appData.risks[idx].itemType);
      }
      if (body.userRiskId && appData.risks.some(r => r.userRiskId === body.userRiskId && r.id !== id)) {
        throw new Error('An item with this ID already exists. Please choose a unique ID.');
      }
      
      // Auto-save snapshot before update
      const oldRisk = appData.risks[idx];
      if (!oldRisk.snapshots) oldRisk.snapshots = [];
      const riskCopy = JSON.parse(JSON.stringify(oldRisk));
      delete riskCopy.snapshots;
      oldRisk.snapshots.push({
        id: generateId(oldRisk.snapshots),
        note: body._isRestore ? `Restored version from ${new Date(body.restoredDate).toLocaleString()}` : 'Auto-saved before update',
        date: new Date().toISOString(),
        data: riskCopy
      });
      // Remove internal _isRestore flag if present
      const cleanBody = { ...body };
      delete cleanBody._isRestore;
      delete cleanBody.restoredDate;

      appData.risks[idx] = { ...appData.risks[idx], ...cleanBody, updatedAt: new Date().toISOString() };
      await autoSaveToTemp();
      return appData.risks[idx];
    }
    
    // POST /api/risks/:id/custom-fields
    match = reqPath.match(/^\/api\/risks\/(\d+)\/custom-fields$/);
    if (match && method === 'POST') {
      const riskId = parseInt(match[1]);
      const risk = appData.risks.find(r => r.id === riskId);
      if (!risk) throw new Error('Risk not found');

      // Auto-save snapshot before update
      if (!risk.snapshots) risk.snapshots = [];
      const riskCopy = JSON.parse(JSON.stringify(risk));
      delete riskCopy.snapshots;
      risk.snapshots.push({
        id: generateId(risk.snapshots),
        note: 'Auto-saved before custom field update',
        date: new Date().toISOString(),
        data: riskCopy
      });

      // Replace custom fields array directly instead of appending
      risk.customFields = (body.fields || []).map((f, i) => ({
        id: i + 1,
        riskId,
        name: f.name,
        value: f.value
      }));
      await autoSaveToTemp();
      return { customFields: risk.customFields };
    }

    // POST /api/risks/:id/status-logs
    match = reqPath.match(/^\/api\/risks\/(\d+)\/status-logs$/);
    if (match && method === 'POST') {
      const id = parseInt(match[1]);
      const risk = appData.risks.find(r => r.id === id);
      if (!risk) throw new Error('Risk not found');
      if (!risk.statusLogs) risk.statusLogs = [];
      const newLog = {
        id: generateId(risk.statusLogs),
        date: new Date().toISOString(),
        status: body.status,
        takeaways: body.takeaways,
        challenges: body.challenges
      };
      risk.statusLogs.push(newLog);
      await autoSaveToTemp();
      return newLog;
    }

    // DELETE /api/risks/:id
    match = reqPath.match(/^\/api\/risks\/(\d+)$/);
    if (match && method === 'DELETE') {
      const id = parseInt(match[1]);
      const idx = appData.risks.findIndex(r => r.id === id);
      if (idx === -1) throw new Error('Risk not found');
      updateData(`Deleted risk ${id}`, doc => {
        doc.risks.splice(idx, 1);
        if (doc.mapping) {
          doc.mapping = doc.mapping.filter(m => m.riskId !== id);
        }
      });
      return { success: true };
    }

    // GET /api/fields
    if (reqPath === '/api/fields' && method === 'GET') {
      return appData.fields;
    }
    // GET /api/fields/risk
    if (reqPath === '/api/fields/risk' && method === 'GET') {
      return appData.fields.filter(f => f.entityType === 'risk');
    }
    // GET /api/fields/burndown
    if (reqPath === '/api/fields/burndown' && method === 'GET') {
      return appData.fields.filter(f => f.entityType === 'burndown');
    }
    // POST /api/fields
    if (reqPath === '/api/fields' && method === 'POST') {
      const newField = { id: generateId(appData.fields), ...body, createdAt: new Date().toISOString() };
      updateData('Created custom field', doc => {
        doc.fields.push(newField);
      });
      return newField;
    }
    // DELETE /api/fields/:id
    match = reqPath.match(/^\/api\/fields\/(\d+)$/);
    if (match && method === 'DELETE') {
      const id = parseInt(match[1]);
      updateData(`Deleted custom field ${id}`, doc => {
        doc.fields = doc.fields.filter(f => f.id !== id);
      });
      return { success: true };
    }

    // POST /api/risks/:id/burndown
    match = reqPath.match(/^\/api\/risks\/(\d+)\/burndown$/);
    if (match && method === 'POST') {
      const riskId = parseInt(match[1]);
      const risk = appData.risks.find(r => r.id === riskId);
      if (!risk) throw new Error('Risk not found');
      if (!risk.burndownSteps) risk.burndownSteps = [];
      const newStep = { id: generateId(risk.burndownSteps), riskId, ...body, isCompleted: false };
      risk.burndownSteps.push(newStep);
      await autoSaveToTemp();
      return newStep;
    }
    
    // PUT /api/risks/:riskId/burndown/:stepId
    match = reqPath.match(/^\/api\/risks\/(\d+)\/burndown\/(\d+)$/);
    if (match && method === 'PUT') {
      const riskId = parseInt(match[1]);
      const stepId = parseInt(match[2]);
      const risk = appData.risks.find(r => r.id === riskId);
      const step = risk?.burndownSteps?.find(s => s.id === stepId);
      if (!step) throw new Error('Step not found');
      Object.assign(step, body);
      await autoSaveToTemp();
      return step;
    }
    
    // PUT /api/risks/:riskId/burndown/:stepId/complete
    match = reqPath.match(/^\/api\/risks\/(\d+)\/burndown\/(\d+)\/complete$/);
    if (match && method === 'PUT') {
      const riskId = parseInt(match[1]);
      const stepId = parseInt(match[2]);
      const risk = appData.risks.find(r => r.id === riskId);
      const step = risk?.burndownSteps?.find(s => s.id === stepId);
      if (!step) throw new Error('Step not found');
      Object.assign(step, body, { isCompleted: true, completedAt: new Date().toISOString() });
      risk.likelihood = body.actualLikelihood;
      risk.impact = body.actualImpact;
      await autoSaveToTemp();
      return { risk, step };
    }

    // POST /api/risks/:riskId/burndown/:stepId/custom-fields
    match = reqPath.match(/^\/api\/risks\/(\d+)\/burndown\/(\d+)\/custom-fields$/);
    if (match && method === 'POST') {
      const riskId = parseInt(match[1]);
      const stepId = parseInt(match[2]);
      const risk = appData.risks.find(r => r.id === riskId);
      const step = risk?.burndownSteps?.find(s => s.id === stepId);
      if (!step) throw new Error('Step not found');
      if (!step.customFields) step.customFields = [];
      const newCf = { id: generateId(step.customFields), burndownStepId: stepId, ...body };
      step.customFields.push(newCf);
      await autoSaveToTemp();
      return newCf;
    }

    throw new Error('Not found');
  } catch (err) {
    return { error: err.message };
  }
});
