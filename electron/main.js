import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import crypto from 'crypto';
import os from 'os';
import AdmZip from 'adm-zip';

const ENCRYPTION_KEY = crypto.createHash('sha256').update('erm-tool-super-secret-key-2026!').digest();
const IV_LENGTH = 16;

function encryptData(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return iv.toString('hex') + ':' + authTag + ':' + encrypted;
}

function decryptData(text) {
  try {

    const parts = text.split(':');
    if (parts.length === 3) {
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encryptedText = Buffer.from(parts[2], 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }
  } catch (e) {
    // Fallback if decryption fails
  }
  // Fallback for plain unencrypted JSON files (backwards compatibility)
  return text;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let currentFilePath = null;
let workDir = null;

let appData = {
  risks: [],
  fields: [],
  snapshots: [],
  sempTables: {
    table7: [],
    table8: []
  }
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
    const jsonStr = JSON.stringify(appData, null, 2);
    const encryptedStr = encryptData(jsonStr);
    await fs.writeFile(path.join(workDir, 'data.json'), encryptedStr, 'utf-8');
  } catch (error) {
    console.error('Error auto-saving to temp:', error);
  }
};

const handleSave = async (isSaveAs = false) => {
  if (!currentFilePath || isSaveAs) {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save ERM Data',
      defaultPath: currentFilePath || 'erm-data.erm',
      filters: [
        { name: 'ERM Encrypted Files', extensions: ['erm', 'json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    if (result.canceled || !result.filePath) return false;
    currentFilePath = result.filePath;
  }
  
  try {
    await autoSaveToTemp();
    
    const zip = new AdmZip();
    zip.addLocalFolder(workDir);
    zip.writeZip(currentFilePath);
    
    mainWindow.setTitle(`ERM Tool - ${path.basename(currentFilePath)}`);
    return true;
  } catch (error) {
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
      if (isZip) {
        dataStr = await fs.readFile(path.join(workDir, 'data.json'), 'utf-8');
      } else {
        dataStr = await fs.readFile(filePath, 'utf-8');
      }
      
      const decryptedStr = decryptData(dataStr);
      const parsed = JSON.parse(decryptedStr);
      appData = {
        risks: parsed.risks || [],
        fields: parsed.fields || [],
        snapshots: parsed.snapshots || [],
        sempTables: parsed.sempTables || { table7: [], table8: [] }
      };
      
      currentFilePath = filePath;
      mainWindow.setTitle(`ERM Tool - ${currentFilePath}`);
      mainWindow.webContents.send('file-changed', appData);
      return true;
    } catch (error) {
      dialog.showErrorBox('Open Error', `Could not open file: ${error.message}`);
      return false;
    }
  }
  return false;
};

const handleNewFile = async (password = null) => {
  appData = { 
    risks: [], 
    fields: [], 
    snapshots: [],
    sempTables: { table7: [], table8: [] }
  };
  if (password) {
    appData.adminPassword = password;
  }
  currentFilePath = null;
  await initWorkDir();
  mainWindow.setTitle('ERM Tool - Untitled');
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
    title: 'ERM Tool - Untitled',
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

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers: Mini-router
ipcMain.handle('api-new-file', async (event, password) => {
  await handleNewFile(password);
  return true;
});

ipcMain.handle('api-has-password', async () => {
  return !!appData.adminPassword;
});

ipcMain.handle('api-verify-password', async (event, password) => {
  return appData.adminPassword === password;
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

ipcMain.handle('api-request', async (event, { path: reqPath, method, body }) => {
  try {

    // GET /api/sempTables
    if (reqPath === '/api/sempTables' && method === 'GET') {
      return appData.sempTables;
    }
    // PUT /api/sempTables
    if (reqPath === '/api/sempTables' && method === 'PUT') {
      appData.sempTables = body;
      await autoSaveToTemp();
      return appData.sempTables;
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
      appData.risks[idx] = { ...appData.risks[idx], ...body, updatedAt: new Date().toISOString() };
      await autoSaveToTemp();
      return appData.risks[idx];
    }
    
    // POST /api/risks/:id/custom-fields
    match = reqPath.match(/^\/api\/risks\/(\d+)\/custom-fields$/);
    if (match && method === 'POST') {
      const riskId = parseInt(match[1]);
      const risk = appData.risks.find(r => r.id === riskId);
      if (!risk) throw new Error('Risk not found');
      if (!risk.customFields) risk.customFields = [];
      const newCf = { id: generateId(risk.customFields), riskId, ...body };
      risk.customFields.push(newCf);
      await autoSaveToTemp();
      return newCf;
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
