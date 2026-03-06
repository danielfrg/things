import { parseLocalDate } from "@danielfrg/things-sdk"
import { and, eq, or, sql } from "drizzle-orm"
import { db } from "@/db"
import { taskOrderings, type Task } from "@/db/schema"
import { createId, getListType } from "@/lib/id"

// =============================================================================
// Types
// =============================================================================

export type ContextType =
  | "inbox"
  | "today"
  | "upcoming"
  | "anytime"
  | "someday"
  | "logbook"
  | "trash"
  | "project"
  | "heading"
  | "area"

export interface OrderingContext {
  type: ContextType
  id: string | null // projectId, headingId, areaId, or date string for upcoming
}

function isDateTodayOrOverdue(dateStr: string | null, todayStart: Date): boolean {
  if (!dateStr) return false
  return parseLocalDate(dateStr) <= todayStart
}

function isCompletedToday(task: Task, todayStart: Date): boolean {
  if (!task.completedAt) return false
  const completedStart = new Date(task.completedAt)
  completedStart.setHours(0, 0, 0, 0)
  return completedStart.getTime() === todayStart.getTime()
}

function belongsInToday(task: Task): boolean {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const dueTodayOrOverdue =
    isDateTodayOrOverdue(task.scheduledDate, todayStart) || isDateTodayOrOverdue(task.deadline, todayStart)

  // Completed tasks are shown in Today only if completed today.
  if (task.completedAt && task.status !== "cancelled") {
    return isCompletedToday(task, todayStart)
  }

  // Cancelled tasks are shown in Today if they are due today/overdue OR cancelled today.
  if (task.status === "cancelled") {
    return dueTodayOrOverdue || isCompletedToday(task, todayStart)
  }

  // Active/inbox tasks are shown in Today if due today/overdue.
  return dueTodayOrOverdue
}

// =============================================================================
// Context Determination
// =============================================================================

/**
 * Determine which contexts a task should appear in based on its properties.
 * A task can appear in multiple contexts (e.g., both "today" and its structural parent).
 *
 * Structural context is determined by listId and headingId:
 * - listId = null → no structural context (inbox only if status is null)
 * - listId = area_xxx → area context
 * - listId = prj_xxx → project context
 * - headingId = hdg_xxx → heading context (in addition to project)
 */
export function getTaskContexts(task: Task): OrderingContext[] {
  const contexts: OrderingContext[] = []

  // Trashed tasks only appear in trash
  if (task.trashedAt || task.status === "trashed") {
    contexts.push({ type: "trash", id: null })
    return contexts
  }

  // Completed tasks appear in logbook and can also appear in Today (if completed today).
  if (task.status === "completed") {
    contexts.push({ type: "logbook", id: null })
    if (belongsInToday(task)) {
      contexts.push({ type: "today", id: null })
    }
    return contexts
  }

  // Inbox tasks (null status)
  if (task.status === null) {
    contexts.push({ type: "inbox", id: null })
    if (belongsInToday(task)) {
      contexts.push({ type: "today", id: null })
    }
    return contexts
  }

  // Active tasks can appear in multiple views
  if (task.status === "active") {
    // System view contexts (mutually exclusive)
    if (task.isSomeday) {
      contexts.push({ type: "someday", id: null })
    } else if (task.scheduledDate) {
      // Today view handles overdue + today
      // Upcoming view handles future dates
      contexts.push({ type: "upcoming", id: task.scheduledDate })
    } else {
      // Anytime tasks (no schedule, not someday)
      contexts.push({ type: "anytime", id: null })
    }

    // Structural context based on listId and headingId
    if (task.headingId) {
      // Task is in a heading - order by heading context
      contexts.push({ type: "heading", id: task.headingId })
    } else if (task.listId) {
      // Task is directly in a list (project or area)
      const listType = getListType(task.listId)
      if (listType === "project") {
        contexts.push({ type: "project", id: task.listId })
      } else if (listType === "area") {
        contexts.push({ type: "area", id: task.listId })
      }
    }

    // Today view context for due/overdue tasks.
    if (belongsInToday(task)) {
      contexts.push({ type: "today", id: null })
    }
  }

  // Cancelled tasks appear in logbook (like completed tasks) and can also appear in Today.
  if (task.status === "cancelled") {
    contexts.push({ type: "logbook", id: null })
    if (belongsInToday(task)) {
      contexts.push({ type: "today", id: null })
    }
  }

  return contexts
}

