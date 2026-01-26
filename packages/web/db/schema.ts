import { relations, sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// =============================================================================
// Helper for generating IDs
// =============================================================================

export function generateId(): string {
  if (crypto?.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers/environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// =============================================================================
// Better Auth Tables
// =============================================================================

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(generateId),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' })
    .notNull()
    .default(false),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  areas: many(areas),
  projects: many(projects),
  tasks: many(tasks),
  tags: many(tags),
  apiKeys: many(apiKeys),
}));

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey().$defaultFn(generateId),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey().$defaultFn(generateId),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', {
    mode: 'timestamp_ms',
  }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', {
    mode: 'timestamp_ms',
  }),
  scope: text('scope'),
  idToken: text('id_token'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const verifications = sqliteTable('verifications', {
  id: text('id').primaryKey().$defaultFn(generateId),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

// =============================================================================
// Areas - high-level life categories (e.g., Work, Personal, Health)
// =============================================================================

export const areas = sqliteTable('areas', {
  id: text('id').primaryKey().$defaultFn(generateId),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  position: real('position').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`0`),
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
});

export const areasRelations = relations(areas, ({ one, many }) => ({
  user: one(users, {
    fields: [areas.userId],
    references: [users.id],
  }),
  projects: many(projects),
  tasks: many(tasks),
}));

// =============================================================================
// Projects - collections of tasks with a defined outcome
// =============================================================================

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey().$defaultFn(generateId),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  notes: text('notes'),
  status: text('status', { enum: ['active', 'completed', 'trashed'] })
    .notNull()
    .default('active'),
  position: real('position').notNull().default(0),
  areaId: text('area_id').references(() => areas.id, { onDelete: 'set null' }),
  completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
  trashedAt: integer('trashed_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`0`),
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
});

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  area: one(areas, {
    fields: [projects.areaId],
    references: [areas.id],
  }),
  headings: many(headings),
  tasks: many(tasks),
}));

// =============================================================================
// Headings - sections within projects
// =============================================================================

export const headings = sqliteTable('headings', {
  id: text('id').primaryKey().$defaultFn(generateId),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  position: real('position').notNull().default(0),
  isBacklog: integer('is_backlog', { mode: 'boolean' })
    .notNull()
    .default(false),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`0`),
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
});

export const headingsRelations = relations(headings, ({ one, many }) => ({
  user: one(users, {
    fields: [headings.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [headings.projectId],
    references: [projects.id],
  }),
  tasks: many(tasks),
}));

// =============================================================================
// Tasks - the core to-do items
// =============================================================================

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey().$defaultFn(generateId),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  notes: text('notes'),
  status: text('status', {
    enum: ['inbox', 'anytime', 'someday', 'scheduled', 'completed', 'trashed'],
  })
    .notNull()
    .default('inbox'),
  type: text('type', { enum: ['task', 'project'] })
    .notNull()
    .default('task'),

  // Scheduling (stored as YYYY-MM-DD strings)
  scheduledDate: text('scheduled_date'),
  deadline: text('deadline'),
  isEvening: integer('is_evening', { mode: 'boolean' })
    .notNull()
    .default(false),

  // Organization
  position: real('position').notNull().default(0),
  projectId: text('project_id').references(() => projects.id, {
    onDelete: 'set null',
  }),
  headingId: text('heading_id').references(() => headings.id, {
    onDelete: 'set null',
  }),
  areaId: text('area_id').references(() => areas.id, { onDelete: 'set null' }),

  // Repeating: if this task was materialized from a repeating rule, store the rule ID.
  repeatingRuleId: text('repeating_rule_id'),

  // Timestamps
  completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
  canceledAt: integer('canceled_at', { mode: 'timestamp_ms' }),
  trashedAt: integer('trashed_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`0`),
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
});

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  heading: one(headings, {
    fields: [tasks.headingId],
    references: [headings.id],
  }),
  area: one(areas, {
    fields: [tasks.areaId],
    references: [areas.id],
  }),
  checklistItems: many(checklistItems),
  taskTags: many(taskTags),
}));

// =============================================================================
// Checklist Items - sub-tasks within a task
// =============================================================================

export const checklistItems = sqliteTable('checklist_items', {
  id: text('id').primaryKey().$defaultFn(generateId),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  position: real('position').notNull().default(0),
  taskId: text('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`0`),
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
});

export const checklistItemsRelations = relations(checklistItems, ({ one }) => ({
  user: one(users, {
    fields: [checklistItems.userId],
    references: [users.id],
  }),
  task: one(tasks, {
    fields: [checklistItems.taskId],
    references: [tasks.id],
  }),
}));

// =============================================================================
// Tags - for categorizing tasks
// =============================================================================

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey().$defaultFn(generateId),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  color: text('color'),
  position: real('position').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`0`),
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
});

