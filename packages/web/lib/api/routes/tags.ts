import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { tags } from '@/db/schema';
import type { AuthContext } from '../middleware/auth';
import { requireWriteScope } from '../middleware/auth';
import {
  CreateTagSchema,
  ErrorSchema,
  SuccessSchema,
  TagSchema,
  UpdateTagSchema,
} from '../schemas';

const app = new OpenAPIHono<AuthContext>();

const TagIdParams = z.object({ id: z.string() });

// GET /tags
app.openapi(
  createRoute({
    method: 'get',
    path: '/',
    tags: ['Tags'],
    summary: 'List all tags',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'List of tags',
        content: { 'application/json': { schema: z.array(TagSchema) } },
      },
    },
  }),
  async (c) => {
    const userId = c.get('userId');
    const result = await db
      .select()
      .from(tags)
      .where(and(eq(tags.userId, userId), isNull(tags.deletedAt)));
    const formatted = result.map((t) => ({
      id: t.id,
      title: t.title,
      color: t.color,
      position: t.position,
      createdAt: t.createdAt.toISOString(),
    }));
    return c.json(formatted, 200);
  },
);

// POST /tags
app.openapi(
  createRoute({
    method: 'post',
    path: '/',
    tags: ['Tags'],
    summary: 'Create a new tag',
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        required: true,
        content: { 'application/json': { schema: CreateTagSchema } },
      },
    },
    responses: {
      201: {
        description: 'Tag created',
        content: { 'application/json': { schema: TagSchema } },
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
    const [tag] = await db
      .insert(tags)
      .values({
        userId,
        title: body.title,
        color: body.color,
        position: body.position ?? 0,
      })
      .returning();

    return c.json(
      {
        id: tag.id,
        title: tag.title,
        color: tag.color,
        position: tag.position,
        createdAt: tag.createdAt.toISOString(),
      },
      201,
    );
  },
);

// GET /tags/:id
app.openapi(
  createRoute({
    method: 'get',
    path: '/{id}',
    tags: ['Tags'],
    summary: 'Get a tag by ID',
    security: [{ bearerAuth: [] }],
    request: { params: TagIdParams },
    responses: {
      200: {
        description: 'Tag details',
        content: { 'application/json': { schema: TagSchema } },
      },
      404: {
        description: 'Tag not found',
        content: { 'application/json': { schema: ErrorSchema } },
      },
    },
  }),
  async (c) => {
    const userId = c.get('userId');
    const { id } = c.req.valid('param');
    const [tag] = await db
      .select()
      .from(tags)
      .where(and(eq(tags.id, id), eq(tags.userId, userId)));

    if (!tag) {
      return c.json({ error: 'Tag not found' }, 404);
    }

    return c.json(
      {
        id: tag.id,
        title: tag.title,
        color: tag.color,
        position: tag.position,
        createdAt: tag.createdAt.toISOString(),
      },
      200,
    );
  },
);

// PUT /tags/:id
app.openapi(
  createRoute({
    method: 'put',
    path: '/{id}',
    tags: ['Tags'],
    summary: 'Update a tag',
    security: [{ bearerAuth: [] }],
    request: {
      params: TagIdParams,
      body: {
        required: true,
        content: { 'application/json': { schema: UpdateTagSchema } },
      },
    },
    responses: {
      200: {
        description: 'Tag updated',
        content: { 'application/json': { schema: TagSchema } },
      },
      403: {
        description: 'Forbidden',
        content: { 'application/json': { schema: ErrorSchema } },
      },
      404: {
        description: 'Tag not found',
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

    const [tag] = await db
      .update(tags)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(tags.id, id), eq(tags.userId, userId)))
      .returning();

    if (!tag) {
      return c.json({ error: 'Tag not found' }, 404);
    }

    return c.json(
      {
        id: tag.id,
        title: tag.title,
        color: tag.color,
        position: tag.position,
        createdAt: tag.createdAt.toISOString(),
      },
      200,
    );
  },
);

// DELETE /tags/:id
app.openapi(
  createRoute({
    method: 'delete',
    path: '/{id}',
    tags: ['Tags'],
    summary: 'Delete a tag',
    security: [{ bearerAuth: [] }],
    request: { params: TagIdParams },
    responses: {
      200: {
        description: 'Tag deleted',
        content: { 'application/json': { schema: SuccessSchema } },
      },
      403: {
        description: 'Forbidden',
        content: { 'application/json': { schema: ErrorSchema } },
      },
      404: {
        description: 'Tag not found',
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
      .delete(tags)
      .where(and(eq(tags.id, id), eq(tags.userId, userId)))
      .returning();

    if (result.length === 0) {
      return c.json({ error: 'Tag not found' }, 404);
    }

    return c.json({ success: true, message: 'Tag deleted' }, 200);
  },
);

export default app;
