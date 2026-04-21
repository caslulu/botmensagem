import fs from 'node:fs';
import path from 'node:path';

export function ensureDir(dirPath: string): string {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
}

export function storagePath(envKey: string, fallback: string): string {
  return path.resolve(process.env[envKey] || fallback);
}

export function assetsRoot(): string {
  return path.resolve(process.env.ASSETS_DIR || path.join(process.cwd(), 'assets'));
}

export function sanitizeFileName(name: string): string {
  const cleaned = String(name || 'arquivo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return cleaned || 'arquivo';
}

export function publicApiUrl(): string {
  return (process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/+$/, '');
}

export function downloadUrl(fileId: string): string {
  return `${publicApiUrl()}/files/${encodeURIComponent(fileId)}/download`;
}
