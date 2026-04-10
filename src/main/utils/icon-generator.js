const { BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

function generateRoundedIcon(srcPath, outPath, size = 512, radius = 40) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(srcPath)) return reject(new Error('source not found'));

    const win = new BrowserWindow({
      show: false,
      width: size,
      height: size,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      }
    });

    const channel = 'rounded-icon-result-' + Date.now();

    ipcMain.once(channel, (event, dataUrl) => {
      try {
        const base64 = dataUrl.replace(/^data:image\/(png|jpeg);base64,/, '');
        const buf = Buffer.from(base64, 'base64');
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, buf);
        resolve(outPath);
      } catch (err) {
        reject(err);
      } finally {
        try { win.close(); } catch (e) {}
      }
    });

    const loadHtml = `
      <!doctype html>
      <html>
      <body style="margin:0;">
        <canvas id="c" width="${size}" height="${size}"></canvas>
        <script>
          const { ipcRenderer } = require('electron');
          const img = new Image();
          img.onload = () => {
            const canvas = document.getElementById('c');
            const ctx = canvas.getContext('2d');
            const r = ${radius};
            const w = canvas.width, h = canvas.height;
            const padding = Math.round(w * 0.085);
            const innerW = w - (padding * 2);
            const innerH = h - (padding * 2);
            ctx.clearRect(0,0,w,h);
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(padding + r, padding);
            ctx.arcTo(padding + innerW, padding, padding + innerW, padding + innerH, r);
            ctx.arcTo(padding + innerW, padding + innerH, padding, padding + innerH, r);
            ctx.arcTo(padding, padding + innerH, padding, padding, r);
            ctx.arcTo(padding, padding, padding + innerW, padding, r);
            ctx.closePath();
            ctx.clip();
            // Draw the source image inside an inset rounded mask so the app icon
            // reads less like a raw square image in the macOS switcher/dock.
            const ratio = Math.max(innerW / img.width, innerH / img.height);
            const iw = img.width * ratio;
            const ih = img.height * ratio;
            const ix = padding + ((innerW - iw) / 2);
            const iy = padding + ((innerH - ih) / 2);
            ctx.drawImage(img, ix, iy, iw, ih);
            const dataUrl = canvas.toDataURL('image/png');
            ipcRenderer.send('${channel}', dataUrl);
          };
          img.onerror = (e) => { ipcRenderer.send('${channel}', null); };
          img.src = 'file://${srcPath.replace(/\\/g, '/')}';
        <\/script>
      </body>
      </html>
    `;

    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(loadHtml));
  });
}

module.exports = { generateRoundedIcon };
