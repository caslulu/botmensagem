const fs = require('fs');
const { execSync } = require('child_process');

class ChromeDetector {
  static detect() {
    try {
      if (process.platform === 'win32') {
        return this.detectWindows();
      } else if (process.platform === 'linux') {
        return this.detectLinux();
      } else if (process.platform === 'darwin') {
        return this.detectMacOS();
      }
    } catch (error) {
      return null;
    }
    return null;
  }

  static detectWindows() {
    const possiblePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
    ];

    const foundPath = possiblePaths.find(p => fs.existsSync(p));
    if (foundPath) {
      return foundPath;
    }

    try {
      execSync('reg query "HKEY_CURRENT_USER\\Software\\Google\\Chrome\\BLBeacon" /v version', { 
        encoding: 'utf8' 
      });
      const chromeDir = process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe';
      if (fs.existsSync(chromeDir)) {
        return chromeDir;
      }
    } catch (e) {
    }

    return null;
  }

  static detectLinux() {
    try {
      const chromePath = execSync('which google-chrome || which google-chrome-stable', { 
        encoding: 'utf8' 
      }).trim();
      return chromePath || null;
    } catch (e) {
      return null;
    }
  }

  static detectMacOS() {
    const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    return fs.existsSync(chromePath) ? chromePath : null;
  }
}

module.exports = ChromeDetector;
