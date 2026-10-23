import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    // Phaser's full runtime is ~1.5 MB before compression. Cache it separately.
    chunkSizeWarningLimit: 1600,
    rollupOptions: { output: { manualChunks: { phaser: ['phaser'] } } },
  },
});
