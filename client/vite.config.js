import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    css: {
      postcss: './postcss.config.js',
    },
    optimizeDeps: {
      include: ['socket.io-client', 'react', 'react-dom', 'react-router-dom', 'react-hot-toast', 'axios', 'lucide-react']
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'terser',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            socket: ['socket.io-client'],
            ui: ['axios', 'react-hot-toast']
          }
        }
      }
    },
    server: {
      port: 5173,
      host: true
    },
    preview: {
      port: 4173,
      host: true
    },
    // Define global constants
    define: {
      __APP_ENV__: JSON.stringify(env.APP_ENV)
    }
  }
})
