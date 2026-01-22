import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { areas } from '@/db/schema';
import type { AreaRecord, InsertArea, UpdateArea } from '@/db/validation';
import { auth } from '@/lib/auth';

async function getUserId(): Promise<string> {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session.user.id;
}

export const getAreas = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AreaRecord[]> => {
    const userId = await getUserId();
    return await db.select().from(areas).where(eq(areas.userId, userId));
  },
);

export const getArea = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<AreaRecord | undefined> => {
    const userId = await getUserId();
    const [area] = await db
      .select()
      .from(areas)
      .where(and(eq(areas.id, data.id), eq(areas.userId, userId)));
    return area;
  });

export const createArea = createServerFn({ method: 'POST' })
  .inputValidator((data: Omit<InsertArea, 'userId'> & { id?: string }) => data)
  .handler(async ({ data }) => {
    const userId = await getUserId();
    const [area] = await db
      .insert(areas)
      .values({ ...data, userId })
      .returning();
    return { area, txid: Date.now() };
  });

export const updateArea = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string; changes: UpdateArea }) => data)
  .handler(async ({ data }) => {
    const userId = await getUserId();
    const [area] = await db
      .update(areas)
      .set({ ...data.changes, updatedAt: new Date() })
      .where(and(eq(areas.id, data.id), eq(areas.userId, userId)))
      .returning();
    return { area, txid: Date.now() };
  });

export const deleteArea = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const userId = await getUserId();
    await db
      .delete(areas)
      .where(and(eq(areas.id, data.id), eq(areas.userId, userId)));
    return { success: true, txid: Date.now() };
  });