// =============================================================================
// Position Management
// =============================================================================

/**
 * Get the position of a task in a specific context.
 * Returns null if the task has no ordering in that context.
 */
export async function getTaskPosition(
  userId: string,
  taskId: string,
  contextType: ContextType,
  contextId: string | null,
): Promise<number | null> {
  const result = await db
    .select({ position: taskOrderings.position })
    .from(taskOrderings)
    .where(
      and(
        eq(taskOrderings.userId, userId),
        eq(taskOrderings.taskId, taskId),
        eq(taskOrderings.contextType, contextType),
        contextId ? eq(taskOrderings.contextId, contextId) : sql`${taskOrderings.contextId} IS NULL`,
      ),
    )
    .limit(1)

  return result[0]?.position ?? null
}

/**
 * Set the position of a task in a specific context.
 * Creates the ordering if it doesn't exist.
 */
export async function setTaskPosition(
  userId: string,
  taskId: string,
  contextType: ContextType,
  contextId: string | null,
  position: number,
): Promise<void> {
  // Try to update existing ordering
  const updated = await db
    .update(taskOrderings)
    .set({ position, updatedAt: new Date() })
    .where(
      and(
        eq(taskOrderings.userId, userId),
        eq(taskOrderings.taskId, taskId),
        eq(taskOrderings.contextType, contextType),
        contextId ? eq(taskOrderings.contextId, contextId) : sql`${taskOrderings.contextId} IS NULL`,
      ),
    )
    .returning()

  // If no existing ordering, create one
  if (updated.length === 0) {
    await db.insert(taskOrderings).values({
      id: createId("taskOrdering"),
      userId,
      taskId,
      contextType,
      contextId,
      position,
    })
  }
}

/**
 * Get the minimum position in a context (for inserting at top).
 */
export async function getMinPosition(
  userId: string,
  contextType: ContextType,
  contextId: string | null,
): Promise<number> {
  const result = await db
    .select({ minPos: sql<number>`MIN(${taskOrderings.position})` })
    .from(taskOrderings)
    .where(
      and(
        eq(taskOrderings.userId, userId),
        eq(taskOrderings.contextType, contextType),
        contextId ? eq(taskOrderings.contextId, contextId) : sql`${taskOrderings.contextId} IS NULL`,
      ),
    )

  return result[0]?.minPos ?? 0
}

/**
 * Get the maximum position in a context (for inserting at bottom).
 */
export async function getMaxPosition(
  userId: string,
  contextType: ContextType,
  contextId: string | null,
): Promise<number> {
  const result = await db
    .select({ maxPos: sql<number>`MAX(${taskOrderings.position})` })
    .from(taskOrderings)
    .where(
      and(
        eq(taskOrderings.userId, userId),
        eq(taskOrderings.contextType, contextType),
        contextId ? eq(taskOrderings.contextId, contextId) : sql`${taskOrderings.contextId} IS NULL`,
      ),
    )

  return result[0]?.maxPos ?? 0
}

/**
 * Remove all orderings for a task (when task is deleted).
 */
export async function removeTaskOrderings(userId: string, taskId: string): Promise<void> {
  await db.delete(taskOrderings).where(and(eq(taskOrderings.userId, userId), eq(taskOrderings.taskId, taskId)))
}

/**
 * Remove ordering for a task in a specific context.
 */
