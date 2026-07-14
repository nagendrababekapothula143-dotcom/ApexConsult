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
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['framer-motion', 'lucide-react', 'react-hot-toast']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
});
