import { and, asc, eq, isNull, lte } from "drizzle-orm"
import * as rrulePkg from "rrule"
import { db } from "@/db"

// Handle both ESM and CJS module formats
const RRule = (rrulePkg as any).RRule ?? (rrulePkg as any).default?.RRule

import type { Task, Tag } from "@/db/schema"
import { checklistItems, tasks, tags, taskTags } from "@/db/schema"
import { createId } from "@/lib/id"
import { ensureTaskOrderings } from "./ordering"

// =============================================================================
// Types
// =============================================================================

export type TemplateWithTags = Task & {
  tags: Array<{ id: string; title: string }>
}

export type CreateTemplateInput = {
  userId: string
  rrule: string
  startDate: string
  title: string
  notes?: string | null
  listId?: string | null
  headingId?: string | null
  checklistItems?: Array<{ title: string }>
  tagIds?: string[]
}

export type UpdateTemplateInput = {
  rrule?: string
  nextOccurrence?: string
  status?: "active" | "paused"
  title?: string
  notes?: string | null
  listId?: string | null
  headingId?: string | null
}

// =============================================================================
// RRULE Utilities
// =============================================================================

/**
 * Parse an RRULE string and return clean RRule options suitable for creating a new RRule.
 * This handles the quirks of RRule.fromString() which can leave empty arrays that interfere.
 */
function parseRRuleToOptions(rruleStr: string, dtstart: Date): Partial<InstanceType<typeof RRule>["options"]> {
  const rule = RRule.fromString(rruleStr)
  const opts = rule.options

  // Build clean options, only including non-empty/non-null values
  const cleanOpts: Partial<InstanceType<typeof RRule>["options"]> = {
    freq: opts.freq,
    dtstart,
    interval: opts.interval ?? 1,
    wkst: opts.wkst ?? 0,
  }

  // Handle bymonthday - prefer bynmonthday (negative days like -1 for last day) if present
  if (opts.bynmonthday && opts.bynmonthday.length > 0) {
    cleanOpts.bymonthday = opts.bynmonthday
  } else if (opts.bymonthday && opts.bymonthday.length > 0) {
    cleanOpts.bymonthday = opts.bymonthday
  }

  // Handle other by* options
  if (opts.byweekday && opts.byweekday.length > 0) cleanOpts.byweekday = opts.byweekday
  if (opts.bymonth && opts.bymonth.length > 0) cleanOpts.bymonth = opts.bymonth
  if (opts.byyearday && opts.byyearday.length > 0) cleanOpts.byyearday = opts.byyearday
  if (opts.byweekno && opts.byweekno.length > 0) cleanOpts.byweekno = opts.byweekno
  if (opts.bysetpos && opts.bysetpos.length > 0) cleanOpts.bysetpos = opts.bysetpos
  if (opts.count) cleanOpts.count = opts.count
  if (opts.until) cleanOpts.until = opts.until

  return cleanOpts
}

