/**
 * Ensures the Windows native dependency for @napi-rs/canvas is present
 * in node_modules before building for Windows.
 *
 * npm skips optional dependencies that don't match the current OS,
 * so when building for Windows on macOS/Linux, the win32 .node binary
 * is missing. This script downloads and extracts it manually using
 * `npm pack` + `tar`, because `npm install --force` does NOT override
 * the OS restriction reliably.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PKG = '@napi-rs/canvas-win32-x64-msvc';
const PKG_VERSION = '0.1.51';
const ROOT = path.resolve(__dirname, '..');
const TARGET_DIR = path.join(ROOT, 'node_modules', '@napi-rs', 'canvas-win32-x64-msvc');
const NATIVE_FILE = 'skia.win32-x64-msvc.node';

// Check if already present
const candidates = [
  path.join(TARGET_DIR, NATIVE_FILE),
  path.join(ROOT, 'node_modules', '@napi-rs', 'canvas', 'node_modules', '@napi-rs', 'canvas-win32-x64-msvc', NATIVE_FILE)
];

const alreadyInstalled = candidates.some((f) => {
  try {
    return fs.existsSync(f) && fs.statSync(f).size > 0;
  } catch {
    return false;
  }
});

if (alreadyInstalled) {
  console.log(`[ensure-win-deps] ${NATIVE_FILE} already present — skipping.`);
  process.exit(0);
}

console.log(`[ensure-win-deps] ${NATIVE_FILE} not found. Downloading ${PKG}@${PKG_VERSION}...`);

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'napi-canvas-'));

try {
  // 1. Download the tarball using npm pack
  const tarball = execSync(`npm pack ${PKG}@${PKG_VERSION}`, {
    cwd: tmpDir,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'inherit']
  }).trim();

  const tarballPath = path.join(tmpDir, tarball);
  console.log(`[ensure-win-deps] Downloaded tarball: ${tarball}`);

  // 2. Extract into node_modules
  fs.mkdirSync(TARGET_DIR, { recursive: true });
  execSync(`tar xzf "${tarballPath}" -C "${TARGET_DIR}" --strip-components=1`, {
    stdio: 'inherit'
  });

  // 3. Verify
  const installed = fs.existsSync(path.join(TARGET_DIR, NATIVE_FILE));
  if (installed) {
    console.log(`[ensure-win-deps] ${PKG} installed successfully.`);
  } else {
    console.error(`[ensure-win-deps] ERROR: ${NATIVE_FILE} not found after extraction.`);
    process.exit(1);
  }
} catch (err) {
  console.error(`[ensure-win-deps] Failed to install ${PKG}:`, err.message);
  process.exit(1);
} finally {
  // Cleanup temp dir
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}
}

