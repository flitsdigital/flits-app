import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@supabase')) return 'vendor-supabase'
            if (id.includes('react-dom') || id.includes('/react/')) return 'vendor-react'
            if (id.includes('@radix-ui') || id.includes('radix-ui')) return 'vendor-radix'
            if (id.includes('date-fns')) return 'vendor-date-fns'
            if (id.includes('lucide-react')) return 'vendor-lucide'
            if (id.includes('jspdf') || id.includes('html2canvas')) return 'vendor-pdf'
          }
        },
      },
    },
  },
})
