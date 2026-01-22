import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import {
  apiKeys,
  areas,
  checklistItems,
  headings,
  projects,
  repeatingRules,
  tags,
  taskOrderings,
  tasks,
  taskTags,
} from './schema';

// =============================================================================
// Select Schemas (for reading data from DB)
// =============================================================================

export const areaSchema = createSelectSchema(areas);
export const projectSchema = createSelectSchema(projects);
export const headingSchema = createSelectSchema(headings);
export const taskSchema = createSelectSchema(tasks);
export const checklistItemSchema = createSelectSchema(checklistItems);
export const tagSchema = createSelectSchema(tags);
export const taskTagSchema = createSelectSchema(taskTags);
export const taskOrderingSchema = createSelectSchema(taskOrderings);
export const repeatingRuleSchema = createSelectSchema(repeatingRules);
export const apiKeySchema = createSelectSchema(apiKeys);

// =============================================================================
// Insert Schemas (for creating new records)
// =============================================================================

export const insertAreaSchema = createInsertSchema(areas, {
  title: z.string().min(1),
}).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });

export const insertProjectSchema = createInsertSchema(projects, {
  title: z.string().min(1),
}).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });

export const insertHeadingSchema = createInsertSchema(headings, {
  title: z.string().min(1),
}).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });

export const insertTaskSchema = createInsertSchema(tasks, {
  title: z.string().min(1),
}).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });

export const insertChecklistItemSchema = createInsertSchema(checklistItems, {
  title: z.string().min(1),
}).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });

export const insertTagSchema = createInsertSchema(tags, {
  title: z.string().min(1),
}).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });

export const insertTaskTagSchema = createInsertSchema(taskTags).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const insertTaskOrderingSchema = createInsertSchema(taskOrderings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const insertRepeatingRuleSchema = createInsertSchema(repeatingRules, {
  title: z.string().min(1),
  rrule: z.string().min(1),
  nextOccurrence: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });

export const insertApiKeySchema = createInsertSchema(apiKeys, {
  name: z.string().min(1),
  keyHash: z.string().min(1),
  keyPrefix: z.string().min(1),
}).omit({ id: true, createdAt: true });

// =============================================================================
// Update Schemas (partial versions for updates)
// =============================================================================

export const updateAreaSchema = insertAreaSchema.partial();
export const updateProjectSchema = insertProjectSchema.partial();
export const updateHeadingSchema = insertHeadingSchema.partial();
export const updateTaskSchema = insertTaskSchema.partial();
export const updateChecklistItemSchema = insertChecklistItemSchema.partial();
export const updateTagSchema = insertTagSchema.partial();
export const updateTaskOrderingSchema = insertTaskOrderingSchema.partial();
export const updateRepeatingRuleSchema = insertRepeatingRuleSchema.partial();

// =============================================================================
// Type Inference
// =============================================================================

// Select types (full records from DB)
export type AreaRecord = z.infer<typeof areaSchema>;
export type ProjectRecord = z.infer<typeof projectSchema>;
export type HeadingRecord = z.infer<typeof headingSchema>;
export type TaskRecord = z.infer<typeof taskSchema>;
export type ChecklistItemRecord = z.infer<typeof checklistItemSchema>;
export type TagRecord = z.infer<typeof tagSchema>;
export type TaskTagRecord = z.infer<typeof taskTagSchema>;
export type TaskOrderingRecord = z.infer<typeof taskOrderingSchema>;
export type RepeatingRuleRecord = z.infer<typeof repeatingRuleSchema>;
export type ApiKeyRecord = z.infer<typeof apiKeySchema>;

// Insert types (for creating new records)
export type InsertArea = z.infer<typeof insertAreaSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertHeading = z.infer<typeof insertHeadingSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type InsertChecklistItem = z.infer<typeof insertChecklistItemSchema>;
export type InsertTag = z.infer<typeof insertTagSchema>;
export type InsertTaskTag = z.infer<typeof insertTaskTagSchema>;
export type InsertTaskOrdering = z.infer<typeof insertTaskOrderingSchema>;
export type InsertRepeatingRule = z.infer<typeof insertRepeatingRuleSchema>;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;

// Update types (partial for updates)
export type UpdateArea = z.infer<typeof updateAreaSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;
export type UpdateHeading = z.infer<typeof updateHeadingSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;
export type UpdateChecklistItem = z.infer<typeof updateChecklistItemSchema>;
export type UpdateTag = z.infer<typeof updateTagSchema>;
export type UpdateTaskOrdering = z.infer<typeof updateTaskOrderingSchema>;
export type UpdateRepeatingRule = z.infer<typeof updateRepeatingRuleSchema>;
