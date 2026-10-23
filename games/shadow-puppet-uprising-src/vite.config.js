import { defineConfig } from 'vite';
import { phoneControllerPlugin } from './scripts/phone-controller-server.mjs';

export default defineConfig({
  base: './',
  plugins: [phoneControllerPlugin()],
  build: {
    // Phaser's full runtime is ~1.5 MB before compression. Cache it separately.
    chunkSizeWarningLimit: 1600,
    rollupOptions: { input: { game: 'index.html', controller: 'controller.html' }, output: { manualChunks: { phaser: ['phaser'] } } },
  },
});
