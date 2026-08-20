import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from 'electron';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import crypto from 'crypto';
import os from 'os';
import AdmZip from 'adm-zip';
import { execFile } from 'child_process';
import util from 'util';

const execFileAsync = util.promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let currentFilePath = null;
let workDir = null;

let appData = {
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

// Generate an ID
const generateId = (array) => {
  if (!array || array.length === 0) return 1;
  return Math.max(...array.map(item => item.id)) + 1;
};

async function initWorkDir() {
  if (workDir) {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
  workDir = path.join(os.tmpdir(), `erm-tool-${crypto.randomUUID()}`);
  await fs.mkdir(path.join(workDir, 'attachments'), { recursive: true });
}

async function cleanupWorkDir() {
  if (workDir) {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
    workDir = null;
  }
}

app.on('will-quit', () => cleanupWorkDir());

const autoSaveToTemp = async () => {
  try {
    const riskData = {
      risks: appData.risks,
      fields: appData.fields,
      snapshots: appData.snapshots,
      dashboardSettings: appData.dashboardSettings,
      simulationCache: appData.simulationCache
    };
    await fs.writeFile(path.join(workDir, 'data.json'), JSON.stringify(riskData, null, 2), 'utf-8');
    await fs.writeFile(path.join(workDir, 'schedule.json'), JSON.stringify(appData.schedule || { tasks: [], dependencies: [] }, null, 2), 'utf-8');
    await fs.writeFile(path.join(workDir, 'mapping.json'), JSON.stringify(appData.mapping || [], null, 2), 'utf-8');
  } catch (error) {
    console.error('Error auto-saving to temp:', error);
  }
};

const handleSave = async (isSaveAs = false) => {
  console.log('handleSave called! isSaveAs:', isSaveAs, 'currentFilePath:', currentFilePath);
  if (!currentFilePath || isSaveAs) {
    console.log('Prompting save dialog...');
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save ERM Data',
      defaultPath: currentFilePath || 'erm-data.erm',
      filters: [
        { name: 'ERM Encrypted Files', extensions: ['erm', 'json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    console.log('Save dialog result:', result);
    if (result.canceled || !result.filePath) return false;
    currentFilePath = result.filePath;
  }
  
  try {
    console.log('Auto saving to temp...', workDir);
    await autoSaveToTemp();
    
    console.log('Creating zip at:', currentFilePath);
    const zip = new AdmZip();
    zip.addLocalFolder(workDir);
    zip.writeZip(currentFilePath);
    console.log('Zip write complete');
    
    mainWindow.setTitle(`Risk Tool - ${path.basename(currentFilePath)}`);
    return true;
  } catch (error) {
    console.error('Save error thrown:', error);
    dialog.showErrorBox('Save Error', `Could not save file: ${error.message}`);
    return false;
  }
};

const handleOpenFile = async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open ERM Data',
    filters: [
      { name: 'ERM Data Files', extensions: ['erm', 'json'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });
  if (!result.canceled && result.filePaths.length > 0) {
    try {

      const filePath = result.filePaths[0];
      await initWorkDir();
      
      let isZip = false;
      try {

        const zip = new AdmZip(filePath);
        zip.extractAllTo(workDir, true);
        isZip = true;
      } catch (e) {
        isZip = false;
      }
      
      let dataStr;
      let scheduleStr = '{"tasks":[],"dependencies":[]}';
      let mappingStr = '[]';

      if (isZip) {
        dataStr = await fs.readFile(path.join(workDir, 'data.json'), 'utf-8');
        try { scheduleStr = await fs.readFile(path.join(workDir, 'schedule.json'), 'utf-8'); } catch (e) {}
        try { mappingStr = await fs.readFile(path.join(workDir, 'mapping.json'), 'utf-8'); } catch (e) {}
      } else {
        dataStr = await fs.readFile(filePath, 'utf-8');
      }
      
      const parsed = JSON.parse(dataStr);
      appData = {
        risks: parsed.risks || [],
        fields: parsed.fields || [],
        snapshots: parsed.snapshots || [],
        dashboardSettings: parsed.dashboardSettings || { hiddenFields: [] },
        simulationCache: parsed.simulationCache || null,
        schedule: JSON.parse(scheduleStr),
        mapping: JSON.parse(mappingStr)
      };
      if (!appData.dashboardSettings.picklists) {
        appData.dashboardSettings.picklists = {
          level: { options: ['Program', 'Internal'], isMultiSelect: false },
          riskCategory: { options: ['Schedule', 'Cost', 'Technical'], isMultiSelect: true },
          handlingStrategy: { options: ['Accept', 'Decline', 'Transfer', 'Mitigate/Execute'], isMultiSelect: false }
        };
      }
      
      currentFilePath = filePath;
      mainWindow.setTitle(`Risk Tool - ${currentFilePath}`);
      mainWindow.webContents.send('file-changed', appData);
      return true;
    } catch (error) {
      dialog.showErrorBox('Open Error', `Could not open file: ${error.message}`);
      return false;
    }
  }
  return false;
};

const handleNewFile = async () => {
  appData = { 
    risks: [], 
    fields: [], 
    snapshots: [],
    simulationCache: null,
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
  currentFilePath = null;
  await initWorkDir();
  mainWindow.setTitle('Risk Tool - Untitled');
  mainWindow.webContents.send('file-changed', appData);
};

const createMenu = () => {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: () => handleNewFile()
        },
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: () => handleOpenFile()
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => handleSave()
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => handleSave(true)
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Risk Tool - Untitled',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  if (app.isPackaged) {
    // In production, load the built Vite app
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    // In development, load the Vite dev server
    mainWindow.loadURL('http://localhost:5173');
  }
};

app.whenReady().then(async () => {
  await initWorkDir();
  createMenu();
  createWindow();

  // Setup Auto-Updater
  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: `A new version (${info.version}) is available. Downloading now...`
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    dialog.showMessageBox({
      type: 'question',
      buttons: ['Restart and Install', 'Later'],
      title: 'Update Ready',
      message: `Version ${info.version} has been downloaded. Restart the application to apply the updates.`
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall(false, true);
      }
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('Error in auto-updater:', err);
  });

  autoUpdater.checkForUpdatesAndNotify();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers: Mini-router
ipcMain.handle('api-new-file', async () => {
  await handleNewFile();
  return true;
});

ipcMain.handle('api-save', async () => {
  return await handleSave();
});

ipcMain.handle('api-save-as', async () => {
  return await handleSave(true);
});

ipcMain.handle('api-open-file', async () => {
  return await handleOpenFile();
});

ipcMain.handle('api-add-attachment', async (event, riskId) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Attachment',
    properties: ['openFile']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  
  const sourcePath = result.filePaths[0];
  const originalName = path.basename(sourcePath);
  const uniqueName = crypto.randomUUID() + '-' + originalName;
  const destPath = path.join(workDir, 'attachments', uniqueName);
  
  await fs.copyFile(sourcePath, destPath);
  
  const risk = appData.risks.find(r => r.id === riskId);
  if (!risk) throw new Error('Risk not found');
  if (!risk.attachments) risk.attachments = [];
  
  const newAttachment = {
    id: generateId(risk.attachments),
    name: originalName,
    filename: uniqueName,
    createdAt: new Date().toISOString()
  };
  risk.attachments.push(newAttachment);
  
  await autoSaveToTemp();
  return newAttachment;
});

ipcMain.handle('api-open-attachment', async (event, filename) => {
  const attachmentPath = path.join(workDir, 'attachments', filename);
  await shell.openPath(attachmentPath);
});

ipcMain.handle('api-delete-attachment', async (event, riskId, attachmentId) => {
  const risk = appData.risks.find(r => r.id === riskId);
  if (!risk || !risk.attachments) throw new Error('Risk or attachments not found');
  
  const attIndex = risk.attachments.findIndex(a => a.id === attachmentId);
  if (attIndex === -1) throw new Error('Attachment not found');
  
  const attachment = risk.attachments[attIndex];
  risk.attachments.splice(attIndex, 1);
  
  const destPath = path.join(workDir, 'attachments', attachment.filename);
  await fs.unlink(destPath).catch(() => {}); // Ignore if file already gone
  
  await autoSaveToTemp();
  return { success: true };
});

ipcMain.handle('api-import-mpp', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import MS Project File',
    filters: [
      { name: 'Microsoft Project', extensions: ['mpp'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });
  
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  
  const scriptsDir = path.join(__dirname, '..', 'scripts');
  
  try {
    const brewJava = '/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home/bin/java';
    // Fallback to global 'java' if brew java doesn't exist
    let javaExec = 'java';
    try {
      await fs.stat(brewJava);
      javaExec = brewJava;
    } catch (e) {
      // Ignored, fallback to 'java'
    }
    
    // Classpath must include the lib folder jars and the scripts dir
    const classPath = path.join(scriptsDir, 'lib', '*') + path.delimiter + scriptsDir;
    
    const { stdout } = await execFileAsync(javaExec, ['-cp', classPath, 'ParseMPP', filePath], { maxBuffer: 1024 * 1024 * 50 }); // 50MB buffer
    const jsonStartIndex = stdout.indexOf('{');
    if (jsonStartIndex === -1) {
      throw new Error("No JSON found in java output: " + stdout);
    }
    const jsonStr = stdout.substring(jsonStartIndex);
    const parsedData = JSON.parse(jsonStr);
    
    if (parsedData.error) {
      throw new Error(parsedData.error);
    }
    
    appData.schedule = parsedData;
    await autoSaveToTemp();
    
    return appData.schedule;
  } catch (error) {
    console.error('MPP Parse Error:', error);
    let errorMsg = error.message;
    if (error.stdout && error.stdout.includes('{')) {
      try {
        const jsonStr = error.stdout.substring(error.stdout.indexOf('{'));
        const parsed = JSON.parse(jsonStr);
        if (parsed.error) errorMsg = parsed.error;
      } catch (e) {
        // ignore
      }
    }
    dialog.showErrorBox('Import Error', `Could not parse .mpp file: ${errorMsg}`);
    throw error;
  }
});

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
      if (!appData.dashboardSettings.probabilityMapping) {
        appData.dashboardSettings.probabilityMapping = { 
          1: { min: 1, max: 20 }, 
          2: { min: 21, max: 40 }, 
          3: { min: 41, max: 60 }, 
          4: { min: 61, max: 80 }, 
          5: { min: 81, max: 99 } 
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
      return newSnapshot;
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

    // DELETE /api/risks/:id
    match = reqPath.match(/^\/api\/risks\/(\d+)$/);
    if (match && method === 'DELETE') {
      const id = parseInt(match[1]);
      const idx = appData.risks.findIndex(r => r.id === id);
      if (idx === -1) throw new Error('Risk not found');
      appData.risks.splice(idx, 1);
      await autoSaveToTemp();
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
      appData.fields.push(newField);
      await autoSaveToTemp();
      return newField;
    }
    // DELETE /api/fields/:id
    match = reqPath.match(/^\/api\/fields\/(\d+)$/);
    if (match && method === 'DELETE') {
      const id = parseInt(match[1]);
      appData.fields = appData.fields.filter(f => f.id !== id);
      await autoSaveToTemp();
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
