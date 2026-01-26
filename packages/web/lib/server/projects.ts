import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { headings, projects } from '@/db/schema';
import type {
  InsertProject,
  ProjectRecord,
  UpdateProject,
} from '@/db/validation';
import { auth } from '@/lib/auth';

async function getUserId(): Promise<string> {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session.user.id;
}

export const getProjects = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ProjectRecord[]> => {
    const userId = await getUserId();
    return await db.select().from(projects).where(eq(projects.userId, userId));
  },
);

export const getProject = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<ProjectRecord | undefined> => {
    const userId = await getUserId();
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, data.id), eq(projects.userId, userId)));
    return project;
  });

export const createProject = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: Omit<InsertProject, 'userId'> & { id?: string }) => data,
  )
  .handler(async ({ data }) => {
    const userId = await getUserId();
    const [project] = await db
      .insert(projects)
      .values({ ...data, userId })
      .returning();
    // Auto-create backlog heading for the new project
    await db.insert(headings).values({
      userId,
      title: 'Backlog',
      position: 9999,
      isBacklog: true,
      projectId: project.id,
    });
    return { project, txid: Date.now() };
  });

export const updateProject = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string; changes: UpdateProject }) => data)
  .handler(async ({ data }) => {
    const userId = await getUserId();
    const [project] = await db
      .update(projects)
      .set({ ...data.changes, updatedAt: new Date() })
      .where(and(eq(projects.id, data.id), eq(projects.userId, userId)))
      .returning();
    return { project, txid: Date.now() };
  });

export const deleteProject = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const userId = await getUserId();
    await db
      .delete(projects)
      .where(and(eq(projects.id, data.id), eq(projects.userId, userId)));
    return { success: true, txid: Date.now() };
  });
