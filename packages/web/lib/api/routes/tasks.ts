import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { tasks } from '@/db/schema';
import type { AuthContext } from '../middleware/auth';
import { requireWriteScope } from '../middleware/auth';
import {
  CompleteTaskSchema,
  CreateTaskSchema,
  ErrorSchema,
  SuccessSchema,
  TaskSchema,
  UpdateTaskSchema,
} from '../schemas';

const app = new OpenAPIHono<AuthContext>();

const TaskIdParams = z.object({ id: z.string() });

// GET /tasks
app.openapi(
  createRoute({
    method: 'get',
    path: '/',
    tags: ['Tasks'],
    summary: 'List all tasks',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'List of tasks',
        content: { 'application/json': { schema: z.array(TaskSchema) } },
      },
    },
  }),
  async (c) => {
    const userId = c.get('userId');
    const result = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), isNull(tasks.trashedAt)));
    const formatted = result.map((t) => ({
      id: t.id,
      title: t.title,
      notes: t.notes,
      status: t.status,
      type: t.type,
      scheduledDate: t.scheduledDate,
      deadline: t.deadline,
      position: t.position,
      projectId: t.projectId,
      headingId: t.headingId,
      areaId: t.areaId,
      completedAt: t.completedAt?.toISOString() ?? null,
      trashedAt: t.trashedAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
    }));
    return c.json(formatted, 200);
  },
);

// POST /tasks
app.openapi(
  createRoute({
    method: 'post',
    path: '/',
    tags: ['Tasks'],
    summary: 'Create a new task',
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        required: true,
        content: { 'application/json': { schema: CreateTaskSchema } },
      },
    },
    responses: {
      201: {
        description: 'Task created',
        content: { 'application/json': { schema: TaskSchema } },
      },
      403: {
        description: 'Forbidden',
        content: { 'application/json': { schema: ErrorSchema } },
      },
    },
  }),
  async (c) => {
    if (!requireWriteScope(c)) {
      return c.json(
        { error: 'Forbidden - API key does not have write permission' },
        403,
      );
    }

    const userId = c.get('userId');
    const body = c.req.valid('json');
    const [task] = await db
      .insert(tasks)
      .values({
        userId,
        title: body.title,
        notes: body.notes,
        status: body.status,
        scheduledDate: body.scheduledDate,
        deadline: body.deadline,
        projectId: body.projectId,
        headingId: body.headingId,
        areaId: body.areaId,
        position: body.position ?? 0,
      })
      .returning();

    return c.json(
      {
        id: task.id,
        title: task.title,
        notes: task.notes,
        status: task.status,
        type: task.type,
        scheduledDate: task.scheduledDate,
        deadline: task.deadline,
        position: task.position,
        projectId: task.projectId,
        headingId: task.headingId,
        areaId: task.areaId,
        completedAt: task.completedAt?.toISOString() ?? null,
        trashedAt: task.trashedAt?.toISOString() ?? null,
        createdAt: task.createdAt.toISOString(),
      },
      201,
    );
  },
);

// GET /tasks/:id
app.openapi(
  createRoute({
    method: 'get',
    path: '/{id}',
    tags: ['Tasks'],
    summary: 'Get a task by ID',
    security: [{ bearerAuth: [] }],
    request: { params: TaskIdParams },
    responses: {
      200: {
        description: 'Task details',
        content: { 'application/json': { schema: TaskSchema } },
      },
      404: {
        description: 'Task not found',
        content: { 'application/json': { schema: ErrorSchema } },
      },
    },
  }),
  async (c) => {
    const userId = c.get('userId');
    const { id } = c.req.valid('param');
    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));

    if (!task) {
      return c.json({ error: 'Task not found' }, 404);
    }

    return c.json(
      {
        id: task.id,
        title: task.title,
        notes: task.notes,
        status: task.status,
        type: task.type,
        scheduledDate: task.scheduledDate,
        deadline: task.deadline,
        position: task.position,
        projectId: task.projectId,
        headingId: task.headingId,
        areaId: task.areaId,
        completedAt: task.completedAt?.toISOString() ?? null,
        trashedAt: task.trashedAt?.toISOString() ?? null,
        createdAt: task.createdAt.toISOString(),
      },
      200,
    );
  },
);

// PUT /tasks/:id
app.openapi(
  createRoute({
    method: 'put',
    path: '/{id}',
    tags: ['Tasks'],
    summary: 'Update a task',
    security: [{ bearerAuth: [] }],
    request: {
      params: TaskIdParams,
      body: {
        required: true,
        content: { 'application/json': { schema: UpdateTaskSchema } },
      },
    },
    responses: {
      200: {
        description: 'Task updated',
        content: { 'application/json': { schema: TaskSchema } },
      },
      403: {
        description: 'Forbidden',
        content: { 'application/json': { schema: ErrorSchema } },
      },
      404: {
        description: 'Task not found',
        content: { 'application/json': { schema: ErrorSchema } },
      },
    },
  }),
  async (c) => {
    if (!requireWriteScope(c)) {
      return c.json(
        { error: 'Forbidden - API key does not have write permission' },
        403,
      );
    }

    const userId = c.get('userId');
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');

    const [task] = await db
      .update(tasks)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();

    if (!task) {
      return c.json({ error: 'Task not found' }, 404);
    }

    return c.json(
      {
        id: task.id,
        title: task.title,
        notes: task.notes,
        status: task.status,
        type: task.type,
        scheduledDate: task.scheduledDate,
        deadline: task.deadline,
        position: task.position,
        projectId: task.projectId,
        headingId: task.headingId,
        areaId: task.areaId,
        completedAt: task.completedAt?.toISOString() ?? null,
        trashedAt: task.trashedAt?.toISOString() ?? null,
        createdAt: task.createdAt.toISOString(),
      },
      200,
    );
  },
);

