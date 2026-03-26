import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tsconfigPaths from 'vite-tsconfig-paths';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tsconfigPaths({
        projects: ['./tsconfig.core.vite.json'],
      }),
      viteStaticCopy({
        targets: [
          {
            src: 'node_modules/@embedpdf/pdfium/dist/pdfium.wasm',
            dest: 'pdfium',
          },
          {
            src: 'public/vendor/jscanify/*',
            dest: 'vendor/jscanify',
          },
        ],
      }),
    ],
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          secure: false,
          xfwd: true,
        },
        '/swagger-ui': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          secure: false,
          xfwd: true,
        },
        '/v1/api-docs': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          secure: false,
          xfwd: true,
        },
      },
    },
    base: env.RUN_SUBPATH ? `/${env.RUN_SUBPATH}` : './',
  };
});
