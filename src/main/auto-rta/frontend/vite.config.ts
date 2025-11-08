import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// Build integrando com Flask: outDir para backend/static
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, '../auto-rta/backend/static'),
    emptyOutDir: true,
  },
})
