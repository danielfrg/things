import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { tags, taskTags } from '@/db/schema';
import type {
  InsertTag,
  TagRecord,
  TaskTagRecord,
  UpdateTag,
} from '@/db/validation';
import { auth } from '@/lib/auth';

async function getUserId(): Promise<string> {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session.user.id;
}

export const getTags = createServerFn({ method: 'GET' }).handler(
  async (): Promise<TagRecord[]> => {
    const userId = await getUserId();
    return await db.select().from(tags).where(eq(tags.userId, userId));
  },
);

export const getTag = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<TagRecord | undefined> => {
    const userId = await getUserId();
    const [tag] = await db
      .select()
      .from(tags)
      .where(and(eq(tags.id, data.id), eq(tags.userId, userId)));
    return tag;
  });

export const createTag = createServerFn({ method: 'POST' })
  .inputValidator((data: Omit<InsertTag, 'userId'> & { id?: string }) => data)
  .handler(async ({ data }) => {
    const userId = await getUserId();
    const [tag] = await db
      .insert(tags)
      .values({ ...data, userId })
      .returning();
    return { tag, txid: Date.now() };
  });

export const updateTag = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string; changes: UpdateTag }) => data)
  .handler(async ({ data }) => {
    const userId = await getUserId();
    const [tag] = await db
      .update(tags)
      .set({ ...data.changes, updatedAt: new Date() })
      .where(and(eq(tags.id, data.id), eq(tags.userId, userId)))
      .returning();
    return { tag, txid: Date.now() };
  });

export const deleteTag = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const userId = await getUserId();
    await db
      .delete(tags)
      .where(and(eq(tags.id, data.id), eq(tags.userId, userId)));
    return { success: true, txid: Date.now() };
  });

// Task-Tag associations
export const getTaskTags = createServerFn({ method: 'GET' }).handler(
  async (): Promise<TaskTagRecord[]> => {
    const userId = await getUserId();
    return await db.select().from(taskTags).where(eq(taskTags.userId, userId));
  },
);

export const addTagToTask = createServerFn({ method: 'POST' })
  .inputValidator((data: { taskId: string; tagId: string }) => data)
  .handler(async ({ data }) => {
    const userId = await getUserId();
    const [taskTag] = await db
      .insert(taskTags)
      .values({ taskId: data.taskId, tagId: data.tagId, userId })
      .returning();
    return { taskTag, txid: Date.now() };
  });

export const removeTagFromTask = createServerFn({ method: 'POST' })
  .inputValidator((data: { taskId: string; tagId: string }) => data)
  .handler(async ({ data }) => {
    const userId = await getUserId();
    await db
      .delete(taskTags)
      .where(
        and(
          eq(taskTags.taskId, data.taskId),
          eq(taskTags.tagId, data.tagId),
          eq(taskTags.userId, userId),
        ),
      );
    return { success: true, txid: Date.now() };
  });
