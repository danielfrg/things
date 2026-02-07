import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/db"
import { projects, tasks } from "@/db/schema"
import { Bus } from "../bus"
import { getProjectTaskIds } from "./hierarchy"

/**
 * Get count of active tasks in a project (direct or via headings)
 */
export async function getProjectActiveTaskCount(projectId: string, userId: string): Promise<number> {
  const taskIds = await getProjectTaskIds(projectId, userId, {
    excludeTrashed: true,
    excludeTemplates: true,
    onlyActive: true,
  })
  return taskIds.length
}

/**
 * Complete a project and cascade the completion to all active tasks.
 * Tasks are marked as completed with completedAt set.
 */
export async function completeProject(
  projectId: string,
  userId: string,
): Promise<{ success: boolean; affectedTasks: number }> {
  const now = new Date()

  // Get all active tasks that will be affected
  const taskIds = await getProjectTaskIds(projectId, userId, {
    excludeTrashed: true,
    excludeTemplates: true,
    onlyActive: true,
  })

  // Update all active tasks to completed and logged
  if (taskIds.length > 0) {
    await db
      .update(tasks)
      .set({
        status: "completed",
        completedAt: now,
        isLogged: true,
        scheduledDate: null,
        isEvening: false,
        updatedAt: now,
      })
      .where(inArray(tasks.id, taskIds))
  }

  // Update the project status to completed
  const [project] = await db
    .update(projects)
    .set({
      status: "completed",
      completedAt: now,
      updatedAt: now,
    })
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .returning()

  if (!project) {
    return { success: false, affectedTasks: 0 }
  }

  // Publish project update event
  Bus.publish({
    type: "project.updated",
    userId,
    properties: {
      id: project.id,
      title: project.title,
      notes: project.notes,
      status: project.status,
      position: project.position,
      areaId: project.areaId,
      completedAt: project.completedAt?.toISOString() ?? null,
      trashedAt: project.trashedAt?.toISOString() ?? null,
      createdAt: project.createdAt.toISOString(),
    },
  })

  return { success: true, affectedTasks: taskIds.length }
}

/**
 * Trash a project and cascade the deletion to all non-trashed tasks.
 * Tasks are marked as trashed with trashedAt set.
 */
export async function trashProject(
  projectId: string,
  userId: string,
): Promise<{ success: boolean; affectedTasks: number }> {
  const now = new Date()

  // Get all non-trashed tasks that will be affected
  const taskIds = await getProjectTaskIds(projectId, userId, {
    excludeTrashed: true,
    excludeTemplates: true,
  })

  // Update all tasks to trashed
  if (taskIds.length > 0) {
    await db
      .update(tasks)
      .set({
        status: "trashed",
        trashedAt: now,
        updatedAt: now,
      })
      .where(inArray(tasks.id, taskIds))
  }

  // Update the project status to trashed
  const [project] = await db
    .update(projects)
    .set({
      status: "trashed",
      trashedAt: now,
      updatedAt: now,
    })
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .returning()

  if (!project) {
    return { success: false, affectedTasks: 0 }
  }

  // Publish project delete event
  Bus.publish({
    type: "project.deleted",
    userId,
    properties: { id: project.id },
  })

  return { success: true, affectedTasks: taskIds.length }
}
