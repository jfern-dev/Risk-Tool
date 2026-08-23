import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import util from 'util';
import { fileURLToPath } from 'url';

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

            const candidateJavaPaths = [
              '/home/fern/.sdkman/candidates/java/21.0.2-tem/bin/java',
              path.join(os.homedir(), '.sdkman/candidates/java/current/bin/java'),
              path.join(os.homedir(), '.sdkman/candidates/java/21.0.2-tem/bin/java'),
              '/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home/bin/java',
              '/opt/homebrew/bin/java',
              '/usr/bin/java'
            ];

            let javaExec = 'java';
            for (const cand of candidateJavaPaths) {
              try {
                await fs.stat(cand);
                javaExec = cand;
                break;
              } catch {}
            }

            const scriptsDir = path.resolve(__dirname, 'scripts');
            const classPath = path.join(scriptsDir, 'lib', '*') + path.delimiter + scriptsDir;

            const { stdout } = await execFileAsync(javaExec, ['-cp', classPath, 'ParseMPP', tempPath], {
              maxBuffer: 1024 * 1024 * 50
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
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message || 'Failed to parse MPP file' }));
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
    allowedHosts: ['display.ferngroup.net']
  },
  plugins: [react(), mppParserPlugin()],
});
