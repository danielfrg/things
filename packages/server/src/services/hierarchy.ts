import { and, eq, inArray, isNull, or } from "drizzle-orm"
import { db } from "@/db"
import { areas, headings, projects, tasks } from "@/db/schema"
import { getListType, isProjectId, type ListType } from "@/lib/id"

// =============================================================================
// Hierarchy Service
// =============================================================================
// With the new listId + headingId model, hierarchy derivation is much simpler.
// - listId directly tells us which List (Project or Area) a task belongs to
// - headingId tells us which Heading a task is grouped under (if any)
// - No more complex derivation from a single parentId field

/**
 * Get the ordering context type and ID from listId and headingId.
 * Used for task_orderings table.
 */
export function getOrderingContext(
  listId: string | null,
  headingId: string | null,
): { contextType: string; contextId: string | null } {
  // If task has a heading, it's ordered within that heading
  if (headingId) {
    return { contextType: "heading", contextId: headingId }
  }

  // If task has a list, determine if it's a project or area
  if (listId) {
    const listType = getListType(listId)
    if (listType === "project") {
      return { contextType: "project", contextId: listId }
    }
    if (listType === "area") {
      return { contextType: "area", contextId: listId }
    }
  }

  // No list = inbox
  return { contextType: "inbox", contextId: null }
}

/**
 * Validate that a listId points to a valid entity that belongs to the user.
 */
export async function validateListId(
  listId: string | null,
  userId: string,
): Promise<{ valid: boolean; error?: string }> {
  if (!listId) {
    return { valid: true }
  }

  const listType = getListType(listId)

  switch (listType) {
    case "area": {
      const [area] = await db.select().from(areas).where(eq(areas.id, listId)).limit(1)
      if (!area) {
        return { valid: false, error: "Area not found" }
      }
      if (area.userId !== userId) {
        return { valid: false, error: "Area does not belong to user" }
      }
      return { valid: true }
    }

    case "project": {
      const [project] = await db.select().from(projects).where(eq(projects.id, listId)).limit(1)
      if (!project) {
        return { valid: false, error: "Project not found" }
      }
      if (project.userId !== userId) {
        return { valid: false, error: "Project does not belong to user" }
      }
      return { valid: true }
    }

    default:
      return { valid: false, error: "Invalid list ID prefix" }
  }
}

/**
 * Validate that a headingId points to a valid heading that belongs to the user.
 * Optionally validates that the heading belongs to the specified project (listId).
 */
export async function validateHeadingId(
  headingId: string | null,
  userId: string,
  listId?: string | null,
): Promise<{ valid: boolean; error?: string }> {
  if (!headingId) {
    return { valid: true }
  }

  const [heading] = await db.select().from(headings).where(eq(headings.id, headingId)).limit(1)
  if (!heading) {
    return { valid: false, error: "Heading not found" }
  }
  if (heading.userId !== userId) {
    return { valid: false, error: "Heading does not belong to user" }
  }

  // If listId is provided, validate the heading belongs to that project
  if (listId && heading.projectId !== listId) {
    return { valid: false, error: "Heading does not belong to the specified project" }
  }

  return { valid: true }
}

/**
 * Get the projectId for a task, looking up from heading if necessary.
 * With the new model, if listId is a project, that's the projectId.
 * If listId is an area and there's a headingId, we need to look up the heading's project.
 * (Note: In the new model, headings should only exist for projects, not areas)
 */
export async function getProjectIdForTask(listId: string | null, headingId: string | null): Promise<string | null> {
  if (!listId) return null

  const listType = getListType(listId)

  // If the list is a project, that's the projectId
  if (listType === "project") {
    return listId
  }

  // If the list is an area, there's no project (areas don't have headings in this model)
  // But if somehow there's a headingId, we could look it up
  if (headingId) {
    const [heading] = await db
      .select({ projectId: headings.projectId })
      .from(headings)
      .where(eq(headings.id, headingId))
      .limit(1)
    return heading?.projectId ?? null
  }

  return null
}

/**
 * Get the areaId for a task.
 * - If listId is an area, that's the areaId.
 * - If listId is a project, look up the project's areaId.
 */
