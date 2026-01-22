import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { checklistItems } from '@/db/schema';
import type {
  ChecklistItemRecord,
  InsertChecklistItem,
  UpdateChecklistItem,
} from '@/db/validation';
import { auth } from '@/lib/auth';

async function getUserId(): Promise<string> {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session.user.id;
}

export const getChecklistItems = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ChecklistItemRecord[]> => {
    const userId = await getUserId();
    return await db
      .select()
      .from(checklistItems)
      .where(eq(checklistItems.userId, userId));
  },
);

export const getChecklistItemsByTask = createServerFn({ method: 'GET' })
  .inputValidator((data: { taskId: string }) => data)
  .handler(async ({ data }): Promise<ChecklistItemRecord[]> => {
    const userId = await getUserId();
    return await db
      .select()
      .from(checklistItems)
      .where(
        and(
          eq(checklistItems.taskId, data.taskId),
          eq(checklistItems.userId, userId),
        ),
      );
  });

export const createChecklistItem = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: Omit<InsertChecklistItem, 'userId'> & { id?: string }) => data,
  )
  .handler(async ({ data }) => {
    const userId = await getUserId();
    const [item] = await db
      .insert(checklistItems)
      .values({ ...data, userId })
      .returning();
    return { item, txid: Date.now() };
  });

export const updateChecklistItem = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string; changes: UpdateChecklistItem }) => data)
  .handler(async ({ data }) => {
    const userId = await getUserId();
    const [item] = await db
      .update(checklistItems)
      .set({ ...data.changes, updatedAt: new Date() })
      .where(
        and(eq(checklistItems.id, data.id), eq(checklistItems.userId, userId)),
      )
      .returning();
    return { item, txid: Date.now() };
  });

export const deleteChecklistItem = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const userId = await getUserId();
    await db
      .delete(checklistItems)
      .where(
        and(eq(checklistItems.id, data.id), eq(checklistItems.userId, userId)),
      );
    return { success: true, txid: Date.now() };
  });