export function computeNextOccurrence(rruleStr: string, afterDate: string): string | null {
  try {
    // Parse the afterDate as end of day UTC to ensure we get the NEXT day's occurrence
    const after = new Date(`${afterDate}T23:59:59Z`)
    const dtstart = new Date(`${afterDate}T00:00:00Z`)

    const options = parseRRuleToOptions(rruleStr, dtstart)
    const ruleWithStart = new RRule(options)

    // Get the next occurrence after the given date (exclusive)
    const next = ruleWithStart.after(after, false)
    if (!next) return null

    // Format as YYYY-MM-DD using UTC to avoid timezone issues
    const year = next.getUTCFullYear()
    const month = String(next.getUTCMonth() + 1).padStart(2, "0")
    const day = String(next.getUTCDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  } catch (err) {
    console.error("Failed to compute next occurrence:", err)
    return null
  }
}

/**
 * Compute the first occurrence on or after the given start date.
 * This is used when creating a new template - the start date selected
 * may not match the recurrence pattern, so we find the first matching date.
 */
export function computeFirstOccurrence(rruleStr: string, startDate: string): string | null {
  try {
    const start = new Date(`${startDate}T00:00:00Z`)

    const options = parseRRuleToOptions(rruleStr, start)
    const ruleWithStart = new RRule(options)

    // Get the first occurrence on or after the given date (inclusive)
    const first = ruleWithStart.after(start, true)
    if (!first) return null

    // Format as YYYY-MM-DD using UTC to avoid timezone issues
    const year = first.getUTCFullYear()
    const month = String(first.getUTCMonth() + 1).padStart(2, "0")
    const day = String(first.getUTCDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  } catch (err) {
    console.error("Failed to compute first occurrence:", err)
    return null
  }
}

export function describeRRule(rruleStr: string): string {
  try {
    const rule = RRule.fromString(rruleStr)
    const text = rule.toText()
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : "Custom repeat"
  } catch {
    return "Custom repeat"
  }
}

// =============================================================================
// Template CRUD Operations
// =============================================================================

export async function listTemplates(userId: string): Promise<TemplateWithTags[]> {
  const templates = await db.query.tasks.findMany({
    where: and(eq(tasks.userId, userId), eq(tasks.isTemplate, true), isNull(tasks.trashedAt), isNull(tasks.trashedAt)),
    orderBy: asc(tasks.createdAt),
  })

  return await Promise.all(
    templates.map(async (template: Task) => {
      // Get tags for this template
      const templateTags = await db
        .select({
          id: tags.id,
          title: tags.title,
        })
        .from(taskTags)
        .innerJoin(tags, eq(taskTags.tagId, tags.id))
        .where(and(eq(taskTags.taskId, template.id), isNull(taskTags.trashedAt)))

      return { ...template, tags: templateTags }
    }),
  )
}

export async function getTemplateById(id: string, userId: string): Promise<TemplateWithTags | null> {
  const template = await db.query.tasks.findFirst({
    where: and(
      eq(tasks.id, id),
      eq(tasks.userId, userId),
      eq(tasks.isTemplate, true),
      isNull(tasks.trashedAt),
      isNull(tasks.trashedAt),
    ),
  })

  if (!template) return null

  // Get tags for this template
  const templateTags = await db
    .select({
      id: tags.id,
      title: tags.title,
    })
    .from(taskTags)
    .innerJoin(tags, eq(taskTags.tagId, tags.id))
    .where(and(eq(taskTags.taskId, template.id), isNull(taskTags.trashedAt)))

  return { ...template, tags: templateTags }
}

export async function getDueTemplates(today: string, userId: string): Promise<Task[]> {
  return await db.query.tasks.findMany({
    where: and(
      eq(tasks.userId, userId),
      eq(tasks.isTemplate, true),
      eq(tasks.status, "active"),
      isNull(tasks.trashedAt),
      isNull(tasks.trashedAt),
      lte(tasks.nextOccurrence, today),
    ),
  })
}

export async function createTemplate(input: CreateTemplateInput): Promise<string> {
  const now = new Date()

  const [inserted] = await db
    .insert(tasks)
    .values({
      id: createId("task"),
      userId: input.userId,
      title: input.title,
      notes: input.notes ?? null,
      status: "active",
      isTemplate: true,
      rrule: input.rrule,
      nextOccurrence: input.startDate,
      listId: input.listId ?? null,
      headingId: input.headingId ?? null,
      isSomeday: false,
      isEvening: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: tasks.id })

  if (!inserted) {
    throw new Error("Failed to create template")
  }

  const templateId = inserted.id

  // Create checklist items if provided
  if (input.checklistItems?.length) {
    for (const [index, item] of input.checklistItems.entries()) {
      await db.insert(checklistItems).values({
        id: createId("checklistItem"),
        userId: input.userId,
        taskId: templateId,
        title: item.title,
        completed: false,
        position: index + 1,
        createdAt: now,
        updatedAt: now,
      })
    }
  }

  // Create tag associations if provided
  if (input.tagIds?.length) {
    for (const tagId of input.tagIds) {
      await db.insert(taskTags).values({
        id: createId("taskTag"),
        userId: input.userId,
        taskId: templateId,
        tagId,
        createdAt: now,
        updatedAt: now,
      })
    }
  }

  return templateId
}

export async function updateTemplate(id: string, userId: string, input: UpdateTemplateInput): Promise<string> {
  const now = new Date()

  const updateData: Record<string, unknown> = {
    updatedAt: now,
  }

  if (input.rrule !== undefined) updateData.rrule = input.rrule
  if (input.nextOccurrence !== undefined) updateData.nextOccurrence = input.nextOccurrence
  if (input.status !== undefined) updateData.status = input.status
  if (input.title !== undefined) updateData.title = input.title
  if (input.notes !== undefined) updateData.notes = input.notes
  if (input.listId !== undefined) updateData.listId = input.listId
  if (input.headingId !== undefined) updateData.headingId = input.headingId

  await db
    .update(tasks)
    .set(updateData)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId), eq(tasks.isTemplate, true)))

  return id
}

export async function removeTemplate(id: string, userId: string): Promise<string> {
  const now = new Date()
  await db
    .update(tasks)
    .set({ trashedAt: now, updatedAt: now })
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId), eq(tasks.isTemplate, true)))
  return id
}

