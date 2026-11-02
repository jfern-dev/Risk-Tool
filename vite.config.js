import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import util from 'util';
import { fileURLToPath } from 'url';
import { findJavaExecutable, getClassPath } from './electron/javaDetector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execFileAsync = util.promisify(execFile);

function mppParserPlugin() {
  return {
    name: 'mpp-parser-plugin',
    configureServer(server) {
      server.middlewares.use('/api/parse-mpp', async (req, res, next) => {
        if (req.method !== 'POST') return next();

        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', async () => {
          const buffer = Buffer.concat(chunks);
          const tempPath = path.join(os.tmpdir(), `upload-${Date.now()}.mpp`);

          try {
            await fs.writeFile(tempPath, buffer);

            const scriptsDir = path.resolve(__dirname, 'scripts');
            const javaExec = await findJavaExecutable(scriptsDir);

            if (!javaExec) {
              throw new Error(
                'Java (JRE/JDK 21+) is required to parse MS Project (.mpp) files, but was not found. ' +
                'Please install Java 21+ from https://adoptium.net or set JAVA_HOME.'
              );
            }

            const classPath = await getClassPath(scriptsDir);

            const { stdout } = await execFileAsync(javaExec, ['-cp', classPath, 'ParseMPP', tempPath], {
              maxBuffer: 1024 * 1024 * 50,
              windowsHide: true
            });

            const jsonStartIndex = stdout.indexOf('{');
            if (jsonStartIndex === -1) {
              throw new Error('No JSON output from ParseMPP: ' + stdout);
            }

            const jsonStr = stdout.substring(jsonStartIndex);
            const parsed = JSON.parse(jsonStr);

            if (parsed.error) {
              throw new Error(parsed.error);
            }

            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify(parsed));
          } catch (err) {
            console.error('MPP Dev Parser error:', err);
            let errMsg = err.message || 'Failed to parse MPP file';
            if (err.code === 'ENOENT') {
              errMsg = 'Java executable not found. Please install Java 21+ or set JAVA_HOME.';
            } else if (err.message && err.message.includes('UnsupportedClassVersionError')) {
              errMsg = 'Java 21 or higher is required to parse MS Project (.mpp) files.';
            }
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 500;
            res.end(JSON.stringify({ error: errMsg }));
          } finally {
            await fs.unlink(tempPath).catch(() => {});
          }
        });
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  server: {
    port: 5173,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: ['display.ferngroup.net', 'dev.ferngroup.net', 'localhost', '127.0.0.1']
  },
  plugins: [react(), mppParserPlugin()],
});
