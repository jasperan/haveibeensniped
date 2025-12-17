import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 4000,
    host: '0.0.0.0', // Allow connections from all network interfaces (localhost, LAN, internet)
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
