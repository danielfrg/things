import { OpenAPIHono } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import { authMiddleware } from './middleware/auth';
import areasRoutes from './routes/areas';
import checklistItemsRoutes from './routes/checklist-items';
import headingsRoutes from './routes/headings';
import projectsRoutes from './routes/projects';
import repeatingRulesRoutes from './routes/repeating-rules';
import tagsRoutes from './routes/tags';
import tasksRoutes from './routes/tasks';

export const api = new OpenAPIHono();

// Health check (public)
api.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// OpenAPI spec
api.doc('/openapi.json', {
  openapi: '3.1.0',
  info: {
    title: 'Things API',
    version: '1.0.0',
    description: `
REST API for the Things task management application.

## Authentication

All endpoints under \`/api/v1/*\` require an API key passed via the \`Authorization\` header:

\`\`\`
Authorization: Bearer sk_live_your_api_key_here
\`\`\`

## Scopes

API keys can have one of two scopes:
- **read**: Read-only access to all resources
- **read-write**: Full CRUD access to all resources
    `.trim(),
  },
  tags: [
    { name: 'Tasks', description: 'Task management endpoints' },
    { name: 'Projects', description: 'Project management endpoints' },
    { name: 'Areas', description: 'Area management endpoints' },
    { name: 'Tags', description: 'Tag management endpoints' },
    { name: 'Checklist Items', description: 'Checklist item management endpoints' },
    { name: 'Headings', description: 'Project heading management endpoints' },
    { name: 'Repeating Rules', description: 'Repeating task rule management endpoints' },
  ],
  servers: [{ url: '/api', description: 'API Server' }],
  security: [{ bearerAuth: [] }],
});

api.openAPIRegistry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'API Key',
  description: 'API key authentication. Format: sk_live_xxxxx',
});

// API Docs UI (Scalar)
api.get(
  '/docs',
  Scalar({
    url: '/api/openapi.json',
    pageTitle: 'Things API',
    theme: 'purple',
  }),
);

// Mount protected routes
api.use('/v1/*', authMiddleware);
api.route('/v1/tasks', tasksRoutes);
api.route('/v1/tasks/:taskId/checklist', checklistItemsRoutes);
api.route('/v1/projects', projectsRoutes);
api.route('/v1/areas', areasRoutes);
api.route('/v1/tags', tagsRoutes);
api.route('/v1/headings', headingsRoutes);
api.route('/v1/repeating-rules', repeatingRulesRoutes);

export default api;
