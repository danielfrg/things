import { createFileRoute } from '@tanstack/react-router';
import { api } from '@/lib/api';

async function handleApiRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  // Remove /api prefix since our Hono app expects routes like /health, /v1/tasks, etc.
  const path = url.pathname.replace(/^\/api/, '') || '/';
  const newUrl = new URL(`${url.origin}${path}${url.search}`);

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  const newRequest = new Request(newUrl.toString(), {
    method: request.method,
    headers: request.headers,
    body: hasBody ? request.body : undefined,
    // @ts-expect-error Node.js requires duplex option for streaming body
    duplex: hasBody ? 'half' : undefined,
  });

  return api.fetch(newRequest);
}

export const Route = createFileRoute('/api/$')({
  server: {
    handlers: {
      GET: async ({ request }) => handleApiRequest(request),
      POST: async ({ request }) => handleApiRequest(request),
      PUT: async ({ request }) => handleApiRequest(request),
      DELETE: async ({ request }) => handleApiRequest(request),
      PATCH: async ({ request }) => handleApiRequest(request),
    },
  },
});
