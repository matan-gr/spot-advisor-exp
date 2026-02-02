
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    open: true,
    // Fix for Cloud Run / Reverse Proxy HMR
    // If running in Cloud Run (detected via K_SERVICE), tell the HMR client to connect via port 443 (HTTPS)
    // instead of the internal container port (3000).
    hmr: process.env.K_SERVICE ? {
        clientPort: 443
    } : undefined,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'framer-motion'],
          charts: ['recharts'],
          genai: ['@google/genai'],
          utils: ['jspdf', 'jspdf-autotable', 'lucide-react']
        }
      }
    },
    chunkSizeWarningLimit: 1000, // Increase limit slightly to reduce noise for moderate chunks
  },
});
