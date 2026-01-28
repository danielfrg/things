import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import {
  getAnytimeView,
  getInboxView,
  getLogbookView,
  getSomedayView,
  getTodayView,
  getUpcomingView,
} from '@/lib/services/views';
import type { AuthContext } from '../middleware/auth';
import { UpcomingViewResponseSchema, ViewResponseSchema } from '../schemas';

const app = new OpenAPIHono<AuthContext>();

// GET /views/today
app.openapi(
  createRoute({
    method: 'get',
    path: '/today',
    tags: ['Views'],
    summary: 'Get tasks for Today view',
    description:
      'Returns tasks scheduled for today, overdue tasks, tasks with deadlines today/overdue, and tasks completed today. Grouped by project/area.',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Today view data',
        content: { 'application/json': { schema: ViewResponseSchema } },
      },
    },
  }),
  async (c) => {
    const userId = c.get('userId');
    const result = await getTodayView(userId);
    return c.json(result, 200);
  },
);

// GET /views/inbox
app.openapi(
  createRoute({
    method: 'get',
    path: '/inbox',
    tags: ['Views'],
    summary: 'Get tasks for Inbox view',
    description:
      'Returns tasks with inbox status that have no project, area, or scheduled date.',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Inbox view data',
        content: { 'application/json': { schema: ViewResponseSchema } },
      },
    },
  }),
  async (c) => {
    const userId = c.get('userId');
    const result = await getInboxView(userId);
    return c.json(result, 200);
  },
);

// GET /views/upcoming
app.openapi(
  createRoute({
    method: 'get',
    path: '/upcoming',
    tags: ['Views'],
    summary: 'Get tasks for Upcoming view',
    description:
      'Returns tasks scheduled for the next 7 days grouped by day, plus a "later" group for tasks beyond that. Includes repeating rule templates.',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Upcoming view data',
        content: { 'application/json': { schema: UpcomingViewResponseSchema } },
      },
    },
  }),
  async (c) => {
    const userId = c.get('userId');
    const result = await getUpcomingView(userId);
    return c.json(result, 200);
  },
);

// GET /views/anytime
app.openapi(
  createRoute({
    method: 'get',
    path: '/anytime',
    tags: ['Views'],
    summary: 'Get tasks for Anytime view',
    description: 'Returns tasks with anytime status, grouped by project/area.',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Anytime view data',
        content: { 'application/json': { schema: ViewResponseSchema } },
      },
    },
  }),
  async (c) => {
    const userId = c.get('userId');
    const result = await getAnytimeView(userId);
    return c.json(result, 200);
  },
);

// GET /views/someday
app.openapi(
  createRoute({
    method: 'get',
    path: '/someday',
    tags: ['Views'],
    summary: 'Get tasks for Someday view',
    description: 'Returns tasks with someday status, grouped by project/area.',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Someday view data',
        content: { 'application/json': { schema: ViewResponseSchema } },
      },
    },
  }),
  async (c) => {
    const userId = c.get('userId');
    const result = await getSomedayView(userId);
    return c.json(result, 200);
  },
);

// GET /views/logbook
app.openapi(
  createRoute({
    method: 'get',
    path: '/logbook',
    tags: ['Views'],
    summary: 'Get tasks for Logbook view',
    description: 'Returns all completed tasks.',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Logbook view data',
        content: { 'application/json': { schema: ViewResponseSchema } },
      },
    },
  }),
  async (c) => {
    const userId = c.get('userId');
    const result = await getLogbookView(userId);
    return c.json(result, 200);
  },
);

export default app;
