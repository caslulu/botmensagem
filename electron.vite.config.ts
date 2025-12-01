import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'

function collectMainEntries(baseDir: string, ignoredDirs: Set<string> = new Set(['automation'])): string[] {
  const entries: string[] = []

  const walk = (dir: string) => {
    const items = readdirSync(dir)
    for (const item of items) {
      const fullPath = join(dir, item)
      const stats = statSync(fullPath)
      if (stats.isDirectory()) {
        if (ignoredDirs.has(item)) {
          continue
        }
        walk(fullPath)
      } else if (fullPath.endsWith('.js')) {
        entries.push(fullPath)
      }
    }
  }

  walk(baseDir)
  return entries
}

const mainEntries = collectMainEntries('src/main')

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin(),
      viteStaticCopy({
        targets: [
          {
            src: 'src/main/automation',
            dest: '.'
          },
          {
            src: 'src/main/automation',
            dest: '..'
          },
          {
            src: 'src/main/price/assets',
            dest: 'price'
          },
          {
            src: 'src/main/rta/assets',
            dest: 'rta'
          }
        ]
      })
    ],
    build: {
      lib: {
        entry: 'src/main/main.js',
        formats: ['cjs'],
        fileName: () => 'main.js'
      },
      rollupOptions: {
        input: mainEntries,
        external: ['./automation', '../automation'],
        output: {
          preserveModules: true,
          preserveModulesRoot: 'src/main',
          entryFileNames: '[name].js',
          format: 'cjs'
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: 'src/preload/preload.js'
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    plugins: [react()],
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    }
  }
})
