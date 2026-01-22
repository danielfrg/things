import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { headings } from '@/db/schema';
import type {
  HeadingRecord,
  InsertHeading,
  UpdateHeading,
} from '@/db/validation';
import { auth } from '@/lib/auth';

async function getUserId(): Promise<string> {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session.user.id;
}

export const getHeadings = createServerFn({ method: 'GET' }).handler(
  async (): Promise<HeadingRecord[]> => {
    const userId = await getUserId();
    return await db.select().from(headings).where(eq(headings.userId, userId));
  },
);

export const getHeading = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<HeadingRecord | undefined> => {
    const userId = await getUserId();
    const [heading] = await db
      .select()
      .from(headings)
      .where(and(eq(headings.id, data.id), eq(headings.userId, userId)));
    return heading;
  });

export const createHeading = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: Omit<InsertHeading, 'userId'> & { id?: string }) => data,
  )
  .handler(async ({ data }) => {
    const userId = await getUserId();
    const [heading] = await db
      .insert(headings)
      .values({ ...data, userId })
      .returning();
    return { heading, txid: Date.now() };
  });

export const updateHeading = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string; changes: UpdateHeading }) => data)
  .handler(async ({ data }) => {
    const userId = await getUserId();
    const [heading] = await db
      .update(headings)
      .set({ ...data.changes, updatedAt: new Date() })
      .where(and(eq(headings.id, data.id), eq(headings.userId, userId)))
      .returning();
    return { heading, txid: Date.now() };
  });

export const deleteHeading = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const userId = await getUserId();
    await db
      .delete(headings)
      .where(and(eq(headings.id, data.id), eq(headings.userId, userId)));
    return { success: true, txid: Date.now() };
  });
