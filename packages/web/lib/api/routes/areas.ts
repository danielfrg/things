import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { areas } from '@/db/schema';
import type { AuthContext } from '../middleware/auth';
import { requireWriteScope } from '../middleware/auth';
import {
  AreaSchema,
  CreateAreaSchema,
  ErrorSchema,
  SuccessSchema,
  UpdateAreaSchema,
} from '../schemas';

const app = new OpenAPIHono<AuthContext>();

const AreaIdParams = z.object({ id: z.string() });

// GET /areas
app.openapi(
  createRoute({
    method: 'get',
    path: '/',
    tags: ['Areas'],
    summary: 'List all areas',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'List of areas',
        content: { 'application/json': { schema: z.array(AreaSchema) } },
      },
    },
  }),
  async (c) => {
    const userId = c.get('userId');
    const result = await db
      .select()
      .from(areas)
      .where(and(eq(areas.userId, userId), isNull(areas.deletedAt)));
    const formatted = result.map((a) => ({
      id: a.id,
      title: a.title,
      position: a.position,
      createdAt: a.createdAt.toISOString(),
    }));
    return c.json(formatted, 200);
  },
);

// POST /areas
app.openapi(
  createRoute({
    method: 'post',
    path: '/',
    tags: ['Areas'],
    summary: 'Create a new area',
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        required: true,
        content: { 'application/json': { schema: CreateAreaSchema } },
      },
    },
    responses: {
      201: {
        description: 'Area created',
        content: { 'application/json': { schema: AreaSchema } },
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
    const [area] = await db
      .insert(areas)
      .values({
        userId,
        title: body.title,
        position: body.position ?? 0,
      })
      .returning();

    return c.json(
      {
        id: area.id,
        title: area.title,
        position: area.position,
        createdAt: area.createdAt.toISOString(),
      },
      201,
    );
  },
);

// GET /areas/:id
app.openapi(
  createRoute({
    method: 'get',
    path: '/{id}',
    tags: ['Areas'],
    summary: 'Get an area by ID',
    security: [{ bearerAuth: [] }],
    request: { params: AreaIdParams },
    responses: {
      200: {
        description: 'Area details',
        content: { 'application/json': { schema: AreaSchema } },
      },
      404: {
        description: 'Area not found',
        content: { 'application/json': { schema: ErrorSchema } },
      },
    },
  }),
  async (c) => {
    const userId = c.get('userId');
    const { id } = c.req.valid('param');
    const [area] = await db
      .select()
      .from(areas)
      .where(and(eq(areas.id, id), eq(areas.userId, userId)));

    if (!area) {
      return c.json({ error: 'Area not found' }, 404);
    }

    return c.json(
      {
        id: area.id,
        title: area.title,
        position: area.position,
        createdAt: area.createdAt.toISOString(),
      },
      200,
    );
  },
);

// PUT /areas/:id
app.openapi(
  createRoute({
    method: 'put',
    path: '/{id}',
    tags: ['Areas'],
    summary: 'Update an area',
    security: [{ bearerAuth: [] }],
    request: {
      params: AreaIdParams,
      body: {
        required: true,
        content: { 'application/json': { schema: UpdateAreaSchema } },
      },
    },
    responses: {
      200: {
        description: 'Area updated',
        content: { 'application/json': { schema: AreaSchema } },
      },
      403: {
        description: 'Forbidden',
        content: { 'application/json': { schema: ErrorSchema } },
      },
      404: {
        description: 'Area not found',
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

    const [area] = await db
      .update(areas)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(areas.id, id), eq(areas.userId, userId)))
      .returning();

    if (!area) {
      return c.json({ error: 'Area not found' }, 404);
    }

    return c.json(
      {
        id: area.id,
        title: area.title,
        position: area.position,
        createdAt: area.createdAt.toISOString(),
      },
      200,
    );
  },
);

// DELETE /areas/:id
app.openapi(
  createRoute({
    method: 'delete',
    path: '/{id}',
    tags: ['Areas'],
    summary: 'Delete an area',
    security: [{ bearerAuth: [] }],
    request: { params: AreaIdParams },
    responses: {
      200: {
        description: 'Area deleted',
        content: { 'application/json': { schema: SuccessSchema } },
      },
      403: {
        description: 'Forbidden',
        content: { 'application/json': { schema: ErrorSchema } },
      },
      404: {
        description: 'Area not found',
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
      .delete(areas)
      .where(and(eq(areas.id, id), eq(areas.userId, userId)))
      .returning();

    if (result.length === 0) {
      return c.json({ error: 'Area not found' }, 404);
    }

    return c.json({ success: true, message: 'Area deleted' }, 200);
  },
);

export default app;
