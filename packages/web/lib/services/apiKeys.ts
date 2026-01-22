import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import type { ApiKey } from '@/db/schema';
import { apiKeys } from '@/db/schema';

// =============================================================================
// Helper Functions
// =============================================================================

function generateApiKey(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  const key = Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `sk_live_${key}`;
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// =============================================================================
// Types
// =============================================================================

export type ApiKeyInfo = Pick<
  ApiKey,
  'id' | 'name' | 'keyPrefix' | 'scope' | 'lastUsedAt' | 'createdAt'
>;

export type CreateApiKeyResult = {
  keyId: string;
  key: string;
  keyPrefix: string;
  name: string;
  scope: 'read' | 'read-write';
};

export type ValidateApiKeyResult =
  | { valid: true; scope: 'read' | 'read-write'; keyId: string; userId: string }
  | { valid: false; scope: null; userId: null };

// =============================================================================
// Queries
// =============================================================================

export async function listApiKeys(userId: string): Promise<ApiKeyInfo[]> {
  const keys = (await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))) as ApiKey[];
  return keys.map((key) => ({
    id: key.id,
    name: key.name,
    keyPrefix: key.keyPrefix,
    scope: key.scope,
    lastUsedAt: key.lastUsedAt,
    createdAt: key.createdAt,
  }));
}

// =============================================================================
// Mutations
// =============================================================================

export async function createApiKey(
  userId: string,
  name: string,
  scope: 'read' | 'read-write',
): Promise<CreateApiKeyResult> {
  const plaintextKey = generateApiKey();
  const keyHash = await hashKey(plaintextKey);
  const keyPrefix = plaintextKey.substring(0, 12);

  const [inserted] = await db
    .insert(apiKeys)
    .values({ userId, name, keyHash, keyPrefix, scope })
    .returning({ id: apiKeys.id });

  return {
    keyId: inserted.id,
    key: plaintextKey,
    keyPrefix,
    name,
    scope,
  };
}

export async function validateApiKey(
  key: string,
): Promise<ValidateApiKeyResult> {
  const keyHash = await hashKey(key);
  const [apiKey] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, keyHash));

  if (!apiKey) {
    return { valid: false, scope: null, userId: null };
  }

  // Update last used timestamp
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, apiKey.id));

  return {
    valid: true,
    scope: apiKey.scope,
    keyId: apiKey.id,
    userId: apiKey.userId,
  };
}

export async function removeApiKey(
  keyId: string,
  userId: string,
): Promise<{ success: boolean }> {
  await db
    .delete(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)));
  return { success: true };
}
