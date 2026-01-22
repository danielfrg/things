import { z } from '@hono/zod-openapi';

export const ErrorSchema = z
  .object({
    error: z.string().openapi({ example: 'Invalid request' }),
  })
  .openapi('Error');

export const SuccessSchema = z
  .object({
    success: z.boolean().openapi({ example: true }),
    message: z.string().optional().openapi({ example: 'Operation completed' }),
  })
  .openapi('Success');

export const TaskStatusSchema = z.enum([
  'inbox',
  'anytime',
  'someday',
  'scheduled',
  'completed',
  'trashed',
]);

export const TaskSchema = z
  .object({
    id: z.string().openapi({ example: 'a2f3c1d4-5678-4abc-9def-0123456789ab' }),
    title: z.string().openapi({ example: 'Buy groceries' }),
    notes: z
      .string()
      .nullable()
      .openapi({ example: 'Get milk, eggs, and bread' }),
    status: TaskStatusSchema.openapi({ example: 'inbox' }),
    type: z.enum(['task', 'project']).openapi({ example: 'task' }),
    scheduledDate: z.string().nullable().openapi({ example: '2026-01-15' }),
    deadline: z.string().nullable().openapi({ example: '2026-01-20' }),
    position: z.number().openapi({ example: 0 }),
    projectId: z.string().nullable(),
    headingId: z.string().nullable(),
    areaId: z.string().nullable(),
    completedAt: z.string().nullable(),
    trashedAt: z.string().nullable(),
    createdAt: z.string().openapi({ example: '2026-01-13T18:24:12.123Z' }),
  })
  .openapi('Task');

export const CreateTaskSchema = z
  .object({
    title: z.string().min(1).openapi({ example: 'Buy groceries' }),
    notes: z.string().optional(),
    status: TaskStatusSchema.optional().default('inbox'),
    scheduledDate: z.string().optional(),
    deadline: z.string().optional(),
    projectId: z.string().nullable().optional(),
    headingId: z.string().nullable().optional(),
    areaId: z.string().nullable().optional(),
    position: z.number().optional(),
  })
  .openapi('CreateTask');

export const UpdateTaskSchema = z
  .object({
    title: z.string().min(1).optional(),
    notes: z.string().nullable().optional(),
    status: TaskStatusSchema.optional(),
    scheduledDate: z.string().nullable().optional(),
    deadline: z.string().nullable().optional(),
    projectId: z.string().nullable().optional(),
    headingId: z.string().nullable().optional(),
    areaId: z.string().nullable().optional(),
    position: z.number().optional(),
  })
  .openapi('UpdateTask');

export const CompleteTaskSchema = z
  .object({
    completed: z.boolean().openapi({ example: true }),
  })
  .openapi('CompleteTask');

export const ProjectStatusSchema = z.enum(['active', 'completed', 'trashed']);

export const ProjectSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    notes: z.string().nullable(),
    status: ProjectStatusSchema,
    position: z.number(),
    areaId: z.string().nullable(),
    completedAt: z.string().nullable(),
    trashedAt: z.string().nullable(),
    createdAt: z.string(),
  })
  .openapi('Project');

export const CreateProjectSchema = z
  .object({
    title: z.string().min(1),
    notes: z.string().optional(),
    status: ProjectStatusSchema.optional().default('active'),
    areaId: z.string().nullable().optional(),
    position: z.number().optional(),
  })
  .openapi('CreateProject');

export const UpdateProjectSchema = z
  .object({
    title: z.string().min(1).optional(),
    notes: z.string().nullable().optional(),
    status: ProjectStatusSchema.optional(),
    areaId: z.string().nullable().optional(),
    position: z.number().optional(),
  })
  .openapi('UpdateProject');

export const AreaSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    position: z.number(),
    createdAt: z.string(),
  })
  .openapi('Area');

export const CreateAreaSchema = z
  .object({
    title: z.string().min(1),
    position: z.number().optional(),
  })
  .openapi('CreateArea');

export const UpdateAreaSchema = z
  .object({
    title: z.string().min(1).optional(),
    position: z.number().optional(),
  })
  .openapi('UpdateArea');

export const TagSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    color: z.string().nullable(),
    position: z.number(),
    createdAt: z.string(),
  })
  .openapi('Tag');

export const CreateTagSchema = z
  .object({
    title: z.string().min(1),
    color: z.string().optional(),
    position: z.number().optional(),
  })
  .openapi('CreateTag');

export const UpdateTagSchema = z
  .object({
    title: z.string().min(1).optional(),
    color: z.string().nullable().optional(),
    position: z.number().optional(),
  })
  .openapi('UpdateTag');
