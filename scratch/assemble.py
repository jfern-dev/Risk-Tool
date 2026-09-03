import re

with open('scratch/main.js', 'r') as f:
    main_text = f.read()

with open('scratch/api-request.js', 'r') as f:
    api_text = f.read()

# find the api-request block in main_text
start_idx = main_text.find("ipcMain.handle('api-request', async (event, { path: reqPath, method, body }) => {")
if start_idx != -1:
    # replace from start_idx to the end of the file with api_text
    new_text = main_text[:start_idx] + api_text
    with open('electron/main.js', 'w') as f:
        f.write(new_text)
        print("Success")
else:
    print("Could not find api block in main.js")
