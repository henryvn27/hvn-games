import { defineConfig } from 'vite';

export default defineConfig({
  root: 'site',
  base: '/hvn-games/',
  build: { outDir: '../dist', emptyOutDir: true, sourcemap: false },
  server: { fs: { allow: ['..'] } },
});
