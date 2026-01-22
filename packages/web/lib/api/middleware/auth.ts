import type { Context, Next } from 'hono';
import { validateApiKey } from '@/lib/services/apiKeys';

export type AuthContext = {
  Variables: {
    scope: 'read' | 'read-write';
    keyId: string;
    userId: string;
  };
};

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader) {
    return c.json({ error: 'Missing Authorization header' }, 401);
  }

  if (!authHeader.startsWith('Bearer ')) {
    return c.json(
      { error: 'Invalid Authorization header format. Use: Bearer <api_key>' },
      401,
    );
  }

  const apiKey = authHeader.slice(7);

  if (!apiKey || !(apiKey.startsWith('sk_') || apiKey.startsWith('tk_'))) {
    return c.json({ error: 'Invalid API key format' }, 401);
  }

  const validation = await validateApiKey(apiKey);

  if (!validation.valid) {
    return c.json({ error: 'Invalid or expired API key' }, 401);
  }

  c.set('scope', validation.scope);
  c.set('keyId', validation.keyId);
  c.set('userId', validation.userId);

  await next();
}

export function requireWriteScope(c: Context): boolean {
  const scope = c.get('scope');
  return scope === 'read-write';
}
