import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
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
    },
  },
  server: {
    port: 3000,
  },
  base: '/ProjectAbyss/',
  build: {
    target: 'ES2022',
  },
});
