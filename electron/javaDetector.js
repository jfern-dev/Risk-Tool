import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { execFile } from 'child_process';
import util from 'util';

const execFileAsync = util.promisify(execFile);

/**
 * Searches for a valid Java executable across:
 * 1. Bundled JRE in scriptsDir or application resources
 * 2. Environment variables (JAVA_HOME, JDK_HOME, JRE_HOME)
 * 3. Windows standard installation locations (Program Files, LocalAppData, Scoop, Chocolatey)
 * 4. macOS standard locations (/usr/libexec/java_home, Homebrew, SDKMAN, /Library/Java)
 * 5. Linux standard locations (/usr/bin/java, SDKMAN, ASDF)
 * 6. System PATH (`where.exe java` on Windows, `which java` on Unix)
 */
export async function findJavaExecutable(scriptsDir) {
  const isWin = process.platform === 'win32';
  const isMac = process.platform === 'darwin';
  const javaBinaryName = isWin ? 'java.exe' : 'java';

  const candidates = [];

  // 1. Bundled JRE inside scripts/jre
  if (scriptsDir) {
    candidates.push(path.join(scriptsDir, 'jre', 'bin', javaBinaryName));
    if (isMac) {
      candidates.push(path.join(scriptsDir, 'jre', 'Contents', 'Home', 'bin', 'java'));
    }
  }

  // Also check Electron process.resourcesPath if available in packaged app
  try {
    if (typeof process !== 'undefined' && process.resourcesPath) {
      candidates.push(path.join(process.resourcesPath, 'jre', 'bin', javaBinaryName));
      candidates.push(path.join(process.resourcesPath, 'app.asar.unpacked', 'scripts', 'jre', 'bin', javaBinaryName));
      if (isMac) {
        candidates.push(path.join(process.resourcesPath, 'jre', 'Contents', 'Home', 'bin', 'java'));
        candidates.push(path.join(process.resourcesPath, 'app.asar.unpacked', 'scripts', 'jre', 'Contents', 'Home', 'bin', 'java'));
      }
    }
  } catch {}

  // 2. Standard Environment Variables
  const envVars = ['JAVA_HOME', 'JDK_HOME', 'JRE_HOME'];
  for (const v of envVars) {
    const val = process.env[v];
    if (val) {
      candidates.push(path.join(val, 'bin', javaBinaryName));
      if (isMac) {
        candidates.push(path.join(val, 'Contents', 'Home', 'bin', 'java'));
      }
    }
  }

  // 3. Platform-specific candidate paths
  if (isWin) {
    // Windows common Oracle / javapath links
    candidates.push('C:\\Program Files\\Common Files\\Oracle\\Java\\javapath\\java.exe');
    candidates.push('C:\\Program Files (x86)\\Common Files\\Oracle\\Java\\javapath\\java.exe');
    candidates.push('C:\\ProgramData\\Oracle\\Java\\javapath\\java.exe');

    // Windows standard JDK / JRE installation parent directories
    const searchParents = [
      'C:\\Program Files\\Eclipse Adoptium',
      'C:\\Program Files\\Java',
      'C:\\Program Files\\Microsoft',
      'C:\\Program Files\\Amazon Corretto',
      'C:\\Program Files\\Zulu',
      'C:\\Program Files\\BellSoft',
      'C:\\Program Files\\Semeru',
      'C:\\Program Files (x86)\\Java',
      'C:\\Program Files (x86)\\Eclipse Adoptium',
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Eclipse Adoptium'),
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Java'),
      path.join(os.homedir(), '.jdks')
    ];

    for (const parent of searchParents) {
      try {
        const entries = await fs.readdir(parent, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            candidates.push(path.join(parent, entry.name, 'bin', 'java.exe'));
          }
        }
      } catch {}
    }

    // Scoop, Chocolatey, SDKMAN on Windows
    candidates.push(path.join(os.homedir(), 'scoop', 'apps', 'openjdk', 'current', 'bin', 'java.exe'));
    candidates.push(path.join(os.homedir(), 'scoop', 'apps', 'oraclejdk', 'current', 'bin', 'java.exe'));
    candidates.push(path.join(os.homedir(), 'scoop', 'apps', 'temurin', 'current', 'bin', 'java.exe'));
    candidates.push(path.join(os.homedir(), 'scoop', 'apps', 'zulu', 'current', 'bin', 'java.exe'));
    candidates.push('C:\\ProgramData\\chocolatey\\bin\\java.exe');
    candidates.push(path.join(os.homedir(), '.sdkman', 'candidates', 'java', 'current', 'bin', 'java.exe'));

    // Check where.exe java
    try {
      const { stdout } = await execFileAsync('where.exe', ['java'], { windowsHide: true });
      const lines = stdout.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        if (line.toLowerCase().endsWith('.exe')) {
          candidates.push(line);
        }
      }
    } catch {}
  } else if (isMac) {
    try {
      const { stdout } = await execFileAsync('/usr/libexec/java_home', []);
      const jh = stdout.trim();
      if (jh) candidates.push(path.join(jh, 'bin', 'java'));
    } catch {}

    candidates.push('/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home/bin/java');
    candidates.push('/opt/homebrew/opt/openjdk/bin/java');
    candidates.push('/opt/homebrew/opt/openjdk@21/bin/java');
    candidates.push('/opt/homebrew/opt/openjdk@17/bin/java');
    candidates.push('/opt/homebrew/bin/java');
    candidates.push('/usr/local/opt/openjdk/bin/java');
    candidates.push('/usr/local/bin/java');
    candidates.push(path.join(os.homedir(), '.sdkman/candidates/java/current/bin/java'));
    candidates.push(path.join(os.homedir(), '.sdkman/candidates/java/21.0.2-tem/bin/java'));
    candidates.push(path.join(os.homedir(), '.asdf/shims/java'));
    candidates.push(path.join(os.homedir(), '.jenv/shims/java'));
    candidates.push('/usr/bin/java');
  } else {
    // Linux
    candidates.push('/usr/bin/java');
    candidates.push('/usr/local/bin/java');
    candidates.push('/home/fern/.sdkman/candidates/java/21.0.2-tem/bin/java');
    candidates.push(path.join(os.homedir(), '.sdkman/candidates/java/current/bin/java'));
    candidates.push(path.join(os.homedir(), '.sdkman/candidates/java/21.0.2-tem/bin/java'));
    candidates.push(path.join(os.homedir(), '.asdf/shims/java'));
    candidates.push('/usr/lib/jvm/default-java/bin/java');
    candidates.push('/usr/lib/jvm/java-21-openjdk-amd64/bin/java');

    try {
      const { stdout } = await execFileAsync('which', ['java']);
      const w = stdout.trim();
      if (w) candidates.push(w);
    } catch {}
  }

  // Iterate over candidates and verify existence
  for (const cand of candidates) {
    if (!cand) continue;
    try {
      const stat = await fs.stat(cand);
      if (stat.isFile()) {
        return cand;
      }
    } catch {}
  }

  // Check if bare java command works from PATH
  try {
    await execFileAsync(javaBinaryName, ['-version'], { windowsHide: true });
    return javaBinaryName;
  } catch {}

  return null;
}

/**
 * Builds the classpath string with individual jar files and the scripts directory.
 */
export async function getClassPath(scriptsDir) {
  const libDir = path.join(scriptsDir, 'lib');
  let jarPaths = [];
  try {
    const libFiles = await fs.readdir(libDir);
    jarPaths = libFiles
      .filter(f => f.endsWith('.jar'))
      .map(f => path.join(libDir, f));
  } catch {}

  if (jarPaths.length > 0) {
    return [...jarPaths, scriptsDir].join(path.delimiter);
  }
  return path.join(libDir, '*') + path.delimiter + scriptsDir;
}
