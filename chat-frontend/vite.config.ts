import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        configure: (proxy: any) => {
          // Remove Vite's default error logging listeners and add quiet handlers
          try { proxy.removeAllListeners('error'); } catch {}
          try { proxy.removeAllListeners('proxyRes'); } catch {}

          proxy.on('error', (_err: any, _req: any, res: any) => {
            // Suppress console noise for backend-down or transient errors
            if (res.writeHead && !res.headersSent) {
              res.writeHead(502, { 'Content-Type': 'text/plain' });
            }
            res.end();
          });
          proxy.on('proxyRes', (proxyRes: any) => {
            // Ignore 404s from the backend (do not log)
            if (proxyRes.statusCode === 404) {
              // no-op
            }
          });
        },
      },
    },
  },
});