export const tagsRelations = relations(tags, ({ one, many }) => ({
  user: one(users, {
    fields: [tags.userId],
    references: [users.id],
  }),
  taskTags: many(taskTags),
}));

// =============================================================================
// Task-Tag junction table
// =============================================================================

export const taskTags = sqliteTable('task_tags', {
  id: text('id').primaryKey().$defaultFn(generateId),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  taskId: text('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  tagId: text('tag_id')
    .notNull()
    .references(() => tags.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`0`),
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
});

export const taskTagsRelations = relations(taskTags, ({ one }) => ({
  user: one(users, {
    fields: [taskTags.userId],
    references: [users.id],
  }),
  task: one(tasks, {
    fields: [taskTags.taskId],
    references: [tasks.id],
  }),
  tag: one(tags, {
    fields: [taskTags.tagId],
    references: [tags.id],
  }),
}));

// =============================================================================
// Task Ordering - per "list context" ordering (Things-style)
// =============================================================================

export const taskOrderings = sqliteTable('task_orderings', {
  id: text('id').primaryKey().$defaultFn(generateId),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  contextType: text('context_type', {
    enum: [
      'inbox',
      'today',
      'anytime',
      'someday',
      'logbook',
      'trash',
      'project',
    ],
  }).notNull(),
  contextId: text('context_id'),
  taskId: text('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  position: real('position').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`0`),
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
});

export const taskOrderingsRelations = relations(taskOrderings, ({ one }) => ({
  user: one(users, {
    fields: [taskOrderings.userId],
    references: [users.id],
  }),
  task: one(tasks, {
    fields: [taskOrderings.taskId],
    references: [tasks.id],
  }),
}));

// =============================================================================
// Repeating Rules - RFC 5545 RRULE format
// =============================================================================

export const repeatingRules = sqliteTable('repeating_rules', {
  id: text('id').primaryKey().$defaultFn(generateId),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  rrule: text('rrule').notNull(),
  nextOccurrence: text('next_occurrence').notNull(),
  status: text('status', { enum: ['active', 'paused'] })
    .notNull()
    .default('active'),

  // Template fields - copied to each materialized task
  title: text('title').notNull(),
  notes: text('notes'),
  projectId: text('project_id').references(() => projects.id, {
    onDelete: 'set null',
  }),
  headingId: text('heading_id').references(() => headings.id, {
    onDelete: 'set null',
  }),
  areaId: text('area_id').references(() => areas.id, { onDelete: 'set null' }),

  // Checklist items stored as JSON array of { title: string }
  checklistTemplate: text('checklist_template'),

  // Tags stored as JSON array of tag IDs
  tagsTemplate: text('tags_template'),

  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`0`),
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
});

export const repeatingRulesRelations = relations(repeatingRules, ({ one }) => ({
  user: one(users, {
    fields: [repeatingRules.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [repeatingRules.projectId],
    references: [projects.id],
  }),
  heading: one(headings, {
    fields: [repeatingRules.headingId],
    references: [headings.id],
  }),
  area: one(areas, {
    fields: [repeatingRules.areaId],
    references: [areas.id],
  }),
}));

// =============================================================================
// API Keys - for external integrations
// =============================================================================

export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey().$defaultFn(generateId),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  keyHash: text('key_hash').notNull(),
  keyPrefix: text('key_prefix').notNull(),
  scope: text('scope', { enum: ['read', 'read-write'] }).notNull(),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}));

// =============================================================================
// Type exports
// =============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type Verification = typeof verifications.$inferSelect;
export type NewVerification = typeof verifications.$inferInsert;

export type Area = typeof areas.$inferSelect;
export type NewArea = typeof areas.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Heading = typeof headings.$inferSelect;
export type NewHeading = typeof headings.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type ChecklistItem = typeof checklistItems.$inferSelect;
export type NewChecklistItem = typeof checklistItems.$inferInsert;

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;

export type TaskTag = typeof taskTags.$inferSelect;
export type NewTaskTag = typeof taskTags.$inferInsert;

export type TaskOrdering = typeof taskOrderings.$inferSelect;
export type NewTaskOrdering = typeof taskOrderings.$inferInsert;

export type RepeatingRule = typeof repeatingRules.$inferSelect;
export type NewRepeatingRule = typeof repeatingRules.$inferInsert;

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
