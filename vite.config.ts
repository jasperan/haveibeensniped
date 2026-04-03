import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const devHost = process.env.HIBS_DEV_HOST || '127.0.0.1';

export default defineConfig({
  server: {
    port: 4000,
    host: devHost,
    strictPort: false, // If port 4000 is taken, try next available port
    open: true, // Automatically open browser
    cors: true, // Enable CORS for the dev server
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
