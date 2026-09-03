import re

with open('scratch/main.js', 'r') as f:
    content = f.read()

# Add Automerge import and getUsername
imports = """const { exec } = require('child_process');
const Automerge = require('@automerge/automerge');
const crypto = require('crypto');

const getUsername = () => {
  try { return os.userInfo().username || 'Unknown User'; }
  catch (e) { return 'Unknown User'; }
};

const updateData = (msg, callback) => {
  appData = Automerge.change(appData, `${getUsername()}: ${msg}`, callback);
};
"""
content = content.replace("const { exec } = require('child_process');", imports)

# Replace appData init
init_old = """let appData = {
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
  simulationCache: null,
  schedule: { tasks: [], dependencies: [] },
  mapping: [],
  briefingConfig: { selectedItems: [], layout: [] }
};"""

init_new = """let appData = Automerge.from({
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
  simulationCache: null,
  schedule: { tasks: [], dependencies: [] },
  mapping: [],
  briefingConfig: { selectedItems: [], layout: [] },
  _attachments: {}
});"""
content = content.replace(init_old, init_new)

# Replace autoSaveToTemp
autosave_old = """const autoSaveToTemp = async () => {
  try {
    const configData = {
      dashboardSettings: appData.dashboardSettings,
      briefingConfig: appData.briefingConfig || { selectedItems: [], layout: [] }
    };
    const adminData = {
      fields: appData.fields,
      snapshots: appData.snapshots
    };
    await fs.writeFile(path.join(workDir, 'Config.json'), JSON.stringify(configData, null, 2), 'utf-8');
    await fs.writeFile(path.join(workDir, 'Admin.json'), JSON.stringify(adminData, null, 2), 'utf-8');
    await fs.writeFile(path.join(workDir, 'RIO.json'), JSON.stringify(appData.risks || [], null, 2), 'utf-8');
    await fs.writeFile(path.join(workDir, 'Schedule.json'), JSON.stringify(appData.schedule || { tasks: [], dependencies: [] }, null, 2), 'utf-8');
    await fs.writeFile(path.join(workDir, 'RIO-Schedule.json'), JSON.stringify(appData.mapping || [], null, 2), 'utf-8');
    await fs.writeFile(path.join(workDir, 'Monte-Carlo.json'), JSON.stringify(appData.simulationCache || null, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error auto-saving to temp:', error);
  }
};"""

autosave_new = """const autoSaveToTemp = async () => {
  try {
    const binary = Automerge.save(appData);
    await fs.writeFile(path.join(workDir, 'temp.am'), binary);
  } catch (error) {
    console.error('Error auto-saving to temp:', error);
  }
};"""
content = content.replace(autosave_old, autosave_new)

with open('scratch/main.js', 'w') as f:
    f.write(content)
