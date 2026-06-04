import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['assets/icons/ClassManager.svg'],
        workbox: {
          maximumFileSizeToCacheInBytes: 10000000,
        },
        manifest: {
          name: 'ניהול כיתה',
          short_name: 'ניהולכיתה',
          description: 'מערכת חכמה לשיבוץ ולניהול תלמידים',
          theme_color: '#ffffff',
          icons: [
            {
              src: 'assets/icons/ClassManager.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    define: {
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: 'es2022',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('xlsx') || id.includes('exceljs') || id.includes('codepage')) {
                return 'vendor-xlsx';
              }
              if (id.includes('recharts') || id.includes('d3') || id.includes('victory') || id.includes('react-resize-detector')) {
                return 'vendor-charts';
              }
              if (id.includes('react-dom') || id.includes('react-quill') || id.includes('quill')) {
                return 'vendor-editor';
              }
              if (id.includes('@google/genai')) {
                return 'vendor-ai';
              }
              return 'vendor-core';
            }
          }
        }
      }
    },
    esbuild: {
      target: 'es2022'
    },
    optimizeDeps: {
      esbuildOptions: {
        target: 'es2022'
      }
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
