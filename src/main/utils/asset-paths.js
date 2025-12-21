const path = require('path');
const fs = require('fs');

let electronApp = null;
try {
  ({ app: electronApp } = require('electron'));
} catch (_) {
  electronApp = null;
}

function candidateRoots() {
  const roots = [];
  const resourcesRoot = process.resourcesPath || null;
  const execRoot = process.execPath ? path.dirname(process.execPath) : null;

  if (electronApp && electronApp.isPackaged) {
    if (resourcesRoot) {
      roots.push(path.join(resourcesRoot, 'app.asar.unpacked'));
      roots.push(resourcesRoot);
    }
    if (execRoot) {
      roots.push(path.join(execRoot, 'resources', 'app.asar.unpacked'));
      roots.push(path.join(execRoot, 'resources'));
    }
  }

  roots.push(process.cwd());
  return Array.from(new Set(roots.filter(Boolean)));
}

function resolveAsset(...segments) {
  const relativePath = path.join(...segments);
  const candidates = candidateRoots().map((root) => path.join(root, relativePath));
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  return found || candidates[0];
}

module.exports = { resolveAsset };
