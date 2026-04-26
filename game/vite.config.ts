import { defineConfig, type Plugin } from 'vite';
import path from 'path';
import fs from 'fs';

/**
 * Serve docs/ui-components.html at /docs/ui-components (and /docs/ui-components.html)
 * during dev so the catalog renders with the same fonts/headers as the game.
 * Prod build (gh-pages) does not include this — catalog is dev-only.
 */
function uiCatalogPlugin(): Plugin {
  const uiCatalogPath = path.resolve(__dirname, 'docs/ui-components.html');
  return {
    name: 'echoris-ui-catalog',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? '';
        // Match both /docs/ui-components and /docs/ui-components.html, with or without /play/ base prefix.
        const stripped = url.replace(/^\/play/, '');
        if (stripped === '/docs/ui-components' || stripped === '/docs/ui-components.html') {
          fs.readFile(uiCatalogPath, (err, data) => {
            if (err) {
              res.statusCode = 404;
              res.end('ui-components.html not found');
              return;
            }
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(data);
          });
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [uiCatalogPlugin()],
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, 'src/core'),
      '@scenes': path.resolve(__dirname, 'src/scenes'),
      '@entities': path.resolve(__dirname, 'src/entities'),
      '@combat': path.resolve(__dirname, 'src/combat'),
      '@level': path.resolve(__dirname, 'src/level'),
      '@items': path.resolve(__dirname, 'src/items'),
      '@data': path.resolve(__dirname, 'src/data'),
      '@ui': path.resolve(__dirname, 'src/ui'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@effects': path.resolve(__dirname, 'src/effects'),
      '@systems': path.resolve(__dirname, 'src/systems'),
      '@audio': path.resolve(__dirname, 'src/audio'),
      '@save': path.resolve(__dirname, 'src/save'),
    },
  },
  server: {
    port: 3000,
    fs: {
      // Allow serving files from the docs/ folder (one level above src/).
      allow: [path.resolve(__dirname)],
    },
  },
  base: '/play/',
  build: {
    target: 'ES2022',
  },
});
