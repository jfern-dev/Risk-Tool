import re

with open('electron/main.js', 'r') as f:
    text = f.read()

# Add lastSyncTime tracking
auto_save_old = """const autoSaveToTemp = async () => {
  try {
    const binary = Automerge.save(appData);
    await fs.writeFile(path.join(workDir, 'temp.am'), binary);
  } catch (error) {
    console.error('Error auto-saving to temp:', error);
  }
};"""
auto_save_new = """let lastSyncTime = 0;
const autoSaveToTemp = async () => {
  try {
    const binary = Automerge.save(appData);
    await fs.writeFile(path.join(workDir, 'temp.am'), binary);
    lastSyncTime = Date.now();
  } catch (error) {
    console.error('Error auto-saving to temp:', error);
  }
};"""
text = text.replace(auto_save_old, auto_save_new)

# Add GET /api/system-info route
api_request_old = """    // GET /api/fields
    if (reqPath === '/api/fields' && method === 'GET') {"""
api_request_new = """    // GET /api/system-info
    if (reqPath === '/api/system-info' && method === 'GET') {
      return {
        username: getUsername(),
        lastSync: lastSyncTime,
        lastArchive: lastArchiveTime
      };
    }

    // GET /api/fields
    if (reqPath === '/api/fields' && method === 'GET') {"""
text = text.replace(api_request_old, api_request_new)

# Reset lastSyncTime on file load
open_file_old = """const handleOpenFile = async (filePath = null) => {
  lastArchiveTime = 0;
  hasCheckedDiskForArchives = false;"""
open_file_new = """const handleOpenFile = async (filePath = null) => {
  lastArchiveTime = 0;
  lastSyncTime = Date.now();
  hasCheckedDiskForArchives = false;"""
text = text.replace(open_file_old, open_file_new)

with open('electron/main.js', 'w') as f:
    f.write(text)
