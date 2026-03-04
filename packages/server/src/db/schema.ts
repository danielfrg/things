import { relations, sql } from "drizzle-orm"
import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"
import {
  createUserId,
  createSessionId,
  createAccountId,
  createVerificationId,
  createAreaId,
  createProjectId,
  createHeadingId,
  createTaskId,
  createChecklistItemId,
  createTagId,
  createTaskTagId,
  createTaskOrderingId,
  createApiKeyId,
} from "../lib/id"

// =============================================================================
// Better Auth Tables
// =============================================================================

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(createUserId),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  areas: many(areas),
  projects: many(projects),
  tasks: many(tasks),
  tags: many(tags),
  apiKeys: many(apiKeys),
}))

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey().$defaultFn(createSessionId),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey().$defaultFn(createAccountId),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp_ms",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp_ms",
  }),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}))

export const verifications = sqliteTable("verifications", {
  id: text("id").primaryKey().$defaultFn(createVerificationId),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
})

// =============================================================================
// Areas - high-level life categories (e.g., Work, Personal, Health)
// =============================================================================

export const areas = sqliteTable("areas", {
  id: text("id").primaryKey().$defaultFn(createAreaId),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  position: real("position").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  trashedAt: integer("trashed_at", { mode: "timestamp_ms" }),
})

export const areasRelations = relations(areas, ({ one, many }) => ({
  user: one(users, {
    fields: [areas.userId],
    references: [users.id],
  }),
  projects: many(projects),
  tasks: many(tasks),
}))

// =============================================================================
// Projects - collections of tasks with a defined outcome
// =============================================================================

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey().$defaultFn(createProjectId),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  notes: text("notes"),
  status: text("status", { enum: ["active", "completed", "trashed"] })
    .notNull()
    .default("active"),
  position: real("position").notNull().default(0),
  areaId: text("area_id").references(() => areas.id, { onDelete: "set null" }),
  completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  trashedAt: integer("trashed_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
})

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
}))

// =============================================================================
// Headings - sections within projects
// =============================================================================

export const headings = sqliteTable("headings", {
  id: text("id").primaryKey().$defaultFn(createHeadingId),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  position: real("position").notNull().default(0),
  isBacklog: integer("is_backlog", { mode: "boolean" }).notNull().default(false),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  trashedAt: integer("trashed_at", { mode: "timestamp_ms" }),
})

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
}))

// =============================================================================
// Tasks - the core to-do items
// =============================================================================
// Tasks use a "List" model where:
// - listId points to the containing List (Project or Area)
// - headingId points to a grouping Heading within the List (if any)
//
// This replaces the old "parentId" model which overloaded one field for all purposes.
//
// List Types (by ID prefix):
// - prj_xxx = Project (a list that can be completed)
// - area_xxx = Area (a list that never ends)
// - null = Inbox (unprocessed task)
//
// Templates (repeating rules) are stored as tasks with isTemplate=true.
// When spawning a task from a template, we copy all fields including
// checklist items and tags - no JSON blob parsing needed.

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey().$defaultFn(createTaskId),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  notes: text("notes"),
  // Status: null = inbox (unprocessed), active = processed, completed/cancelled/trashed = lifecycle
  status: text("status", {
    enum: ["active", "completed", "cancelled", "trashed"],
  }),
  // Explicit flag for deferred tasks
  isSomeday: integer("is_someday", { mode: "boolean" }).notNull().default(false),

  // Scheduling (stored as YYYY-MM-DD strings)
  scheduledDate: text("scheduled_date"),
  deadline: text("deadline"),
  isEvening: integer("is_evening", { mode: "boolean" }).notNull().default(false),

  // List Hierarchy: Which List does this task belong to?
  // - null = Inbox (unprocessed task)
  // - prj_xxx = belongs to a Project
  // - area_xxx = belongs to an Area
  listId: text("list_id"),

  // Heading: Is this task grouped under a Heading within the List?
  // - null = at the top level of the List
  // - hdg_xxx = grouped under a Heading (only valid when listId is a project)
  headingId: text("heading_id"),

  // Template/Repeating: Templates are tasks with isTemplate=true
  // When a task is spawned from a template, templateId points to the source template
  isTemplate: integer("is_template", { mode: "boolean" }).notNull().default(false),
  // RFC 5545 RRULE for repeating templates (only set when isTemplate=true)
  rrule: text("rrule"),
  // Next occurrence date for templates (YYYY-MM-DD, only set when isTemplate=true)
  nextOccurrence: text("next_occurrence"),
  // For spawned tasks, points to the template they were created from
  templateId: text("template_id"),

  // Timestamps
  // Note: completedAt is used for both completed and cancelled status
  completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  trashedAt: integer("trashed_at", { mode: "timestamp_ms" }),
  // Logged flag - when true, task only appears in logbook (not in "completed today" sections)
  isLogged: integer("is_logged", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
  // List relation: task belongs to a Project or Area via listId
  // Note: This is a polymorphic relation - listId can reference either table
  // The ID prefix (prj_ or area_) determines which table to use at runtime
  project: one(projects, {
    fields: [tasks.listId],
    references: [projects.id],
  }),
  area: one(areas, {
    fields: [tasks.listId],
    references: [areas.id],
  }),
  // Heading relation: task can be grouped under a heading within a project
  heading: one(headings, {
    fields: [tasks.headingId],
    references: [headings.id],
  }),
  // Self-reference for template relationship
  template: one(tasks, {
    fields: [tasks.templateId],
    references: [tasks.id],
    relationName: "templateTasks",
  }),
  spawnedTasks: many(tasks, { relationName: "templateTasks" }),
  checklistItems: many(checklistItems),
  taskTags: many(taskTags),
}))

