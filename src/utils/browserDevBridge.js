import JSZip from 'jszip';
import { sampleDevData } from './sampleDevData';

// Only install the dev bridge in a browser environment if window.electron is not provided
if (typeof window !== 'undefined' && (!window.electron || !window.electron.ipcRenderer)) {
  const STORAGE_KEY = 'erm_browser_dev_app_data';
  let currentFileHandle = null;
  let currentFileName = null;

  const loadData = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to read from localStorage:', e);
    }
    const clone = JSON.parse(JSON.stringify(sampleDevData));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clone));
    return clone;
  };

  let appData = loadData();

  const saveData = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  };

  const generateId = (array) => {
    if (!array || array.length === 0) return 1;
    return Math.max(...array.map(item => item.id || 0)) + 1;
  };

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

  const listeners = {};

  const emit = (channel, ...args) => {
    if (listeners[channel]) {
      listeners[channel].forEach(fn => fn(...args));
    }
  };

  const generateWorkspaceZipBlob = async () => {
    const zip = new JSZip();
    const configData = {
      dashboardSettings: appData.dashboardSettings || { hiddenFields: [] },
      briefingConfig: appData.briefingConfig || { selectedItems: [], layout: [] }
    };
    const adminData = {
      fields: appData.fields || [],
      snapshots: appData.snapshots || []
    };
    zip.file('Config.json', JSON.stringify(configData, null, 2));
    zip.file('Admin.json', JSON.stringify(adminData, null, 2));
    zip.file('RIO.json', JSON.stringify(appData.risks || [], null, 2));
    zip.file('Schedule.json', JSON.stringify(appData.schedule || { tasks: [], dependencies: [] }, null, 2));
    zip.file('RIO-Schedule.json', JSON.stringify(appData.mapping || [], null, 2));
    zip.file('Monte-Carlo.json', JSON.stringify(appData.simulationCache || null, null, 2));
    // Since browserDevBridge doesn't actually store attachments to a real FS, we just create the folder if we had to.
    zip.folder('attachment');
    return await zip.generateAsync({ type: 'blob' });
  };

  const handleBrowserSaveAs = async () => {
    const defaultName = currentFileName || `erm-data-${new Date().toISOString().substring(0, 10)}.erm`;
    const zipBlob = await generateWorkspaceZipBlob();

    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: defaultName,
          types: [
            {
              description: 'ERM Workspace File (.erm)',
              accept: { 'application/octet-stream': ['.erm'] }
            },
            {
              description: 'JSON Workspace File (.json)',
              accept: { 'application/json': ['.json'] }
            }
          ]
        });
        const writable = await handle.createWritable();
        if (handle.name.endsWith('.json')) {
          const jsonBundle = {
            risks: appData.risks || [],
            fields: appData.fields || [],
            snapshots: appData.snapshots || [],
            dashboardSettings: appData.dashboardSettings || { hiddenFields: [] },
            simulationCache: appData.simulationCache || null,
            schedule: appData.schedule || { tasks: [], dependencies: [] },
            mapping: appData.mapping || [],
            briefingConfig: appData.briefingConfig || { selectedItems: [], layout: [] }
          };
          await writable.write(JSON.stringify(jsonBundle, null, 2));
        } else {
          await writable.write(zipBlob);
        }
        await writable.close();
        currentFileHandle = handle;
        currentFileName = handle.name;
        document.title = `Risk Tool - ${handle.name}`;
        saveData();
        return true;
      } catch (err) {
        if (err.name === 'AbortError') {
          return false;
        }
        console.warn('showSaveFilePicker failed, falling back to download:', err);
      }
    }

    const filename = window.prompt('Enter file name to save workspace as:', defaultName);
    if (!filename) return false;
    
    let downloadBlob = zipBlob;
    if (filename.endsWith('.json')) {
      const jsonBundle = {
        risks: appData.risks || [],
        fields: appData.fields || [],
        snapshots: appData.snapshots || [],
        dashboardSettings: appData.dashboardSettings || { hiddenFields: [] },
        simulationCache: appData.simulationCache || null,
        schedule: appData.schedule || { tasks: [], dependencies: [] },
        mapping: appData.mapping || [],
        briefingConfig: appData.briefingConfig || { selectedItems: [], layout: [] }
      };
      downloadBlob = new Blob([JSON.stringify(jsonBundle, null, 2)], { type: 'application/json' });
    }
    
    const url = URL.createObjectURL(downloadBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    currentFileName = filename;
    document.title = `Risk Tool - ${filename}`;
    saveData();
    return true;
  };

  const handleBrowserSave = async () => {
    if (currentFileHandle) {
      try {
        const writable = await currentFileHandle.createWritable();
        if (currentFileHandle.name.endsWith('.json')) {
          const jsonBundle = {
            risks: appData.risks || [],
            fields: appData.fields || [],
            snapshots: appData.snapshots || [],
            dashboardSettings: appData.dashboardSettings || { hiddenFields: [] },
            simulationCache: appData.simulationCache || null,
            schedule: appData.schedule || { tasks: [], dependencies: [] },
            mapping: appData.mapping || [],
            briefingConfig: appData.briefingConfig || { selectedItems: [], layout: [] }
          };
          await writable.write(JSON.stringify(jsonBundle, null, 2));
        } else {
          const zipBlob = await generateWorkspaceZipBlob();
          await writable.write(zipBlob);
        }
        await writable.close();
        saveData();
        return true;
      } catch (err) {
        console.warn('Direct write failed, falling back to Save As:', err);
      }
    }
    return await handleBrowserSaveAs();
  };

  const loadWorkspaceFromFile = async (file) => {
    try {
      let parsed = null;
      let schedule = { tasks: [], dependencies: [] };
      let mapping = [];
      let briefingConfig = { selectedItems: [], layout: [] };
      let configData = {};
      let adminData = {};
      let rioData = [];
      let mcData = null;

      try {
        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(file);
        
        // Handle newer format first
        if (loadedZip.file('Config.json')) {
          configData = JSON.parse(await loadedZip.file('Config.json').async('string'));
        }
        if (loadedZip.file('Admin.json')) {
          adminData = JSON.parse(await loadedZip.file('Admin.json').async('string'));
        }
        if (loadedZip.file('RIO.json')) {
          rioData = JSON.parse(await loadedZip.file('RIO.json').async('string'));
        }
        if (loadedZip.file('Schedule.json')) {
          schedule = JSON.parse(await loadedZip.file('Schedule.json').async('string'));
        }
        if (loadedZip.file('RIO-Schedule.json')) {
          mapping = JSON.parse(await loadedZip.file('RIO-Schedule.json').async('string'));
        }
        if (loadedZip.file('Monte-Carlo.json')) {
          mcData = JSON.parse(await loadedZip.file('Monte-Carlo.json').async('string'));
        }

        // Handle legacy zip format fallbacks
        if (loadedZip.file('data.json') && !loadedZip.file('Config.json')) {
          const dataStr = await loadedZip.file('data.json').async('string');
          parsed = JSON.parse(dataStr);
        }
        if (loadedZip.file('schedule.json') && !loadedZip.file('Schedule.json')) {
          schedule = JSON.parse(await loadedZip.file('schedule.json').async('string'));
        }
        if (loadedZip.file('mapping.json') && !loadedZip.file('RIO-Schedule.json')) {
          mapping = JSON.parse(await loadedZip.file('mapping.json').async('string'));
        }
        if (loadedZip.file('briefingConfig.json') && !loadedZip.file('Config.json')) {
          briefingConfig = JSON.parse(await loadedZip.file('briefingConfig.json').async('string'));
        }

      } catch (e) {
        // Not a zip, assume it's a pure JSON file
        const text = await file.text();
        parsed = JSON.parse(text);
        if (parsed.schedule) schedule = parsed.schedule;
        if (parsed.mapping) mapping = parsed.mapping;
        if (parsed.briefingConfig) briefingConfig = parsed.briefingConfig;
      }

      if (parsed) {
        // Migration from legacy single json bundle
        appData = {
          risks: parsed.risks || [],
          fields: parsed.fields || [],
          snapshots: parsed.snapshots || [],
          dashboardSettings: parsed.dashboardSettings || { hiddenFields: [] },
          simulationCache: parsed.simulationCache || null,
          schedule,
          mapping,
          briefingConfig
        };
      } else {
        // New structure loaded from zip
        appData = {
          dashboardSettings: configData.dashboardSettings || { hiddenFields: [] },
          briefingConfig: configData.briefingConfig || { selectedItems: [], layout: [] },
          fields: adminData.fields || [],
          snapshots: adminData.snapshots || [],
          risks: rioData || [],
          schedule: schedule || { tasks: [], dependencies: [] },
          mapping: mapping || [],
          simulationCache: mcData || null
        };
      }

      if (!appData.dashboardSettings.picklists) {
        appData.dashboardSettings.picklists = {
          level: { options: ['Program', 'Internal'], isMultiSelect: false },
          riskCategory: { options: ['Schedule', 'Cost', 'Technical'], isMultiSelect: true },
          handlingStrategy: { options: ['Accept', 'Decline', 'Transfer', 'Mitigate/Execute'], isMultiSelect: false }
        };
      }

      currentFileName = file.name;
      document.title = `Risk Tool - ${file.name}`;
      saveData();
      emit('file-changed', appData);
      return true;
    } catch (err) {
      console.error('Failed to open workspace file:', err);
      alert(`Could not open file: ${err.message}`);
      return false;
    }
  };

  const handleBrowserOpenFile = async () => {
    if (window.showOpenFilePicker) {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [
            {
              description: 'ERM Workspace Files (.erm, .json)',
              accept: {
                'application/octet-stream': ['.erm'],
                'application/json': ['.json']
              }
            }
          ],
          multiple: false
        });
        const file = await handle.getFile();
        currentFileHandle = handle;
        return await loadWorkspaceFromFile(file);
      } catch (err) {
        if (err.name === 'AbortError') return false;
        console.warn('showOpenFilePicker failed, falling back to input:', err);
      }
    }

    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.erm,.json';
      input.onchange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return resolve(false);
        const success = await loadWorkspaceFromFile(file);
        resolve(success);
      };
      input.click();
    });
  };

  const handleBrowserImportMpp = async () => {
    const parseMppFile = async (file) => {
      try {
        if (file.name.endsWith('.json')) {
          const text = await file.text();
          const parsed = JSON.parse(text);
          appData.schedule = parsed.schedule || parsed;
          saveData();
          emit('file-changed', appData);
          return appData.schedule;
        }

        const arrayBuf = await file.arrayBuffer();
        const res = await fetch('/api/parse-mpp', {
          method: 'POST',
          body: arrayBuf
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server error ${res.status}`);
        }

        const parsedData = await res.json();
        if (parsedData.error) {
          throw new Error(parsedData.error);
        }

        appData.schedule = parsedData;
        saveData();
        emit('file-changed', appData);
        return appData.schedule;
      } catch (err) {
        console.error('Failed to import MPP file:', err);
        alert(`Failed to import MS Project file: ${err.message}`);
        return null;
      }
    };

    if (window.showOpenFilePicker) {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [
            {
              description: 'MS Project / Schedule Files (.mpp, .xml, .json)',
              accept: {
                'application/vnd.ms-project': ['.mpp'],
                'application/octet-stream': ['.mpp'],
                'application/xml': ['.xml'],
                'application/json': ['.json']
              }
            }
          ],
          multiple: false
        });
        const file = await handle.getFile();
        return await parseMppFile(file);
      } catch (err) {
        if (err.name === 'AbortError') return null;
        console.warn('showOpenFilePicker failed, falling back to input:', err);
      }
    }

    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.mpp,.xml,.mpx,.json';
      input.onchange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return resolve(null);
        const result = await parseMppFile(file);
        resolve(result);
      };
      input.click();
    });
  };

  const handleApiRequest = async ({ path: reqPath, method = 'GET', body }) => {
    if (reqPath === '/api/system-info' && method === 'GET') {
      return {
        username: 'Browser User (Mock)',
        lastSync: Date.now(),
        lastArchive: Date.now() - 3600000
      };
    }
    if (reqPath === '/api/dashboardSettings' && method === 'GET') {
      if (!appData.dashboardSettings) appData.dashboardSettings = { hiddenFields: [] };
      if (!appData.dashboardSettings.picklists) {
        appData.dashboardSettings.picklists = {
          level: { options: ['Program', 'Internal'], isMultiSelect: false },
          riskCategory: { options: ['Schedule', 'Cost', 'Technical'], isMultiSelect: true },
          handlingStrategy: { options: ['Accept', 'Decline', 'Transfer', 'Mitigate/Execute'], isMultiSelect: false }
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
      if (!appData.dashboardSettings.calendar) {
        appData.dashboardSettings.calendar = {
          workingDays: [1, 2, 3, 4, 5],
          holidays: []
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

    if (reqPath === '/api/dashboardSettings' && method === 'PUT') {
      appData.dashboardSettings = { ...appData.dashboardSettings, ...body };
      saveData();
      return appData.dashboardSettings;
    }

    if (reqPath === '/api/schedule' && method === 'GET') {
      return appData.schedule || { tasks: [], dependencies: [] };
    }

    if (reqPath === '/api/schedule' && method === 'PUT') {
      appData.schedule = body;
      saveData();
      return appData.schedule;
    }

    if (reqPath === '/api/mapping' && method === 'GET') {
      return appData.mapping || [];
    }

    if (reqPath === '/api/mapping' && method === 'PUT') {
      appData.mapping = body;
      saveData();
      return appData.mapping;
    }

    if (reqPath === '/api/simulationCache' && method === 'GET') {
      return appData.simulationCache || null;
    }

    if (reqPath === '/api/simulationCache' && method === 'PUT') {
      appData.simulationCache = body;
      saveData();
      return appData.simulationCache;
    }

    if (reqPath === '/api/briefingConfig' && method === 'GET') {
      return appData.briefingConfig || { selectedItems: [], layout: [] };
    }

    if (reqPath === '/api/briefingConfig' && method === 'PUT') {
      appData.briefingConfig = body;
      saveData();
      return appData.briefingConfig;
    }

    if (reqPath === '/api/snapshots' && method === 'GET') {
      return appData.snapshots || [];
    }

    if (reqPath === '/api/snapshots' && method === 'POST') {
      const newSnapshot = {
        id: generateId(appData.snapshots),
        note: body.note || 'Manual Snapshot',
        date: new Date().toISOString(),
        risks: JSON.parse(JSON.stringify(appData.risks))
      };
      if (!appData.snapshots) appData.snapshots = [];
      appData.snapshots.push(newSnapshot);
      saveData();
      return newSnapshot;
    }

    if (reqPath === '/api/risks' && method === 'GET') {
      return appData.risks || [];
    }

    if (reqPath === '/api/risks' && method === 'POST') {
      if (body.userRiskId) {
        body.userRiskId = formatRiskId(body.userRiskId, body.itemType);
      }
      if (body.userRiskId && (appData.risks || []).some(r => r.userRiskId === body.userRiskId)) {
        throw new Error('An item with this ID already exists. Please choose a unique ID.');
      }
      const newRisk = {
        id: generateId(appData.risks),
        title: body.title || 'New Item',
        itemType: body.itemType || 'Risk',
        userRiskId: body.userRiskId || `R-${generateId(appData.risks)}`,
        likelihood: body.likelihood || 1,
        impact: body.impact || 1,
        level: body.level || 'Program',
        riskCategory: body.riskCategory || 'Schedule',
        handlingStrategy: body.handlingStrategy || 'Accept',
        gpocs: body.gpocs || '',
        cpocs: body.cpocs || '',
        description: body.description || '',
        closureCriteria: body.closureCriteria || '',
        discoveredDate: body.discoveredDate || '',
        approvedDate: body.approvedDate || '',
        closedDate: body.closedDate || '',
        impactStatement: body.impactStatement || '',
        impactCost: body.impactCost || '',
        impactSchedule: body.impactSchedule || '',
        impactPerformance: body.impactPerformance || '',
        isSpof: !!body.isSpof,
        spofDescription: body.spofDescription || '',
        resourceCostNeeded: body.resourceCostNeeded || '',
        resourceScheduleNeeded: body.resourceScheduleNeeded || '',
        planRealism: body.planRealism || '',
        mitigationPlan: body.mitigationPlan || '',
        monteCarloImpactCost: body.monteCarloImpactCost || { min: 0, mostLikely: 0, max: 0 },
        monteCarloImpactSchedule: body.monteCarloImpactSchedule || { min: 0, mostLikely: 0, max: 0 },
        includeInMonteCarlo: body.includeInMonteCarlo !== false,
        burndownSteps: [],
        statusLogs: [],
        attachments: [],
        customFields: body.customFields || []
      };
      appData.risks.push(newRisk);
      saveData();
      return newRisk;
    }

    let match = reqPath.match(/^\/api\/risks\/(\d+)$/);
    if (match && method === 'GET') {
      const id = parseInt(match[1]);
      const risk = (appData.risks || []).find(r => r.id === id);
      if (!risk) throw new Error('Risk not found');
      return risk;
    }

    match = reqPath.match(/^\/api\/risks\/(\d+)$/);
    if (match && method === 'PUT') {
      const id = parseInt(match[1]);
      const idx = (appData.risks || []).findIndex(r => r.id === id);
      if (idx === -1) throw new Error('Risk not found');
      if (body.userRiskId) {
        body.userRiskId = formatRiskId(body.userRiskId, body.itemType || appData.risks[idx].itemType);
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
      const cleanBody = { ...body };
      delete cleanBody._isRestore;
      delete cleanBody.restoredDate;

      appData.risks[idx] = { ...appData.risks[idx], ...cleanBody, snapshots: oldRisk.snapshots, updatedAt: new Date().toISOString() };
      saveData();
      return appData.risks[idx];
    }

    match = reqPath.match(/^\/api\/risks\/(\d+)\/snapshots$/);
    if (match && method === 'POST') {
      const id = parseInt(match[1]);
      const risk = (appData.risks || []).find(r => r.id === id);
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
      saveData();
      return risk;
    }

    match = reqPath.match(/^\/api\/risks\/(\d+)\/snapshots$/);
    if (match && method === 'GET') {
      const id = parseInt(match[1]);
      const risk = (appData.risks || []).find(r => r.id === id);
      if (!risk) throw new Error('Risk not found');
      return risk.snapshots || [];
    }

    match = reqPath.match(/^\/api\/risks\/(\d+)$/);
    if (match && method === 'DELETE') {
      const id = parseInt(match[1]);
      appData.risks = (appData.risks || []).filter(r => r.id !== id);
      saveData();
      return { success: true };
    }

    if (reqPath === '/api/fields' && method === 'GET') {
      return appData.fields || [];
    }

    if (reqPath === '/api/fields/risk' && method === 'GET') {
      return (appData.fields || []).filter(f => f.entityType === 'risk');
    }

    if (reqPath === '/api/fields/burndown' && method === 'GET') {
      return (appData.fields || []).filter(f => f.entityType === 'burndown');
    }

    if (reqPath === '/api/fields' && method === 'POST') {
      const newField = {
        id: generateId(appData.fields),
        name: body.name,
        fieldType: body.fieldType || 'text',
        entityType: body.entityType || 'risk',
        required: !!body.required
      };
      if (!appData.fields) appData.fields = [];
      appData.fields.push(newField);
      saveData();
      return newField;
    }

    match = reqPath.match(/^\/api\/fields\/(\d+)$/);
    if (match && method === 'DELETE') {
      const id = parseInt(match[1]);
      appData.fields = (appData.fields || []).filter(f => f.id !== id);
      saveData();
      return { success: true };
    }

    match = reqPath.match(/^\/api\/risks\/(\d+)\/status-logs$/);
    if (match && method === 'POST') {
      const id = parseInt(match[1]);
      const risk = (appData.risks || []).find(r => r.id === id);
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
      saveData();
      return newLog;
    }

    match = reqPath.match(/^\/api\/risks\/(\d+)\/burndown$/);
    if (match && method === 'POST') {
      const id = parseInt(match[1]);
      const risk = (appData.risks || []).find(r => r.id === id);
      if (!risk) throw new Error('Risk not found');
      if (!risk.burndownSteps) risk.burndownSteps = [];
      const newStep = {
        id: generateId(risk.burndownSteps),
        description: body.description,
        targetDate: body.targetDate,
        assignees: body.assignees,
        likelihoodReduction: body.likelihoodReduction || 0,
        impactReduction: body.impactReduction || 0,
        achievability: body.achievability || '',
        resourcesNeeded: body.resourcesNeeded || '',
        impactOnConsequence: body.impactOnConsequence || '',
        customFields: body.customFields || [],
        isCompleted: false
      };
      risk.burndownSteps.push(newStep);
      saveData();
      return newStep;
    }

    match = reqPath.match(/^\/api\/risks\/(\d+)\/burndown\/(\d+)$/);
    if (match && method === 'PUT') {
      const riskId = parseInt(match[1]);
      const stepId = parseInt(match[2]);
      const risk = (appData.risks || []).find(r => r.id === riskId);
      const step = risk?.burndownSteps?.find(s => s.id === stepId);
      if (!step) throw new Error('Step not found');
      Object.assign(step, body);
      saveData();
      return step;
    }

    match = reqPath.match(/^\/api\/risks\/(\d+)\/burndown\/(\d+)$/);
    if (match && method === 'DELETE') {
      const riskId = parseInt(match[1]);
      const stepId = parseInt(match[2]);
      const risk = (appData.risks || []).find(r => r.id === riskId);
      if (risk && risk.burndownSteps) {
        risk.burndownSteps = risk.burndownSteps.filter(s => s.id !== stepId);
        saveData();
      }
      return { success: true };
    }

    match = reqPath.match(/^\/api\/risks\/(\d+)\/burndown\/(\d+)\/complete$/);
    if (match && method === 'PUT') {
      const riskId = parseInt(match[1]);
      const stepId = parseInt(match[2]);
      const risk = (appData.risks || []).find(r => r.id === riskId);
      const step = risk?.burndownSteps?.find(s => s.id === stepId);
      if (!step) throw new Error('Step not found');
      Object.assign(step, body, { isCompleted: true, completedAt: new Date().toISOString() });
      risk.likelihood = body.actualLikelihood;
      risk.impact = body.actualImpact;
      saveData();
      return { risk, step };
    }

    match = reqPath.match(/^\/api\/risks\/(\d+)\/custom-fields$/);
    if (match && method === 'POST') {
      const riskId = parseInt(match[1]);
      const risk = (appData.risks || []).find(r => r.id === riskId);
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
      saveData();
      return { customFields: risk.customFields };
    }

    match = reqPath.match(/^\/api\/risks\/(\d+)\/burndown\/(\d+)\/custom-fields$/);
    if (match && method === 'POST') {
      const riskId = parseInt(match[1]);
      const stepId = parseInt(match[2]);
      const risk = (appData.risks || []).find(r => r.id === riskId);
      const step = risk?.burndownSteps?.find(s => s.id === stepId);
      if (!step) throw new Error('Step not found');
      if (!step.customFields) step.customFields = [];
      const newCf = { id: generateId(step.customFields), burndownStepId: stepId, ...body };
      step.customFields.push(newCf);
      saveData();
      return newCf;
    }

    throw new Error(`Endpoint ${reqPath} (${method}) not found`);
  };

  window.electron = {
    ipcRenderer: {
      invoke: async (channel, ...args) => {
        try {
          if (channel === 'api-request') {
            return await handleApiRequest(args[0]);
          }
          if (channel === 'api-new-file') {
            appData = {
              risks: [],
              fields: [],
              snapshots: [],
              dashboardSettings: {
                hiddenFields: [],
                picklists: {
                  level: { options: ['Program', 'Internal'], isMultiSelect: false },
                  riskCategory: { options: ['Schedule', 'Cost', 'Technical'], isMultiSelect: true },
                  handlingStrategy: { options: ['Accept', 'Decline', 'Transfer', 'Mitigate/Execute'], isMultiSelect: false }
                }
              },
              schedule: { tasks: [], dependencies: [] },
              mapping: []
            };
            currentFileHandle = null;
            currentFileName = null;
            document.title = 'Risk Tool - Untitled';
            saveData();
            emit('file-changed', appData);
            return true;
          }
          if (channel === 'api-open-file') {
            return await handleBrowserOpenFile();
          }
          if (channel === 'api-save') {
            return await handleBrowserSave();
          }
          if (channel === 'api-save-as') {
            return await handleBrowserSaveAs();
          }
          if (channel === 'api-import-mpp') {
            return await handleBrowserImportMpp();
          }
          if (channel === 'api-add-attachment') {
            return { filename: 'sample-attachment.pdf', originalName: 'sample-attachment.pdf', uploadedAt: new Date().toISOString() };
          }
          if (channel === 'api-open-attachment' || channel === 'api-delete-attachment') {
            return { success: true };
          }
          return null;
        } catch (err) {
          return { error: err.message };
        }
      },
      on: (channel, listener) => {
        if (!listeners[channel]) listeners[channel] = [];
        listeners[channel].push(listener);
      },
      removeAllListeners: (channel) => {
        if (channel) {
          delete listeners[channel];
        } else {
          Object.keys(listeners).forEach(k => delete listeners[k]);
        }
      },
      removeListener: (channel, listener) => {
        if (listeners[channel]) {
          listeners[channel] = listeners[channel].filter(l => l !== listener);
        }
      }
    }
  };

  console.log('[Dev Bridge] Browser dev bridge initialized with full file saving/loading capabilities.');
}
