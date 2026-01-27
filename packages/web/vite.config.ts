import { execSync } from 'node:child_process';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import viteTsConfigPaths from 'vite-tsconfig-paths';

function getVersion() {
  try {
    const count = execSync('git rev-list --count main', {
      encoding: 'utf-8',
    }).trim();
    const hash = execSync('git rev-parse --short HEAD', {
      encoding: 'utf-8',
    }).trim();
    return `v${count} - ${hash}`;
  } catch {
    return 'dev';
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  ssr: { external: ['drizzle-orm'] },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.APP_VERSION || getVersion()),
  },
  plugins: [
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart({
      srcDirectory: '.',
      start: { entry: './start.tsx' },
      server: { entry: './server.ts' },
    }),
    react(),
  ],
});
