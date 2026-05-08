import { defineConfig, type Plugin } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

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

function ldtkFullReloadPlugin(): Plugin {
  const ldtkPath = path.resolve(__dirname, 'public/assets/World_ProjectAbyss.ldtk');
  const normalizedLdtkPath = path.normalize(ldtkPath);
  let reloadTimer: NodeJS.Timeout | null = null;
  return {
    name: 'echoris-ldtk-full-reload',
    configureServer(server) {
      server.watcher.add(ldtkPath);
      server.watcher.on('all', (eventName, changedPath) => {
        if (path.normalize(path.resolve(changedPath)) !== normalizedLdtkPath) return;
        if (!['add', 'change', 'unlink'].includes(eventName)) return;
        if (reloadTimer) clearTimeout(reloadTimer);
        reloadTimer = setTimeout(() => {
          server.config.logger.info(`[ldtk] World_ProjectAbyss.ldtk changed - ${summarizeBuilderLevels(ldtkPath)} - full reload`);
          server.ws.send({ type: 'full-reload', path: '*' });
        }, 250);
      });
    },
  };
}

function summarizeBuilderLevels(ldtkPath: string): string {
  try {
    const jsonText = fs.readFileSync(ldtkPath, 'utf8');
    const json = JSON.parse(jsonText) as {
      worlds?: Array<{ levels?: Array<{ identifier?: string; layerInstances?: unknown[] }> }>;
      levels?: Array<{ identifier?: string; layerInstances?: unknown[] }>;
    };
    const levels = [
      ...(json.levels ?? []),
      ...(json.worlds ?? []).flatMap((world) => world.levels ?? []),
    ];
    return ['Builder_Level_1', 'Builder_Level_2'].map((levelId) => {
      const level = levels.find((candidate) => candidate.identifier === levelId);
      if (!level) return `${levelId} missing`;
      const hash = crypto.createHash('sha1').update(JSON.stringify(level)).digest('hex').slice(0, 8);
      const entityLayer = (level.layerInstances ?? []).find((layer) => {
        return typeof layer === 'object'
          && layer !== null
          && (layer as { __identifier?: string }).__identifier === 'Entities';
      }) as { entityInstances?: Array<{ __identifier?: string; px?: number[] }> } | undefined;
      const legMounts = (entityLayer?.entityInstances ?? [])
        .filter((entity) => entity.__identifier === 'LegMount')
        .map((entity) => entity.px?.join(',') ?? '?')
        .join(' | ');
      return `${levelId} sha=${hash} legs=[${legMounts}]`;
    }).join(' / ');
  } catch (error) {
    return `Builder summary failed: ${(error as Error).message}`;
  }
}

// Locale resolution. `vite build --mode ko` selects the KO bundle as the active
// locale; default (dev / `vite build`) is EN. The active locale is exposed as
// the `@i18n/active` alias and as the `__LOCALE__` global string at build time.
// See Documents/System/System_Localization_Core.md §4.7.
function resolveLocale(mode: string): 'en' | 'ko' {
  return mode === 'ko' ? 'ko' : 'en';
}

/**
 * Inject Noto Sans KR Google Fonts link tag into index.html for KO builds.
 * EN builds keep the smaller Cinzel/Rajdhani-only payload — see
 * Documents/System/System_Localization_Core.md §4.9.
 */
function localeFontsPlugin(locale: 'en' | 'ko'): Plugin {
  const KO_FONT_LINK =
    '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">';
  return {
    name: 'echoris-locale-fonts',
    transformIndexHtml(html) {
      if (locale !== 'ko') return html;
      // Inject right before the existing latin Google Fonts link so DNS prefetch
      // and CSS parse happen in the same batch.
      return html.replace(
        '<link href="https://fonts.googleapis.com/css2?family=Cinzel',
        `${KO_FONT_LINK}\n  <link href="https://fonts.googleapis.com/css2?family=Cinzel`,
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const LOCALE = resolveLocale(mode);
  return {
    plugins: [uiCatalogPlugin(), ldtkFullReloadPlugin(), localeFontsPlugin(LOCALE)],
    define: {
      __LOCALE__: JSON.stringify(LOCALE),
    },
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
        '@i18n/active': path.resolve(__dirname, `src/i18n/locales/${LOCALE}.json`),
        '@i18n': path.resolve(__dirname, 'src/i18n'),
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
  };
});
