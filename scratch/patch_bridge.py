import re

with open('src/utils/browserDevBridge.js', 'r') as f:
    text = f.read()

# find handleApiRequest
old_code = """  const handleApiRequest = async ({ path: reqPath, method, body }) => {
    await new Promise(r => setTimeout(r, 100));"""

new_code = """  const handleApiRequest = async ({ path: reqPath, method, body }) => {
    await new Promise(r => setTimeout(r, 100));
    
    if (reqPath === '/api/system-info' && method === 'GET') {
      return {
        username: 'Browser User',
        lastSync: Date.now(),
        lastArchive: Date.now() - 3600000
      };
    }"""

if old_code in text:
    text = text.replace(old_code, new_code)
    with open('src/utils/browserDevBridge.js', 'w') as f:
        f.write(text)
    print("Success")
else:
    print("Failed")
