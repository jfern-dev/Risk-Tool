with open('electron/main.js', 'r') as f:
    text = f.read()

text = text.replace("if (!file.endsWith('.zip')) continue;", "if (!file.endsWith('.erm')) continue;")
text = text.replace("const archivePath = path.join(archiveDir, `${baseName}_${timestamp}.zip`);", "const archivePath = path.join(archiveDir, `${baseName}_${timestamp}.erm`);")

with open('electron/main.js', 'w') as f:
    f.write(text)