export async function getAreaIdForTask(listId: string | null): Promise<string | null> {
  if (!listId) return null

  const listType = getListType(listId)

  // If the list is an area, that's the areaId
  if (listType === "area") {
    return listId
  }

  // If the list is a project, look up its areaId
  if (listType === "project") {
    const [project] = await db
      .select({ areaId: projects.areaId })
      .from(projects)
      .where(eq(projects.id, listId))
      .limit(1)
    return project?.areaId ?? null
  }

  return null
}

// =============================================================================
// Descendant Resolution - Find all entities under a parent
// =============================================================================
// These functions are used by cascade operations (complete, trash, delete)
// to find all tasks that belong to a project or area.

/**
 * Filter options for task queries.
 */
export interface TaskFilter {
  /** Exclude tasks where trashedAt is set (default: false) */
  excludeTrashed?: boolean
  /** Exclude template tasks (default: true) */
  excludeTemplates?: boolean
  /** Only include active tasks (status = 'active' or null) (default: false) */
  onlyActive?: boolean
}

/**
 * Get all heading IDs for a project.
 */
export async function getProjectHeadingIds(projectId: string, userId: string): Promise<string[]> {
  const projectHeadings = await db
    .select({ id: headings.id })
    .from(headings)
    .where(and(eq(headings.projectId, projectId), eq(headings.userId, userId)))

  return projectHeadings.map((h) => h.id)
}

/**
 * Get all task IDs under a project (direct children + tasks in headings).
 * With the new model: listId = projectId, or headingId in project's headings
 */
export async function getProjectTaskIds(projectId: string, userId: string, filter: TaskFilter = {}): Promise<string[]> {
  const { excludeTrashed = false, excludeTemplates = true, onlyActive = false } = filter

  // Build conditions - tasks directly in project OR in any heading of the project
  const conditions = [
    eq(tasks.userId, userId),
    or(
      // Task directly in project (listId = projectId, no headingId)
      eq(tasks.listId, projectId),
      // Note: Tasks with headingId will also have listId = projectId in the new model
    ),
  ]

  if (excludeTrashed) conditions.push(isNull(tasks.trashedAt))
  if (excludeTemplates) conditions.push(eq(tasks.isTemplate, false))
  if (onlyActive) {
    const activeCondition = or(eq(tasks.status, "active"), isNull(tasks.status))
    if (activeCondition) conditions.push(activeCondition)
  }

  const result = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(...conditions))

  return result.map((t) => t.id)
}

/**
 * Get all project IDs that belong to an area.
 */
export async function getAreaProjectIds(
  areaId: string,
  userId: string,
  options: { excludeTrashed?: boolean } = {},
): Promise<string[]> {
  const { excludeTrashed = false } = options

  const conditions = [eq(projects.areaId, areaId), eq(projects.userId, userId)]

  if (excludeTrashed) conditions.push(isNull(projects.trashedAt))

  const areaProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(...conditions))

  return areaProjects.map((p) => p.id)
}

/**
 * Get all task IDs directly under an area (listId = areaId, not in projects).
 */
export async function getAreaDirectTaskIds(areaId: string, userId: string, filter: TaskFilter = {}): Promise<string[]> {
  const { excludeTrashed = false, excludeTemplates = true } = filter

  const conditions = [eq(tasks.userId, userId), eq(tasks.listId, areaId)]

  if (excludeTrashed) conditions.push(isNull(tasks.trashedAt))
  if (excludeTemplates) conditions.push(eq(tasks.isTemplate, false))

  const result = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(...conditions))

  return result.map((t) => t.id)
}

/**
 * Get all task IDs under an area (direct children + tasks in projects + tasks in headings).
 * This aggregates tasks from:
 * 1. Direct area tasks (listId = areaId)
 * 2. Tasks in each project belonging to the area
 */
export async function getAreaTaskIds(areaId: string, userId: string, filter: TaskFilter = {}): Promise<string[]> {
  // Get direct tasks under the area
  const directTaskIds = await getAreaDirectTaskIds(areaId, userId, filter)

  // Get all projects in the area (exclude trashed to match filter behavior)
  const projectIds = await getAreaProjectIds(areaId, userId, {
    excludeTrashed: filter.excludeTrashed,
  })

  // Get tasks from each project
  const projectTaskIds: string[] = []
  for (const projectId of projectIds) {
    const taskIds = await getProjectTaskIds(projectId, userId, filter)
    projectTaskIds.push(...taskIds)
  }

  return [...directTaskIds, ...projectTaskIds]
}
