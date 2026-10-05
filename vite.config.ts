import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { legalTemplatePrecompiler } from './scripts/template-precompiler.ts';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';

const offlinePaths = [
  ...readdirSync(new URL('./public/corpus/', import.meta.url)).filter(file => file.endsWith('.json')).sort().map(file => `/corpus/${file}`),
  '/wasm/sql-wasm.wasm',
];
const offlineAssets = offlinePaths.map(path => {
  const content = readFileSync(new URL(`./public${path}`, import.meta.url));
  return { path, bytes: content.byteLength, sha256: createHash('sha256').update(content).digest('hex') };
});
const offlineManifest = {
  version: createHash('sha256').update(JSON.stringify(offlineAssets)).digest('hex'),
  assets: offlineAssets,
};

// https://vite.dev/config/
export default defineConfig({
  define: { __OFFLINE_CORPUS_MANIFEST__: JSON.stringify(offlineManifest) },
  plugins: [
    legalTemplatePrecompiler(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'favicon.svg'],
      manifest: {
        name: 'Lex Corporativo — Consulta Federal y Licitaciones',
        short_name: 'Lex Corporativo',
        description: 'Consulta de legislación federal, licitaciones y Edición Pro Móvil de pago único con editor IA (BYOK) y Fundamentador Jurídico RAG. Instálala desde la web.',
        lang: 'es-MX',
        theme_color: '#070b13',
        background_color: '#070b13',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        id: '/',
        start_url: '/?tab=estudio',
        icons: [
          {
            src: '/favicon.png',
            sizes: '640x640',
            type: 'image/png',
          },
        ],
        categories: ['productivity', 'reference', 'legal'],
        shortcuts: [{
          name: 'Editor jurídico', short_name: 'Editor', url: '/?tab=estudio',
          icons: [{ src: '/favicon.png', sizes: '640x640', type: 'image/png' }],
        }],
        screenshots: [],
      },
      workbox: {
        globPatterns: ['**/*.{js,mjs,css,html,svg,woff2}'],
        cleanupOutdatedCaches: true,
        // Navegación fallback para SPA
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /\.json$/, /\.wasm$/],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 1200,
    modulePreload: {
      resolveDependencies(_filename, deps, { hostType }) {
        if (hostType === 'html') {
          return deps.filter(
            (dep) =>
              !dep.includes('vendor-editor') &&
              !dep.includes('vendor-export') &&
              !dep.includes('vendor-pdf') &&
              !dep.includes('DraftingStudio') &&
              !dep.includes('DesktopPresentation'),
          );
        }
        return deps;
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('sql.js')) {
              return 'vendor-sqljs';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-lucide';
            }
            if (id.includes('@vercel')) {
              return 'vendor-analytics';
            }
            if (id.includes('@tiptap')) {
              return 'vendor-editor';
            }
            if (id.includes('docx') || id.includes('jspdf') || id.includes('jszip')) {
              return 'vendor-export';
            }
            if (id.includes('pdfjs-dist')) {
              return 'vendor-pdf';
            }
            if (id.includes('handlebars')) {
              return 'vendor-templates';
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('zustand')) {
              return 'vendor-framework';
            }
            return 'vendor-libs';
          }
        },
      },
    },
  },
});
