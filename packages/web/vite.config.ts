import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
      '@roadmate/shared': new URL('../shared/src', import.meta.url).pathname,
    },
  },
});
