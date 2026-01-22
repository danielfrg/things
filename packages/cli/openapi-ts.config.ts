import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: 'http://localhost:3000/api/openapi.json',
  output: {
    path: './generated',
  },
  plugins: ['@hey-api/client-fetch', '@hey-api/sdk', '@hey-api/typescript'],
});
