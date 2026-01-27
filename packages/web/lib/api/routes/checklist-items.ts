import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { checklistItems, tasks } from '@/db/schema';
import type { AuthContext } from '../middleware/auth';
import { requireWriteScope } from '../middleware/auth';
import {
  ChecklistItemSchema,
  CreateChecklistItemSchema,
  ErrorSchema,
  SuccessSchema,
  UpdateChecklistItemSchema,
} from '../schemas';

const app = new OpenAPIHono<AuthContext>();

const TaskIdParams = z.object({ taskId: z.string() });
const ItemIdParams = z.object({ taskId: z.string(), id: z.string() });

// GET /tasks/:taskId/checklist
app.openapi(
  createRoute({
    method: 'get',
    path: '/',
    tags: ['Checklist Items'],
    summary: 'List checklist items for a task',
    security: [{ bearerAuth: [] }],
    request: { params: TaskIdParams },
    responses: {
      200: {
        description: 'List of checklist items',
        content: { 'application/json': { schema: z.array(ChecklistItemSchema) } },
      },
      404: {
        description: 'Task not found',
        content: { 'application/json': { schema: ErrorSchema } },
      },
    },
  }),
  async (c) => {
    const userId = c.get('userId');
    const { taskId } = c.req.valid('param');

    // Verify task exists and belongs to user
    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));

    if (!task) {
      return c.json({ error: 'Task not found' }, 404);
    }

    const result = await db
      .select()
      .from(checklistItems)
      .where(
        and(eq(checklistItems.taskId, taskId), eq(checklistItems.userId, userId)),
      )
      .orderBy(checklistItems.position);

    const formatted = result.map((item) => ({
      id: item.id,
      title: item.title,
      completed: item.completed,
      position: item.position,
      taskId: item.taskId,
      createdAt: item.createdAt.toISOString(),
    }));

    return c.json(formatted, 200);
  },
);

// POST /tasks/:taskId/checklist
app.openapi(
  createRoute({
    method: 'post',
    path: '/',
    tags: ['Checklist Items'],
    summary: 'Create a checklist item',
    security: [{ bearerAuth: [] }],
    request: {
      params: TaskIdParams,
      body: {
        required: true,
        content: { 'application/json': { schema: CreateChecklistItemSchema } },
      },
    },
    responses: {
      201: {
        description: 'Checklist item created',
        content: { 'application/json': { schema: ChecklistItemSchema } },
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
    const { taskId } = c.req.valid('param');
    const body = c.req.valid('json');

    // Verify task exists and belongs to user
    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));

    if (!task) {
      return c.json({ error: 'Task not found' }, 404);
    }

    const [item] = await db
      .insert(checklistItems)
      .values({
        userId,
        taskId,
        title: body.title,
        completed: body.completed ?? false,
        position: body.position ?? 0,
      })
      .returning();

    return c.json(
      {
        id: item.id,
        title: item.title,
        completed: item.completed,
        position: item.position,
        taskId: item.taskId,
        createdAt: item.createdAt.toISOString(),
      },
      201,
    );
  },
);

// GET /tasks/:taskId/checklist/:id
app.openapi(
  createRoute({
    method: 'get',
    path: '/{id}',
    tags: ['Checklist Items'],
    summary: 'Get a checklist item by ID',
    security: [{ bearerAuth: [] }],
    request: { params: ItemIdParams },
    responses: {
      200: {
        description: 'Checklist item details',
        content: { 'application/json': { schema: ChecklistItemSchema } },
      },
      404: {
        description: 'Checklist item not found',
        content: { 'application/json': { schema: ErrorSchema } },
      },
    },
  }),
  async (c) => {
    const userId = c.get('userId');
    const { taskId, id } = c.req.valid('param');

    const [item] = await db
      .select()
      .from(checklistItems)
      .where(
        and(
          eq(checklistItems.id, id),
          eq(checklistItems.taskId, taskId),
          eq(checklistItems.userId, userId),
        ),
      );

    if (!item) {
      return c.json({ error: 'Checklist item not found' }, 404);
    }

    return c.json(
      {
        id: item.id,
        title: item.title,
        completed: item.completed,
        position: item.position,
        taskId: item.taskId,
        createdAt: item.createdAt.toISOString(),
      },
      200,
    );
  },
);

// PUT /tasks/:taskId/checklist/:id
app.openapi(
  createRoute({
    method: 'put',
    path: '/{id}',
    tags: ['Checklist Items'],
    summary: 'Update a checklist item',
    security: [{ bearerAuth: [] }],
    request: {
      params: ItemIdParams,
      body: {
        required: true,
        content: { 'application/json': { schema: UpdateChecklistItemSchema } },
      },
    },
    responses: {
      200: {
        description: 'Checklist item updated',
        content: { 'application/json': { schema: ChecklistItemSchema } },
      },
      403: {
        description: 'Forbidden',
        content: { 'application/json': { schema: ErrorSchema } },
      },
      404: {
        description: 'Checklist item not found',
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
    const { taskId, id } = c.req.valid('param');
    const body = c.req.valid('json');

    const [item] = await db
      .update(checklistItems)
      .set({ ...body, updatedAt: new Date() })
      .where(
        and(
          eq(checklistItems.id, id),
          eq(checklistItems.taskId, taskId),
          eq(checklistItems.userId, userId),
        ),
      )
      .returning();

    if (!item) {
      return c.json({ error: 'Checklist item not found' }, 404);
    }

    return c.json(
      {
        id: item.id,
        title: item.title,
        completed: item.completed,
        position: item.position,
        taskId: item.taskId,
        createdAt: item.createdAt.toISOString(),
      },
      200,
    );
  },
);

// DELETE /tasks/:taskId/checklist/:id
app.openapi(
  createRoute({
    method: 'delete',
    path: '/{id}',
    tags: ['Checklist Items'],
    summary: 'Delete a checklist item',
    security: [{ bearerAuth: [] }],
    request: { params: ItemIdParams },
    responses: {
      200: {
        description: 'Checklist item deleted',
        content: { 'application/json': { schema: SuccessSchema } },
      },
      403: {
        description: 'Forbidden',
        content: { 'application/json': { schema: ErrorSchema } },
      },
      404: {
        description: 'Checklist item not found',
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
    const { taskId, id } = c.req.valid('param');

    const result = await db
      .delete(checklistItems)
      .where(
        and(
          eq(checklistItems.id, id),
          eq(checklistItems.taskId, taskId),
          eq(checklistItems.userId, userId),
        ),
      )
      .returning();

    if (result.length === 0) {
      return c.json({ error: 'Checklist item not found' }, 404);
    }

    return c.json({ success: true, message: 'Checklist item deleted' }, 200);
  },
);

export default app;
