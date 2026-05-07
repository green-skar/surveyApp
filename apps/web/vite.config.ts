import path from 'node:path';
import { reactRouter } from '@react-router/dev/vite';
import { reactRouterHonoServer } from 'react-router-hono-server/dev';
import { defineConfig } from 'vite';
import babel from 'vite-plugin-babel';
import tsconfigPaths from 'vite-tsconfig-paths';
import { addRenderIds } from './plugins/addRenderIds';
import { aliases } from './plugins/aliases';
import consoleToParent from './plugins/console-to-parent';
import { layoutWrapperPlugin } from './plugins/layouts';
import { loadFontsFromTailwindSource } from './plugins/loadFontsFromTailwindSource';
import { nextPublicProcessEnv } from './plugins/nextPublicProcessEnv';
import { restart } from './plugins/restart';

const DEV_WEB_PORT = 4000;
const DEV_API_TARGET = 'http://127.0.0.1:3000';

export default defineConfig(({ command }) => ({
  build: {
    // Server bundle uses top-level await (Hono entry); browser-ish targets break SSR build.
    target: 'esnext',
    rollupOptions: {
      onLog(level, log, defaultHandler) {
        const message = typeof log === 'string' ? log : log.message;
        if (
          message.includes("Can't resolve original location") ||
          message.includes('sourcemap for reporting an error')
        ) {
          return;
        }
        defaultHandler(level, log);
      },
    },
  },
  ssr: {
    target: 'node',
  },
  // Keep them available via import.meta.env.NEXT_PUBLIC_*
  envPrefix: 'NEXT_PUBLIC_',
  optimizeDeps: {
    // Explicitly include fast-glob, since it gets dynamically imported and we
    // don't want that to cause a re-bundle.
    include: ['fast-glob', 'lucide-react'],
    exclude: [
      '@hono/auth-js/react',
      '@hono/auth-js',
      '@auth/core',
      '@hono/auth-js',
      'hono/context-storage',
      '@auth/core/errors',
      'fsevents',
      'lightningcss',
    ],
  },
  logLevel: 'info',
  plugins: [
    nextPublicProcessEnv(),
    reactRouterHonoServer({
      serverEntryPoint: './__create/index.ts',
      runtime: 'node',
    }),
    babel({
      include: ['src/**/*.{js,jsx,ts,tsx}'], // or RegExp: /src\/.*\.[tj]sx?$/
      exclude: /node_modules/, // skip everything else
      babelConfig: {
        babelrc: false, // don’t merge other Babel files
        configFile: false,
        plugins: ['styled-jsx/babel'],
      },
    }),
    ...(command === 'serve'
      ? [
          {
            name: 'dev-origins-banner',
            configureServer() {
              console.log(`[local-dev] Web UI: http://localhost:${DEV_WEB_PORT}`);
              console.log(`[local-dev] API/Auth target: ${DEV_API_TARGET}`);
              console.log(
                '[local-dev] AUTH_URL should match browser origin (apps/web/.env -> AUTH_URL=http://localhost:4000)'
              );
            },
          },
          restart({
            restart: [
              'src/**/page.jsx',
              'src/**/page.tsx',
              'src/**/layout.jsx',
              'src/**/layout.tsx',
              'src/**/route.js',
              'src/**/route.ts',
            ],
          }),
          consoleToParent(),
        ]
      : []),
    loadFontsFromTailwindSource(),
    addRenderIds(),
    reactRouter(),
    tsconfigPaths(),
    aliases(),
    layoutWrapperPlugin(),
  ],
  resolve: {
    alias: {
      lodash: 'lodash-es',
      'npm:stripe': 'stripe',
      stripe: path.resolve(__dirname, './src/__create/stripe'),
      '@auth/create/react': path.resolve(
        __dirname,
        './src/shims/hono-auth-js-react.js'
      ),
      '@auth/create': path.resolve(__dirname, './src/__create/@auth/create'),
      '@': path.resolve(__dirname, 'src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  clearScreen: false,
  server: {
    allowedHosts: true,
    host: '0.0.0.0',
    port: DEV_WEB_PORT,
    strictPort: true,
    proxy: {
      // In local dev, react-router-hono-server handles API/auth on port 3000.
      // Proxy /api and /integrations so the browser can stay on the Vite origin.
      '/api': {
        target: DEV_API_TARGET,
        changeOrigin: true,
      },
      '/integrations': {
        target: DEV_API_TARGET,
        changeOrigin: true,
      },
    },
    fs: {
      allow: ['..', '../../shared'],
    },
    hmr: {
      overlay: false,
    },
    warmup: {
      clientFiles: ['./src/app/**/*', './src/app/root.tsx', './src/app/routes.ts'],
    },
  },
}));
