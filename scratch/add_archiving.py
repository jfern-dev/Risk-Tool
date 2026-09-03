import re

with open('electron/main.js', 'r') as f:
    text = f.read()

# 1. Add autoArchive function and variables just below autoSaveToTemp
auto_save_pattern = """const autoSaveToTemp = async () => {
  try {
    const binary = Automerge.save(appData);
    await fs.writeFile(path.join(workDir, 'temp.am'), binary);
  } catch (error) {
    console.error('Error auto-saving to temp:', error);
  }
};"""

auto_archive_code = """const autoSaveToTemp = async () => {
  try {
    const binary = Automerge.save(appData);
    await fs.writeFile(path.join(workDir, 'temp.am'), binary);
  } catch (error) {
    console.error('Error auto-saving to temp:', error);
  }
};

let lastArchiveTime = 0;
let hasCheckedDiskForArchives = false;

const autoArchive = async () => {
  if (!currentFilePath) return;

  const archiveDir = path.join(path.dirname(currentFilePath), 'archives');
  
  if (!hasCheckedDiskForArchives) {
    try {
      await fs.mkdir(archiveDir, { recursive: true });
      const files = await fs.readdir(archiveDir);
      for (const file of files) {
        if (!file.endsWith('.zip')) continue;
        const stats = await fs.stat(path.join(archiveDir, file));
        if (stats.mtimeMs > lastArchiveTime) {
          lastArchiveTime = stats.mtimeMs;
        }
      }
    } catch (e) {}
    hasCheckedDiskForArchives = true;
  }

  const now = Date.now();
  if (now - lastArchiveTime < 60 * 60 * 1000) {
    return; // Has been archived in the past hour
  }

  try {
    await fs.mkdir(archiveDir, { recursive: true });
    const zip = new AdmZip();
    
    const configData = {
      dashboardSettings: appData.dashboardSettings,
      briefingConfig: appData.briefingConfig || { selectedItems: [], layout: [] }
    };
    const adminData = {
      fields: appData.fields,
      snapshots: appData.snapshots
    };
    
    zip.addFile('Config.json', Buffer.from(JSON.stringify(configData, null, 2)));
    zip.addFile('Admin.json', Buffer.from(JSON.stringify(adminData, null, 2)));
    zip.addFile('RIO.json', Buffer.from(JSON.stringify(appData.risks || [], null, 2)));
    zip.addFile('Schedule.json', Buffer.from(JSON.stringify(appData.schedule || { tasks: [], dependencies: [] }, null, 2)));
    zip.addFile('RIO-Schedule.json', Buffer.from(JSON.stringify(appData.mapping || [], null, 2)));
    zip.addFile('Monte-Carlo.json', Buffer.from(JSON.stringify(appData.simulationCache || null, null, 2)));
    
    // Add attachments if any exist in the temp workDir
    try {
      const attachmentDir = path.join(workDir, 'attachments');
      const attachments = await fs.readdir(attachmentDir);
      if (attachments.length > 0) {
        zip.addLocalFolder(attachmentDir, 'attachment');
      }
    } catch (e) {}

    const baseName = path.basename(currentFilePath, path.extname(currentFilePath));
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const archivePath = path.join(archiveDir, `${baseName}_${timestamp}.zip`);
    
    zip.writeZip(archivePath);
    lastArchiveTime = now;
    console.log(`Successfully auto-archived to ${archivePath}`);
  } catch (error) {
    console.error('Error creating auto-archive:', error);
  }
};"""

text = text.replace(auto_save_pattern, auto_archive_code)

# 2. Add autoArchive() call to updateData()
update_data_old = """const updateData = (msg, callback) => {
  appData = Automerge.change(appData, `${getUsername()}: ${msg}`, callback);
};"""

update_data_new = """const updateData = (msg, callback) => {
  appData = Automerge.change(appData, `${getUsername()}: ${msg}`, callback);
  autoSaveToTemp();
  autoArchive();
};"""

text = text.replace(update_data_old, update_data_new)

# 3. Reset archive state in handleOpenFile
open_file_old = """const handleOpenFile = async (filePath = null) => {"""
open_file_new = """const handleOpenFile = async (filePath = null) => {
  lastArchiveTime = 0;
  hasCheckedDiskForArchives = false;"""

text = text.replace(open_file_old, open_file_new)

with open('electron/main.js', 'w') as f:
    f.write(text)