// =============================================================================
// Template Spawning
// =============================================================================

export async function advanceTemplate(id: string, userId: string): Promise<string | null> {
  const template = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, id), eq(tasks.userId, userId), eq(tasks.isTemplate, true)),
  })

  if (!template?.rrule || !template.nextOccurrence) return null

  const nextDate = computeNextOccurrence(template.rrule, template.nextOccurrence)
  if (!nextDate) {
    await removeTemplate(id, userId)
    return null
  }

  await db
    .update(tasks)
    .set({ nextOccurrence: nextDate, updatedAt: new Date() })
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))

  return nextDate
}

export async function setTemplateNextOccurrenceFromDate(
  id: string,
  params: { afterDate: string },
): Promise<string | null> {
  const template = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, id), eq(tasks.isTemplate, true), isNull(tasks.trashedAt)),
  })

  if (!template?.rrule) return null

  const nextDate = computeNextOccurrence(template.rrule, params.afterDate)
  if (!nextDate) {
    await removeTemplate(id, template.userId)
    return null
  }

  if (template.nextOccurrence && nextDate <= template.nextOccurrence) {
    return template.nextOccurrence
  }

  await db.update(tasks).set({ nextOccurrence: nextDate, updatedAt: new Date() }).where(eq(tasks.id, id))

  return nextDate
}

/**
 * Spawn a new task from a template.
 * This copies all fields from the template including checklist items and tags.
 */
export async function spawnTemplate(templateId: string, userId: string): Promise<string | null> {
  const template = await db.query.tasks.findFirst({
    where: and(
      eq(tasks.id, templateId),
      eq(tasks.userId, userId),
      eq(tasks.isTemplate, true),
      eq(tasks.status, "active"),
      isNull(tasks.trashedAt),
      isNull(tasks.trashedAt),
    ),
  })

  if (!template || !template.nextOccurrence) return null

  // Check if a task already exists for this template and scheduled date
  const existing = await db.query.tasks.findFirst({
    where: and(
      eq(tasks.templateId, templateId),
      eq(tasks.scheduledDate, template.nextOccurrence),
      eq(tasks.userId, userId),
      isNull(tasks.trashedAt),
    ),
  })

  if (existing) {
    // Task already spawned for this date, just advance the template
    await advanceTemplate(templateId, userId)
    return null
  }

  const now = new Date()

  // Create the new task from template
  const [inserted] = await db
    .insert(tasks)
    .values({
      id: createId("task"),
      userId,
      title: template.title,
      notes: template.notes,
      status: "active",
      isSomeday: false,
      scheduledDate: template.nextOccurrence,
      deadline: template.deadline,
      isEvening: template.isEvening,
      listId: template.listId,
      headingId: template.headingId,
      isTemplate: false,
      templateId: template.id,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: tasks.id })

  if (!inserted) {
    throw new Error("Failed to spawn task from template")
  }

  const taskId = inserted.id

  // Fetch the full task to create orderings
  const [spawnedTask] = await db.select().from(tasks).where(eq(tasks.id, taskId))
  if (spawnedTask) {
    await ensureTaskOrderings(userId, spawnedTask)
  }

  // Copy checklist items from template
  const templateChecklistItems = await db.query.checklistItems.findMany({
    where: and(
      eq(checklistItems.taskId, templateId),
      eq(checklistItems.userId, userId),
      isNull(checklistItems.trashedAt),
    ),
    orderBy: asc(checklistItems.position),
  })

  for (const item of templateChecklistItems) {
    await db.insert(checklistItems).values({
      id: createId("checklistItem"),
      userId,
      taskId,
      title: item.title,
      completed: false,
      position: item.position,
      createdAt: now,
      updatedAt: now,
    })
  }

  // Copy tags from template
  const templateTagRelations = await db.query.taskTags.findMany({
    where: and(eq(taskTags.taskId, templateId), eq(taskTags.userId, userId), isNull(taskTags.trashedAt)),
  })

  for (const tagRelation of templateTagRelations) {
    await db.insert(taskTags).values({
      id: createId("taskTag"),
      userId,
      taskId,
      tagId: tagRelation.tagId,
      createdAt: now,
      updatedAt: now,
    })
  }

  await advanceTemplate(templateId, userId)
  return taskId
}

export async function spawnDueTemplates(today: string, userId: string): Promise<string[]> {
  const dueTemplates = await getDueTemplates(today, userId)
  const created: string[] = []

  for (const template of dueTemplates) {
    const taskId = await spawnTemplate(template.id, userId)
    if (taskId) created.push(taskId)
  }

  return created
}

// =============================================================================
// Convert Task to Template
// =============================================================================