// =============================================================================
// Checklist Items - sub-tasks within a task
// =============================================================================

export const checklistItems = sqliteTable("checklist_items", {
  id: text("id").primaryKey().$defaultFn(createChecklistItemId),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  position: real("position").notNull().default(0),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  trashedAt: integer("trashed_at", { mode: "timestamp_ms" }),
})

export const checklistItemsRelations = relations(checklistItems, ({ one }) => ({
  user: one(users, {
    fields: [checklistItems.userId],
    references: [users.id],
  }),
  task: one(tasks, {
    fields: [checklistItems.taskId],
    references: [tasks.id],
  }),
}))

// =============================================================================
// Tags - for categorizing tasks
// =============================================================================

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey().$defaultFn(createTagId),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  position: real("position").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  trashedAt: integer("trashed_at", { mode: "timestamp_ms" }),
})

export const tagsRelations = relations(tags, ({ one, many }) => ({
  user: one(users, {
    fields: [tags.userId],
    references: [users.id],
  }),
  taskTags: many(taskTags),
}))

// =============================================================================
// Task-Tag junction table
// =============================================================================

export const taskTags = sqliteTable("task_tags", {
  id: text("id").primaryKey().$defaultFn(createTaskTagId),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  tagId: text("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  trashedAt: integer("trashed_at", { mode: "timestamp_ms" }),
})

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
}))

// =============================================================================
// Task Ordering - per "list context" ordering (Things-style)
// Each task can have different positions in different contexts.
// The context matches the task's immediate visual container.
// =============================================================================

export const taskOrderings = sqliteTable(
  "task_orderings",
  {
    id: text("id").primaryKey().$defaultFn(createTaskOrderingId),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Context types match the task's immediate visual container:
    // - inbox: unprocessed tasks (parentId is null)
    // - today: tasks scheduled for today (system view)
    // - upcoming: tasks with future scheduled dates (contextId = date YYYY-MM-DD)
    // - anytime: active tasks without scheduled date (system view)
    // - someday: deferred tasks (system view)
    // - logbook: completed tasks (system view)
    // - trash: trashed tasks (system view)
    // - project: tasks directly in a project (contextId = prj_xxx)
    // - heading: tasks in a heading (contextId = hdg_xxx)
    // - area: tasks in an area without project (contextId = area_xxx)
    contextType: text("context_type", {
      enum: ["inbox", "today", "upcoming", "anytime", "someday", "logbook", "trash", "project", "heading", "area"],
    }).notNull(),
    // For structural contexts (project/heading/area), this is the parent ID
    // For upcoming context, this is the date string (YYYY-MM-DD)
    // For other system views (inbox/today/anytime/someday/logbook/trash), this is null
    contextId: text("context_id"),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    position: real("position").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    // Each task can only have one position per context
    uniqueIndex("task_orderings_unique_idx").on(table.userId, table.contextType, table.contextId, table.taskId),
  ],
)

export const taskOrderingsRelations = relations(taskOrderings, ({ one }) => ({
  user: one(users, {
    fields: [taskOrderings.userId],
    references: [users.id],
  }),
  task: one(tasks, {
    fields: [taskOrderings.taskId],
    references: [tasks.id],
  }),
}))

// =============================================================================
// API Keys - for external integrations
// =============================================================================

export const apiKeys = sqliteTable("api_keys", {
  id: text("id").primaryKey().$defaultFn(createApiKeyId),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  scope: text("scope", { enum: ["read", "read-write"] }).notNull(),
  lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}))

// =============================================================================
// Type exports
// =============================================================================

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert

export type Account = typeof accounts.$inferSelect
export type NewAccount = typeof accounts.$inferInsert

export type Verification = typeof verifications.$inferSelect
export type NewVerification = typeof verifications.$inferInsert

export type Area = typeof areas.$inferSelect
export type NewArea = typeof areas.$inferInsert

export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert

export type Heading = typeof headings.$inferSelect
export type NewHeading = typeof headings.$inferInsert

export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert

export type ChecklistItem = typeof checklistItems.$inferSelect
export type NewChecklistItem = typeof checklistItems.$inferInsert

export type Tag = typeof tags.$inferSelect
export type NewTag = typeof tags.$inferInsert

export type TaskTag = typeof taskTags.$inferSelect
export type NewTaskTag = typeof taskTags.$inferInsert

export type TaskOrdering = typeof taskOrderings.$inferSelect
export type NewTaskOrdering = typeof taskOrderings.$inferInsert

export type ApiKey = typeof apiKeys.$inferSelect
export type NewApiKey = typeof apiKeys.$inferInsert