export async function removeTaskOrdering(
  userId: string,
  taskId: string,
  contextType: ContextType,
  contextId: string | null,
): Promise<void> {
  await db
    .delete(taskOrderings)
    .where(
      and(
        eq(taskOrderings.userId, userId),
        eq(taskOrderings.taskId, taskId),
        eq(taskOrderings.contextType, contextType),
        contextId ? eq(taskOrderings.contextId, contextId) : sql`${taskOrderings.contextId} IS NULL`,
      ),
    )
}

/**
 * Ensure task has orderings for all its relevant contexts.
 * Called when a task is created or updated.
 */
export async function ensureTaskOrderings(userId: string, task: Task): Promise<void> {
  const contexts = getTaskContexts(task)

  // Fetch all existing orderings for this task in one query
  const existing = await db
    .select()
    .from(taskOrderings)
    .where(and(eq(taskOrderings.userId, userId), eq(taskOrderings.taskId, task.id)))

  const existingSet = new Set(existing.map((o) => `${o.contextType}:${o.contextId ?? ""}`))
  const missing = contexts.filter((c) => !existingSet.has(`${c.type}:${c.id ?? ""}`))

  // Batch fetch min positions for all missing contexts in parallel
  if (missing.length > 0) {
    const minPositions = await Promise.all(missing.map((c) => getMinPosition(userId, c.type, c.id)))
    // Batch insert new orderings
    await db.insert(taskOrderings).values(
      missing.map((c, i) => ({
        id: createId("taskOrdering"),
        userId,
        taskId: task.id,
        contextType: c.type,
        contextId: c.id,
        position: (minPositions[i] ?? 0) - 1,
      })),
    )
  }

  // Batch delete stale orderings in one query
  const relevantSet = new Set(contexts.map((c) => `${c.type}:${c.id ?? ""}`))
  const stale = existing.filter((o) => !relevantSet.has(`${o.contextType}:${o.contextId ?? ""}`))

  if (stale.length > 0) {
    const conditions = stale.map((o) =>
      and(
        eq(taskOrderings.contextType, o.contextType),
        o.contextId ? eq(taskOrderings.contextId, o.contextId) : sql`${taskOrderings.contextId} IS NULL`,
      ),
    )
    await db
      .delete(taskOrderings)
      .where(and(eq(taskOrderings.userId, userId), eq(taskOrderings.taskId, task.id), or(...conditions)))
  }
}

/**
 * Reorder tasks in a specific context.
 * Takes an array of task IDs in the desired order and updates positions.
 */
export async function reorderTasksInContext(
  userId: string,
  taskIds: string[],
  contextType: ContextType,
  contextId: string | null,
): Promise<void> {
  // Update all task positions in parallel
  await Promise.all(taskIds.map((id, i) => setTaskPosition(userId, id, contextType, contextId, i)))
}

/**
 * Get all task IDs in a context, ordered by position.
 */
export async function getOrderedTaskIds(
  userId: string,
  contextType: ContextType,
  contextId: string | null,
): Promise<string[]> {
  const result = await db
    .select({ taskId: taskOrderings.taskId })
    .from(taskOrderings)
    .where(
      and(
        eq(taskOrderings.userId, userId),
        eq(taskOrderings.contextType, contextType),
        contextId ? eq(taskOrderings.contextId, contextId) : sql`${taskOrderings.contextId} IS NULL`,
      ),
    )
    .orderBy(taskOrderings.position)

  return result.map((r) => r.taskId)
}

/**
 * Get position map for tasks in a context.
 * Returns a Map of taskId -> position.
 */
export async function getPositionMap(
  userId: string,
  contextType: ContextType,
  contextId: string | null,
): Promise<Map<string, number>> {
  const result = await db
    .select({ taskId: taskOrderings.taskId, position: taskOrderings.position })
    .from(taskOrderings)
    .where(
      and(
        eq(taskOrderings.userId, userId),
        eq(taskOrderings.contextType, contextType),
        contextId ? eq(taskOrderings.contextId, contextId) : sql`${taskOrderings.contextId} IS NULL`,
      ),
    )

  const map = new Map<string, number>()
  for (const row of result) {
    map.set(row.taskId, row.position)
  }
  return map
}
