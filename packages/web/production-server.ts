#!/usr/bin/env bun
/**
 * Production server for Bun
 * Serves static assets and handles SSR
 */

const CLIENT_DIR = `${import.meta.dir}/dist/client`;
const SERVER_ENTRY = `${import.meta.dir}/dist/server/server.js`;

// Import the server handler
const serverModule = await import(SERVER_ENTRY);
const handler = serverModule.default;

const server = Bun.serve({
  port: process.env.PORT || 3000,
  async fetch(req) {
    const url = new URL(req.url);

    // Serve static files from dist/client
    if (
      url.pathname.startsWith('/assets/') ||
      url.pathname === '/manifest.json' ||
      url.pathname === '/robots.txt' ||
      url.pathname === '/sw.js' ||
      url.pathname.match(/\.(png|jpg|svg|ico|webp)$/)
    ) {
      const filePath = CLIENT_DIR + url.pathname;
      const file = Bun.file(filePath);

      if (await file.exists()) {
        return new Response(file, {
          headers: {
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }
    }

    // Otherwise, handle with SSR
    return handler.fetch(req);
  },
});

console.log(`Started server: http://localhost:${server.port}`);
