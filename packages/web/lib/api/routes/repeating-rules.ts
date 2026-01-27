import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { repeatingRules } from '@/db/schema';
import type { AuthContext } from '../middleware/auth';
import { requireWriteScope } from '../middleware/auth';
import {
  CreateRepeatingRuleSchema,
  ErrorSchema,
  RepeatingRuleSchema,
  SuccessSchema,
  UpdateRepeatingRuleSchema,
} from '../schemas';

const app = new OpenAPIHono<AuthContext>();

const RuleIdParams = z.object({ id: z.string() });

// GET /repeating-rules
app.openapi(
  createRoute({
    method: 'get',
    path: '/',
    tags: ['Repeating Rules'],
    summary: 'List all repeating rules',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'List of repeating rules',
        content: {
          'application/json': { schema: z.array(RepeatingRuleSchema) },
        },
      },
    },
  }),
  async (c) => {
    const userId = c.get('userId');
    const result = await db
      .select()
      .from(repeatingRules)
      .where(
        and(eq(repeatingRules.userId, userId), isNull(repeatingRules.deletedAt)),
      );

    const formatted = result.map((r) => ({
      id: r.id,
      rrule: r.rrule,
      nextOccurrence: r.nextOccurrence,
      status: r.status,
      title: r.title,
      notes: r.notes,
      projectId: r.projectId,
      headingId: r.headingId,
      areaId: r.areaId,
      checklistTemplate: r.checklistTemplate,
      tagsTemplate: r.tagsTemplate,
      createdAt: r.createdAt.toISOString(),
    }));

    return c.json(formatted, 200);
  },
);