// DELETE /tasks/:id (trash)
app.openapi(
  createRoute({
    method: 'delete',
    path: '/{id}',
    tags: ['Tasks'],
    summary: 'Trash a task',
    security: [{ bearerAuth: [] }],
    request: { params: TaskIdParams },
    responses: {
      200: {
        description: 'Task trashed',
        content: { 'application/json': { schema: SuccessSchema } },
      },
      403: {
        description: 'Forbidden',
        content: { 'application/json': { schema: ErrorSchema } },
      },
      404: {
        description: 'Task not found',
        content: { 'application/json': { schema: ErrorSchema } },
      },
    },
  }),
  async (c) => {
    if (!requireWriteScope(c)) {
      return c.json(
        { error: 'Forbidden - API key does not have write permission' },
        403,
      );
    }

    const userId = c.get('userId');
    const { id } = c.req.valid('param');
    const [task] = await db
      .update(tasks)
      .set({ status: 'trashed', trashedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();

    if (!task) {
      return c.json({ error: 'Task not found' }, 404);
    }

    return c.json({ success: true, message: 'Task moved to trash' }, 200);
  },
);

// POST /tasks/:id/complete
app.openapi(
  createRoute({
    method: 'post',
    path: '/{id}/complete',
    tags: ['Tasks'],
    summary: 'Toggle task completion',
    security: [{ bearerAuth: [] }],
    request: {
      params: TaskIdParams,
      body: {
        required: true,
        content: { 'application/json': { schema: CompleteTaskSchema } },
      },
    },
    responses: {
      200: {
        description: 'Task updated',
        content: { 'application/json': { schema: TaskSchema } },
      },
      403: {
        description: 'Forbidden',
        content: { 'application/json': { schema: ErrorSchema } },
      },
      404: {
        description: 'Task not found',
        content: { 'application/json': { schema: ErrorSchema } },
      },
    },
  }),
  async (c) => {
    if (!requireWriteScope(c)) {
      return c.json(
        { error: 'Forbidden - API key does not have write permission' },
        403,
      );
    }

    const userId = c.get('userId');
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');

    const [task] = await db
      .update(tasks)
      .set({
        status: body.completed ? 'completed' : 'inbox',
        completedAt: body.completed ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();

    if (!task) {
      return c.json({ error: 'Task not found' }, 404);
    }

    return c.json(
      {
        id: task.id,
        title: task.title,
        notes: task.notes,
        status: task.status,
        type: task.type,
        scheduledDate: task.scheduledDate,
        deadline: task.deadline,
        position: task.position,
        projectId: task.projectId,
        headingId: task.headingId,
        areaId: task.areaId,
        completedAt: task.completedAt?.toISOString() ?? null,
        trashedAt: task.trashedAt?.toISOString() ?? null,
        createdAt: task.createdAt.toISOString(),
      },
      200,
    );
  },
);

// POST /tasks/:id/restore
app.openapi(
  createRoute({
    method: 'post',
    path: '/{id}/restore',
    tags: ['Tasks'],
    summary: 'Restore task from trash',
    security: [{ bearerAuth: [] }],
    request: { params: TaskIdParams },
    responses: {
      200: {
        description: 'Task restored',
        content: { 'application/json': { schema: TaskSchema } },
      },
      403: {
        description: 'Forbidden',
        content: { 'application/json': { schema: ErrorSchema } },
      },
      404: {
        description: 'Task not found',
        content: { 'application/json': { schema: ErrorSchema } },
      },
    },
  }),
  async (c) => {
    if (!requireWriteScope(c)) {
      return c.json(
        { error: 'Forbidden - API key does not have write permission' },
        403,
      );
    }

    const userId = c.get('userId');
    const { id } = c.req.valid('param');
    const [task] = await db
      .update(tasks)
      .set({ status: 'inbox', trashedAt: null, updatedAt: new Date() })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();

    if (!task) {
      return c.json({ error: 'Task not found' }, 404);
    }

    return c.json(
      {
        id: task.id,
        title: task.title,
        notes: task.notes,
        status: task.status,
        type: task.type,
        scheduledDate: task.scheduledDate,
        deadline: task.deadline,
        position: task.position,
        projectId: task.projectId,
        headingId: task.headingId,
        areaId: task.areaId,
        completedAt: task.completedAt?.toISOString() ?? null,
        trashedAt: task.trashedAt?.toISOString() ?? null,
        createdAt: task.createdAt.toISOString(),
      },
      200,
    );
  },
);

// DELETE /tasks/:id/permanent
app.openapi(
  createRoute({
    method: 'delete',
    path: '/{id}/permanent',
    tags: ['Tasks'],
    summary: 'Permanently delete a task',
    security: [{ bearerAuth: [] }],
    request: { params: TaskIdParams },
    responses: {
      200: {
        description: 'Task deleted',
        content: { 'application/json': { schema: SuccessSchema } },
      },
      403: {
        description: 'Forbidden',
        content: { 'application/json': { schema: ErrorSchema } },
      },
      404: {
        description: 'Task not found',
        content: { 'application/json': { schema: ErrorSchema } },
      },
    },
  }),
  async (c) => {
    if (!requireWriteScope(c)) {
      return c.json(
        { error: 'Forbidden - API key does not have write permission' },
        403,
      );
    }

    const userId = c.get('userId');
    const { id } = c.req.valid('param');
    const result = await db
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();

    if (result.length === 0) {
      return c.json({ error: 'Task not found' }, 404);
    }

    return c.json({ success: true, message: 'Task permanently deleted' }, 200);
  },
);

export default app;
