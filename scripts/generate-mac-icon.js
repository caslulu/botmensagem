const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

const projectRoot = path.resolve(__dirname, '..');
const sourceIcon = path.join(projectRoot, 'assets', 'images', 'profiles', 'logo.png');
const buildDir = path.join(projectRoot, 'build');
const iconPng = path.join(buildDir, 'icon.png');
const iconIcns = path.join(buildDir, 'icon.icns');
const iconsetDir = path.join(buildDir, 'icon.iconset');

const ICON_SIZE = 1024;
const PADDING_RATIO = 0.085;
const RADIUS_RATIO = 0.205;

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function ensureCleanDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
  fs.mkdirSync(dirPath, { recursive: true });
}

function resizeForIconset(size) {
  const filename = `icon_${size}x${size}.png`;
  const outputPath = path.join(iconsetDir, filename);
  execFileSync('sips', ['-z', String(size), String(size), iconPng, '--out', outputPath], {
    stdio: 'inherit'
  });
}

async function main() {
  if (!fs.existsSync(sourceIcon)) {
    throw new Error(`Source icon not found: ${sourceIcon}`);
  }

  fs.mkdirSync(buildDir, { recursive: true });

  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d');
  const image = await loadImage(sourceIcon);

  const padding = Math.round(ICON_SIZE * PADDING_RATIO);
  const innerSize = ICON_SIZE - (padding * 2);
  const radius = Math.round(ICON_SIZE * RADIUS_RATIO);

  ctx.clearRect(0, 0, ICON_SIZE, ICON_SIZE);
  ctx.save();
  roundedRect(ctx, padding, padding, innerSize, innerSize, radius);
  ctx.clip();

  const scale = Math.max(innerSize / image.width, innerSize / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const drawX = padding + ((innerSize - drawWidth) / 2);
  const drawY = padding + ((innerSize - drawHeight) / 2);

  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();

  fs.writeFileSync(iconPng, canvas.toBuffer('image/png'));

  if (process.platform !== 'darwin') {
    console.log(`Generated ${path.relative(projectRoot, iconPng)}.`);
    return;
  }

  ensureCleanDir(iconsetDir);

  const entries = [
    { size: 16, retina: 32 },
    { size: 32, retina: 64 },
    { size: 128, retina: 256 },
    { size: 256, retina: 512 },
    { size: 512, retina: 1024 }
  ];

  for (const entry of entries) {
    resizeForIconset(entry.size);
    resizeForIconset(entry.retina);

    const retinaSource = path.join(iconsetDir, `icon_${entry.retina}x${entry.retina}.png`);
    const retinaTarget = path.join(iconsetDir, `icon_${entry.size}x${entry.size}@2x.png`);
    fs.copyFileSync(retinaSource, retinaTarget);
  }

  execFileSync('iconutil', ['-c', 'icns', iconsetDir, '-o', iconIcns], { stdio: 'inherit' });
  console.log(`Generated ${path.relative(projectRoot, iconPng)} and ${path.relative(projectRoot, iconIcns)}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