// POST /repeating-rules
app.openapi(
  createRoute({
    method: 'post',
    path: '/',
    tags: ['Repeating Rules'],
    summary: 'Create a new repeating rule',
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        required: true,
        content: { 'application/json': { schema: CreateRepeatingRuleSchema } },
      },
    },
    responses: {
      201: {
        description: 'Repeating rule created',
        content: { 'application/json': { schema: RepeatingRuleSchema } },
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

    const [rule] = await db
      .insert(repeatingRules)
      .values({
        userId,
        rrule: body.rrule,
        nextOccurrence: body.nextOccurrence,
        title: body.title,
        notes: body.notes,
        status: body.status ?? 'active',
        projectId: body.projectId,
        headingId: body.headingId,
        areaId: body.areaId,
        checklistTemplate: body.checklistTemplate,
        tagsTemplate: body.tagsTemplate,
      })
      .returning();

    return c.json(
      {
        id: rule.id,
        rrule: rule.rrule,
        nextOccurrence: rule.nextOccurrence,
        status: rule.status,
        title: rule.title,
        notes: rule.notes,
        projectId: rule.projectId,
        headingId: rule.headingId,
        areaId: rule.areaId,
        checklistTemplate: rule.checklistTemplate,
        tagsTemplate: rule.tagsTemplate,
        createdAt: rule.createdAt.toISOString(),
      },
      201,
    );
  },
);

// GET /repeating-rules/:id
app.openapi(
  createRoute({
    method: 'get',
    path: '/{id}',
    tags: ['Repeating Rules'],
    summary: 'Get a repeating rule by ID',
    security: [{ bearerAuth: [] }],
    request: { params: RuleIdParams },
    responses: {
      200: {
        description: 'Repeating rule details',
        content: { 'application/json': { schema: RepeatingRuleSchema } },
      },
      404: {
        description: 'Repeating rule not found',
        content: { 'application/json': { schema: ErrorSchema } },
      },
    },
  }),
  async (c) => {
    const userId = c.get('userId');
    const { id } = c.req.valid('param');

    const [rule] = await db
      .select()
      .from(repeatingRules)
      .where(
        and(
          eq(repeatingRules.id, id),
          eq(repeatingRules.userId, userId),
          isNull(repeatingRules.deletedAt),
        ),
      );

    if (!rule) {
      return c.json({ error: 'Repeating rule not found' }, 404);
    }

    return c.json(
      {
        id: rule.id,
        rrule: rule.rrule,
        nextOccurrence: rule.nextOccurrence,
        status: rule.status,
        title: rule.title,
        notes: rule.notes,
        projectId: rule.projectId,
        headingId: rule.headingId,
        areaId: rule.areaId,
        checklistTemplate: rule.checklistTemplate,
        tagsTemplate: rule.tagsTemplate,
        createdAt: rule.createdAt.toISOString(),
      },
      200,
    );
  },
);

// PUT /repeating-rules/:id
app.openapi(
  createRoute({
    method: 'put',
    path: '/{id}',
    tags: ['Repeating Rules'],
    summary: 'Update a repeating rule',
    security: [{ bearerAuth: [] }],
    request: {
      params: RuleIdParams,
      body: {
        required: true,
        content: { 'application/json': { schema: UpdateRepeatingRuleSchema } },
      },
    },
    responses: {
      200: {
        description: 'Repeating rule updated',
        content: { 'application/json': { schema: RepeatingRuleSchema } },
      },
      403: {
        description: 'Forbidden',
        content: { 'application/json': { schema: ErrorSchema } },
      },
      404: {
        description: 'Repeating rule not found',
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

    const [rule] = await db
      .update(repeatingRules)
      .set({ ...body, updatedAt: new Date() })
      .where(
        and(
          eq(repeatingRules.id, id),
          eq(repeatingRules.userId, userId),
          isNull(repeatingRules.deletedAt),
        ),
      )
      .returning();

    if (!rule) {
      return c.json({ error: 'Repeating rule not found' }, 404);
    }

    return c.json(
      {
        id: rule.id,
        rrule: rule.rrule,
        nextOccurrence: rule.nextOccurrence,
        status: rule.status,
        title: rule.title,
        notes: rule.notes,
        projectId: rule.projectId,
        headingId: rule.headingId,
        areaId: rule.areaId,
        checklistTemplate: rule.checklistTemplate,
        tagsTemplate: rule.tagsTemplate,
        createdAt: rule.createdAt.toISOString(),
      },
      200,
    );
  },
);

// DELETE /repeating-rules/:id
app.openapi(
  createRoute({
    method: 'delete',
    path: '/{id}',
    tags: ['Repeating Rules'],
    summary: 'Delete a repeating rule',
    security: [{ bearerAuth: [] }],
    request: { params: RuleIdParams },
    responses: {
      200: {
        description: 'Repeating rule deleted',
        content: { 'application/json': { schema: SuccessSchema } },
      },
      403: {
        description: 'Forbidden',
        content: { 'application/json': { schema: ErrorSchema } },
      },
      404: {
        description: 'Repeating rule not found',
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

    const [rule] = await db
      .update(repeatingRules)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(repeatingRules.id, id),
          eq(repeatingRules.userId, userId),
          isNull(repeatingRules.deletedAt),
        ),
      )
      .returning();

    if (!rule) {
      return c.json({ error: 'Repeating rule not found' }, 404);
    }

    return c.json({ success: true, message: 'Repeating rule deleted' }, 200);
  },
);

// POST /repeating-rules/:id/pause
app.openapi(
  createRoute({
    method: 'post',
    path: '/{id}/pause',
    tags: ['Repeating Rules'],
    summary: 'Pause a repeating rule',
    security: [{ bearerAuth: [] }],
    request: { params: RuleIdParams },
    responses: {
      200: {
        description: 'Repeating rule paused',
        content: { 'application/json': { schema: RepeatingRuleSchema } },
      },
      403: {
        description: 'Forbidden',
        content: { 'application/json': { schema: ErrorSchema } },
      },
      404: {
        description: 'Repeating rule not found',
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

    const [rule] = await db
      .update(repeatingRules)
      .set({ status: 'paused', updatedAt: new Date() })
      .where(
        and(
          eq(repeatingRules.id, id),
          eq(repeatingRules.userId, userId),
          isNull(repeatingRules.deletedAt),
        ),
      )
      .returning();

    if (!rule) {
      return c.json({ error: 'Repeating rule not found' }, 404);
    }

    return c.json(
      {
        id: rule.id,
        rrule: rule.rrule,
        nextOccurrence: rule.nextOccurrence,
        status: rule.status,
        title: rule.title,
        notes: rule.notes,
        projectId: rule.projectId,
        headingId: rule.headingId,
        areaId: rule.areaId,
        checklistTemplate: rule.checklistTemplate,
        tagsTemplate: rule.tagsTemplate,
        createdAt: rule.createdAt.toISOString(),
      },
      200,
    );
  },
);

// POST /repeating-rules/:id/resume
app.openapi(
  createRoute({
    method: 'post',
    path: '/{id}/resume',
    tags: ['Repeating Rules'],
    summary: 'Resume a repeating rule',
    security: [{ bearerAuth: [] }],
    request: { params: RuleIdParams },
    responses: {
      200: {
        description: 'Repeating rule resumed',
        content: { 'application/json': { schema: RepeatingRuleSchema } },
      },
      403: {
        description: 'Forbidden',
        content: { 'application/json': { schema: ErrorSchema } },
      },
      404: {
        description: 'Repeating rule not found',
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

    const [rule] = await db
      .update(repeatingRules)
      .set({ status: 'active', updatedAt: new Date() })
      .where(
        and(
          eq(repeatingRules.id, id),
          eq(repeatingRules.userId, userId),
          isNull(repeatingRules.deletedAt),
        ),
      )
      .returning();

    if (!rule) {
      return c.json({ error: 'Repeating rule not found' }, 404);
    }

    return c.json(
      {
        id: rule.id,
        rrule: rule.rrule,
        nextOccurrence: rule.nextOccurrence,
        status: rule.status,
        title: rule.title,
        notes: rule.notes,
        projectId: rule.projectId,
        headingId: rule.headingId,
        areaId: rule.areaId,
        checklistTemplate: rule.checklistTemplate,
        tagsTemplate: rule.tagsTemplate,
        createdAt: rule.createdAt.toISOString(),
      },
      200,
    );
  },
);

export default app;
