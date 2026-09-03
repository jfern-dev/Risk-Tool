import re

with open('scratch/main.js', 'r') as f:
    content = f.read()

# Replace handleSave
save_old = """  console.log('Saving to:', currentFilePath);
  await autoSaveToTemp();

  const zip = new AdmZip();
  // We include all json files and the attachment directory
  zip.addLocalFile(path.join(workDir, 'Config.json'));
  zip.addLocalFile(path.join(workDir, 'Admin.json'));
  zip.addLocalFile(path.join(workDir, 'RIO.json'));
  zip.addLocalFile(path.join(workDir, 'Schedule.json'));
  zip.addLocalFile(path.join(workDir, 'RIO-Schedule.json'));
  zip.addLocalFile(path.join(workDir, 'Monte-Carlo.json'));
  
  try {
    const attachmentDir = path.join(workDir, 'attachments');
    const attachments = await fs.readdir(attachmentDir);
    if (attachments.length > 0) {
      zip.addLocalFolder(attachmentDir, 'attachment'); // The request specified "attachment"
    }
  } catch (e) {
    console.log('No attachments dir, skipping.');
  }
  
  zip.writeZip(currentFilePath);"""

save_new = """  console.log('Saving to:', currentFilePath);
  await autoSaveToTemp();

  const binary = Automerge.save(appData);
  await fs.writeFile(currentFilePath, binary);"""
content = content.replace(save_old, save_new)

with open('scratch/main.js', 'w') as f:
    f.write(content)
