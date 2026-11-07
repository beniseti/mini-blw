import { defineConfig } from 'vite'

/**
 * Compila el servidor (server/index.ts) en un único archivo JavaScript
 * (dist-server/index.js) con todas sus dependencias incluidas: la imagen Docker
 * no necesita node_modules. SQLite viene integrado en Node (node:sqlite).
 */
export default defineConfig({
  publicDir: false,
  build: {
    ssr: 'server/index.ts',
    outDir: 'dist-server',
    emptyOutDir: true,
    target: 'node22',
    minify: false,
    copyPublicDir: false,
  },
  ssr: { noExternal: true },
})
