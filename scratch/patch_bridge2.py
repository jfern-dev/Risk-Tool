import re

with open('src/utils/browserDevBridge.js', 'r') as f:
    text = f.read()

old_code = """  const handleApiRequest = async ({ path: reqPath, method = 'GET', body }) => {"""

new_code = """  const handleApiRequest = async ({ path: reqPath, method = 'GET', body }) => {
    if (reqPath === '/api/system-info' && method === 'GET') {
      return {
        username: 'Browser User (Mock)',
        lastSync: Date.now(),
        lastArchive: Date.now() - 3600000
      };
    }"""

text = text.replace(old_code, new_code)
with open('src/utils/browserDevBridge.js', 'w') as f:
    f.write(text)
