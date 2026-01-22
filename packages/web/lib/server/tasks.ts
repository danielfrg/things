import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { tasks } from '@/db/schema';
import type { InsertTask, TaskRecord, UpdateTask } from '@/db/validation';
import { auth } from '@/lib/auth';
import {
  setRepeatingRuleNextOccurrenceFromDate,
  updateTemplateFromTask,
} from '@/lib/services/repeatingRules';

async function getUserId(): Promise<string> {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session.user.id;
}

export const getTasks = createServerFn({ method: 'GET' }).handler(
  async (): Promise<TaskRecord[]> => {
    const userId = await getUserId();
    return await db.select().from(tasks).where(eq(tasks.userId, userId));
  },
);

export const getTask = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<TaskRecord | undefined> => {
    const userId = await getUserId();
    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, data.id), eq(tasks.userId, userId)));
    return task;
  });

export const createTask = createServerFn({ method: 'POST' })
  .inputValidator((data: Omit<InsertTask, 'userId'> & { id?: string }) => data)
  .handler(async ({ data }) => {
    const userId = await getUserId();
    const [task] = await db
      .insert(tasks)
      .values({ ...data, userId })
      .returning();
    return { task, txid: Date.now() };
  });

export const updateTask = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string; changes: UpdateTask }) => data)
  .handler(async ({ data }) => {
    const userId = await getUserId();
    const [current] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, data.id), eq(tasks.userId, userId)));

    if (!current) throw new Error('Task not found');

    const isCompletingRepeating =
      data.changes.status === 'completed' && Boolean(current?.repeatingRuleId);

    if (isCompletingRepeating && current?.repeatingRuleId) {
      const now = new Date();
      const afterDate = `${now.getFullYear()}-${String(
        now.getMonth() + 1,
      ).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      await updateTemplateFromTask(data.id);
      await setRepeatingRuleNextOccurrenceFromDate(current.repeatingRuleId, {
        afterDate,
      });
    }

    const changes = isCompletingRepeating
      ? { ...data.changes, repeatingRuleId: null }
      : data.changes;

    const [task] = await db
      .update(tasks)
      .set({ ...changes, updatedAt: new Date() })
      .where(and(eq(tasks.id, data.id), eq(tasks.userId, userId)))
      .returning();

    return { task, txid: Date.now() };
  });

export const deleteTask = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const userId = await getUserId();
    await db
      .delete(tasks)
      .where(and(eq(tasks.id, data.id), eq(tasks.userId, userId)));
    return { success: true, txid: Date.now() };
  });
