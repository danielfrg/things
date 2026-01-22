import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { apiKeys } from '@/db/schema';
import type { ApiKeyRecord } from '@/db/validation';
import { auth } from '@/lib/auth';
import {
  createApiKey as createKey,
  removeApiKey as removeKey,
} from '@/lib/services/apiKeys';

async function getUserId(): Promise<string> {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session.user.id;
}

export const getApiKeys = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ApiKeyRecord[]> => {
    const userId = await getUserId();
    return await db.select().from(apiKeys).where(eq(apiKeys.userId, userId));
  },
);

export const createApiKey = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { name: string; scope: 'read' | 'read-write' }) => data,
  )
  .handler(async ({ data }) => {
    const userId = await getUserId();
    return await createKey(userId, data.name, data.scope);
  });

export const deleteApiKey = createServerFn({ method: 'POST' })
  .inputValidator((data: { keyId: string }) => data)
  .handler(async ({ data }) => {
    const userId = await getUserId();
    await removeKey(data.keyId, userId);
    return { success: true, txid: Date.now() };
  });
