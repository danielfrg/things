import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { projects } from '@/db/schema';
import type { AuthContext } from '../middleware/auth';
import { requireWriteScope } from '../middleware/auth';
import {
  CreateProjectSchema,
  ErrorSchema,
  ProjectSchema,
  SuccessSchema,
  UpdateProjectSchema,
} from '../schemas';

const app = new OpenAPIHono<AuthContext>();

const ProjectIdParams = z.object({ id: z.string() });

// GET /projects
app.openapi(
  createRoute({
    method: 'get',
    path: '/',
    tags: ['Projects'],
    summary: 'List all projects',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'List of projects',
        content: { 'application/json': { schema: z.array(ProjectSchema) } },
      },
    },
  }),
  async (c) => {
    const userId = c.get('userId');
    const result = await db
      .select()
      .from(projects)
      .where(and(eq(projects.userId, userId), isNull(projects.trashedAt)));
    const formatted = result.map((p) => ({
      id: p.id,
      title: p.title,
      notes: p.notes,
      status: p.status,
      position: p.position,
      areaId: p.areaId,
      completedAt: p.completedAt?.toISOString() ?? null,
      trashedAt: p.trashedAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    }));
    return c.json(formatted, 200);
  },
);

// POST /projects
app.openapi(
  createRoute({
    method: 'post',
    path: '/',
    tags: ['Projects'],
    summary: 'Create a new project',
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        required: true,
        content: { 'application/json': { schema: CreateProjectSchema } },
      },
    },
    responses: {
      201: {
        description: 'Project created',
        content: { 'application/json': { schema: ProjectSchema } },
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
    const [project] = await db
      .insert(projects)
      .values({
        userId,
        title: body.title,
        notes: body.notes,
        status: body.status,
        areaId: body.areaId,
        position: body.position ?? 0,
      })
      .returning();

    return c.json(
      {
        id: project.id,
        title: project.title,
        notes: project.notes,
        status: project.status,
        position: project.position,
        areaId: project.areaId,
        completedAt: project.completedAt?.toISOString() ?? null,
        trashedAt: project.trashedAt?.toISOString() ?? null,
        createdAt: project.createdAt.toISOString(),
      },
      201,
    );
  },
);

// GET /projects/:id
app.openapi(
  createRoute({
    method: 'get',
    path: '/{id}',
    tags: ['Projects'],
    summary: 'Get a project by ID',
    security: [{ bearerAuth: [] }],
    request: { params: ProjectIdParams },
    responses: {
      200: {
        description: 'Project details',
        content: { 'application/json': { schema: ProjectSchema } },
      },
      404: {
        description: 'Project not found',
        content: { 'application/json': { schema: ErrorSchema } },
      },
    },
  }),
  async (c) => {
    const userId = c.get('userId');
    const { id } = c.req.valid('param');
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, userId)));

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    return c.json(
      {
        id: project.id,
        title: project.title,
        notes: project.notes,
        status: project.status,
        position: project.position,
        areaId: project.areaId,
        completedAt: project.completedAt?.toISOString() ?? null,
        trashedAt: project.trashedAt?.toISOString() ?? null,
        createdAt: project.createdAt.toISOString(),
      },
      200,
    );
  },
);

// PUT /projects/:id
app.openapi(
  createRoute({
    method: 'put',
    path: '/{id}',
    tags: ['Projects'],
    summary: 'Update a project',
    security: [{ bearerAuth: [] }],
    request: {
      params: ProjectIdParams,
      body: {
        required: true,
        content: { 'application/json': { schema: UpdateProjectSchema } },
      },
    },
    responses: {
      200: {
        description: 'Project updated',
        content: { 'application/json': { schema: ProjectSchema } },
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
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');

    const [project] = await db
      .update(projects)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(projects.id, id), eq(projects.userId, userId)))
      .returning();

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    return c.json(
      {
        id: project.id,
        title: project.title,
        notes: project.notes,
        status: project.status,
        position: project.position,
        areaId: project.areaId,
        completedAt: project.completedAt?.toISOString() ?? null,
        trashedAt: project.trashedAt?.toISOString() ?? null,
        createdAt: project.createdAt.toISOString(),
      },
      200,
    );
  },
);

// DELETE /projects/:id
app.openapi(
  createRoute({
    method: 'delete',
    path: '/{id}',
    tags: ['Projects'],
    summary: 'Delete a project',
    security: [{ bearerAuth: [] }],
    request: { params: ProjectIdParams },
    responses: {
      200: {
        description: 'Project deleted',
        content: { 'application/json': { schema: SuccessSchema } },
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
    const { id } = c.req.valid('param');
    const [project] = await db
      .update(projects)
      .set({ status: 'trashed', trashedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(projects.id, id), eq(projects.userId, userId)))
      .returning();

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    return c.json({ success: true, message: 'Project moved to trash' }, 200);
  },
);

export default app;
