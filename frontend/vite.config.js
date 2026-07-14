import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    fs: {
      allow: [
        '..', 
        'C:/Users/Nagendra Babu/.gemini/antigravity-ide/brain/78aa827a-69d0-4752-bffc-efd8069dfcb5'
      ]
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor';
            }
            if (id.includes('framer-motion') || id.includes('lucide-react') || id.includes('react-hot-toast')) {
              return 'ui';
            }
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
});
