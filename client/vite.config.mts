import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      'process.env.REACT_APP_VERSION': JSON.stringify(env.REACT_APP_VERSION),
    },
    build: {
      outDir: 'build',
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      proxy: {
        '/api': 'http://localhost:5005',
        '/uploads': 'http://localhost:5005',
        '/socket': {
          target: 'ws://localhost:5005',
          ws: true,
        },
      },
    },
  };
});