export async function createTemplateFromTask(
  taskId: string,
  rrule: string,
  startDate: string,
  userId: string,
): Promise<string> {
  const task = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
  })
  if (!task) throw new Error("Task not found")

  const taskChecklistItems = await db.query.checklistItems.findMany({
    where: and(eq(checklistItems.taskId, taskId), eq(checklistItems.userId, userId), isNull(checklistItems.trashedAt)),
    orderBy: asc(checklistItems.position),
  })

  const taskTagRelations = await db.query.taskTags.findMany({
    where: and(eq(taskTags.taskId, taskId), eq(taskTags.userId, userId), isNull(taskTags.trashedAt)),
  })

  const tagIds = taskTagRelations.map((tt) => tt.tagId)

  // Compute the first occurrence on or after startDate that matches the rrule pattern
  const firstOccurrence = computeFirstOccurrence(rrule, startDate)
  if (!firstOccurrence) {
    throw new Error("Could not compute first occurrence from rrule")
  }

  const templateId = await createTemplate({
    userId,
    rrule,
    startDate: firstOccurrence,
    title: task.title,
    notes: task.notes,
    listId: task.listId,
    headingId: task.headingId,
    checklistItems: taskChecklistItems.map((item) => ({ title: item.title })),
    tagIds,
  })

  // Delete the original task - it's now a template
  await db
    .update(tasks)
    .set({
      trashedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))

  return templateId
}

/**
 * Update a template from its spawned task (sync changes back to template)
 */
export async function updateTemplateFromTask(taskId: string): Promise<void> {
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
  })

  if (!task?.templateId) return

  const taskChecklistItems = await db.query.checklistItems.findMany({
    where: and(
      eq(checklistItems.taskId, taskId),
      eq(checklistItems.userId, task.userId),
      isNull(checklistItems.trashedAt),
    ),
    orderBy: asc(checklistItems.position),
  })

  const taskTagRelations = await db.query.taskTags.findMany({
    where: and(eq(taskTags.taskId, taskId), eq(taskTags.userId, task.userId), isNull(taskTags.trashedAt)),
  })

  // Update template basic fields
  await updateTemplate(task.templateId, task.userId, {
    title: task.title,
    notes: task.notes,
    listId: task.listId,
    headingId: task.headingId,
  })

  // Delete existing template checklist items and recreate
  await db.update(checklistItems).set({ trashedAt: new Date() }).where(eq(checklistItems.taskId, task.templateId))

  const now = new Date()
  for (const [index, item] of taskChecklistItems.entries()) {
    await db.insert(checklistItems).values({
      id: createId("checklistItem"),
      userId: task.userId,
      taskId: task.templateId,
      title: item.title,
      completed: false,
      position: index + 1,
      createdAt: now,
      updatedAt: now,
    })
  }

  // Delete existing template tags and recreate
  await db.update(taskTags).set({ trashedAt: new Date() }).where(eq(taskTags.taskId, task.templateId))

  for (const tagRelation of taskTagRelations) {
    await db.insert(taskTags).values({
      id: createId("taskTag"),
      userId: task.userId,
      taskId: task.templateId,
      tagId: tagRelation.tagId,
      createdAt: now,
      updatedAt: now,
    })
  }
}

// =============================================================================
// Template Formatting for API
// =============================================================================

export async function formatTemplateResponse(template: Task) {
  // Get tags for this template
  const templateTags = await db
    .select({
      id: tags.id,
      title: tags.title,
    })
    .from(taskTags)
    .innerJoin(tags, eq(taskTags.tagId, tags.id))
    .where(and(eq(taskTags.taskId, template.id), isNull(taskTags.trashedAt)))

  // Get checklist items for this template
  const templateChecklist = await db.query.checklistItems.findMany({
    where: and(eq(checklistItems.taskId, template.id), isNull(checklistItems.trashedAt)),
    orderBy: asc(checklistItems.position),
  })

  // For backwards compatibility with old API format, include serialized versions
  const checklistTemplate =
    templateChecklist.length > 0 ? JSON.stringify(templateChecklist.map((item) => ({ title: item.title }))) : null
  const tagsTemplate = templateTags.length > 0 ? JSON.stringify(templateTags.map((t) => t.id)) : null

  return {
    id: template.id,
    title: template.title,
    notes: template.notes,
    rrule: template.rrule ?? "",
    nextOccurrence: template.nextOccurrence ?? "",
    status: template.status ?? "active",
    listId: template.listId,
    headingId: template.headingId,
    checklistTemplate,
    tagsTemplate,
    tags: templateTags,
    createdAt: template.createdAt.toISOString(),
  }
}
