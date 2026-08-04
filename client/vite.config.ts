import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
// Test config lives separately in vitest.config.ts - this project's vite
// version and vitest's own (nested) vite peer dependency don't share
// identical Plugin types, so merging them via vitest/config's defineConfig
// here causes a spurious type error. The tests don't need this file's
// plugins (react/tailwind) anyway - they're plain TypeScript, not
// components or styles.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
