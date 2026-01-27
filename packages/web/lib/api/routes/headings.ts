import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { headings, projects } from '@/db/schema';
import type { AuthContext } from '../middleware/auth';
import { requireWriteScope } from '../middleware/auth';
import {
  CreateHeadingSchema,
  ErrorSchema,
  HeadingSchema,
  SuccessSchema,
  UpdateHeadingSchema,
} from '../schemas';

const app = new OpenAPIHono<AuthContext>();

const HeadingIdParams = z.object({ id: z.string() });

// GET /headings
app.openapi(
  createRoute({
    method: 'get',
    path: '/',
    tags: ['Headings'],
    summary: 'List all headings',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'List of headings',
        content: { 'application/json': { schema: z.array(HeadingSchema) } },
      },
    },
  }),
  async (c) => {
    const userId = c.get('userId');
    const result = await db
      .select()
      .from(headings)
      .where(and(eq(headings.userId, userId), isNull(headings.deletedAt)))
      .orderBy(headings.position);

    const formatted = result.map((h) => ({
      id: h.id,
      title: h.title,
      position: h.position,
      isBacklog: h.isBacklog,
      projectId: h.projectId,
      createdAt: h.createdAt.toISOString(),
    }));

    return c.json(formatted, 200);
  },
);

// POST /headings
app.openapi(
  createRoute({
    method: 'post',
    path: '/',
    tags: ['Headings'],
    summary: 'Create a new heading',
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        required: true,
        content: { 'application/json': { schema: CreateHeadingSchema } },
      },
    },
    responses: {
      201: {
        description: 'Heading created',
        content: { 'application/json': { schema: HeadingSchema } },
      },
      403: {
        description: 'Forbidden',
        content: { 'application/json': { schema: ErrorSchema } },
      },
      404: {
        description: 'Project not found',
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

    // Verify project exists and belongs to user
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, body.projectId), eq(projects.userId, userId)));

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    const [heading] = await db
      .insert(headings)
      .values({
        userId,
        title: body.title,
        projectId: body.projectId,
        position: body.position ?? 0,
        isBacklog: body.isBacklog ?? false,
      })
      .returning();

    return c.json(
      {
        id: heading.id,
        title: heading.title,
        position: heading.position,
        isBacklog: heading.isBacklog,
        projectId: heading.projectId,
        createdAt: heading.createdAt.toISOString(),
      },
      201,
    );
  },
);

// GET /headings/:id
app.openapi(
  createRoute({
    method: 'get',
    path: '/{id}',
    tags: ['Headings'],
    summary: 'Get a heading by ID',
    security: [{ bearerAuth: [] }],
    request: { params: HeadingIdParams },
    responses: {
      200: {
        description: 'Heading details',
        content: { 'application/json': { schema: HeadingSchema } },
      },
      404: {
        description: 'Heading not found',
        content: { 'application/json': { schema: ErrorSchema } },
      },
    },
  }),
  async (c) => {
    const userId = c.get('userId');
    const { id } = c.req.valid('param');

    const [heading] = await db
      .select()
      .from(headings)
      .where(
        and(
          eq(headings.id, id),
          eq(headings.userId, userId),
          isNull(headings.deletedAt),
        ),
      );

    if (!heading) {
      return c.json({ error: 'Heading not found' }, 404);
    }

    return c.json(
      {
        id: heading.id,
        title: heading.title,
        position: heading.position,
        isBacklog: heading.isBacklog,
        projectId: heading.projectId,
        createdAt: heading.createdAt.toISOString(),
      },
      200,
    );
  },
);

// PUT /headings/:id
app.openapi(
  createRoute({
    method: 'put',
    path: '/{id}',
    tags: ['Headings'],
    summary: 'Update a heading',
    security: [{ bearerAuth: [] }],
    request: {
      params: HeadingIdParams,
      body: {
        required: true,
        content: { 'application/json': { schema: UpdateHeadingSchema } },
      },
    },
    responses: {
      200: {
        description: 'Heading updated',
        content: { 'application/json': { schema: HeadingSchema } },
      },
      403: {
        description: 'Forbidden',
        content: { 'application/json': { schema: ErrorSchema } },
      },
      404: {
        description: 'Heading not found',
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

    const [heading] = await db
      .update(headings)
      .set({ ...body, updatedAt: new Date() })
      .where(
        and(
          eq(headings.id, id),
          eq(headings.userId, userId),
          isNull(headings.deletedAt),
        ),
      )
      .returning();

    if (!heading) {
      return c.json({ error: 'Heading not found' }, 404);
    }

    return c.json(
      {
        id: heading.id,
        title: heading.title,
        position: heading.position,
        isBacklog: heading.isBacklog,
        projectId: heading.projectId,
        createdAt: heading.createdAt.toISOString(),
      },
      200,
    );
  },
);

// DELETE /headings/:id
app.openapi(
  createRoute({
    method: 'delete',
    path: '/{id}',
    tags: ['Headings'],
    summary: 'Delete a heading',
    security: [{ bearerAuth: [] }],
    request: { params: HeadingIdParams },
    responses: {
      200: {
        description: 'Heading deleted',
        content: { 'application/json': { schema: SuccessSchema } },
      },
      403: {
        description: 'Forbidden',
        content: { 'application/json': { schema: ErrorSchema } },
      },
      404: {
        description: 'Heading not found',
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

    const [heading] = await db
      .update(headings)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(headings.id, id),
          eq(headings.userId, userId),
          isNull(headings.deletedAt),
        ),
      )
      .returning();

    if (!heading) {
      return c.json({ error: 'Heading not found' }, 404);
    }

    return c.json({ success: true, message: 'Heading deleted' }, 200);
  },
);

export default app;
