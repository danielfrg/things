import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/db"
import { areas, projects, tasks } from "@/db/schema"
import { Bus } from "../bus"
import { getAreaDirectTaskIds, getAreaProjectIds, getAreaTaskIds, getProjectTaskIds } from "./hierarchy"

/**
 * Get counts of projects and tasks in an area (for UI display)
 */
export async function getAreaContentCount(
  areaId: string,
  userId: string,
): Promise<{ projectCount: number; taskCount: number }> {
  // Count non-trashed projects in this area
  const projectIds = await getAreaProjectIds(areaId, userId, { excludeTrashed: true })

  // Count all non-trashed tasks in the area (direct + in projects)
  const taskIds = await getAreaTaskIds(areaId, userId, {
    excludeTrashed: true,
    excludeTemplates: true,
  })

  return {
    projectCount: projectIds.length,
    taskCount: taskIds.length,
  }
}

/**
 * Delete an area and cascade the deletion to all projects and tasks.
 * Projects are marked as trashed with trashedAt set.
 * Tasks directly in the area and tasks in projects are also trashed.
 */
export async function deleteArea(
  areaId: string,
  userId: string,
): Promise<{ success: boolean; affectedProjects: number; affectedTasks: number }> {
  const now = new Date()
  let totalAffectedTasks = 0

  // Get all non-trashed projects in this area
  const projectIds = await getAreaProjectIds(areaId, userId, { excludeTrashed: true })

  // Trash all projects and their tasks
  for (const projectId of projectIds) {
    // Get all non-trashed tasks in the project
    const taskIds = await getProjectTaskIds(projectId, userId, {
      excludeTrashed: true,
      excludeTemplates: true,
    })

    // Trash all tasks in the project
    if (taskIds.length > 0) {
      await db
        .update(tasks)
        .set({
          status: "trashed",
          trashedAt: now,
          updatedAt: now,
        })
        .where(inArray(tasks.id, taskIds))

      // Publish events for each task
      for (const taskId of taskIds) {
        Bus.publish({
          type: "task.deleted",
          userId,
          properties: { id: taskId },
        })
      }

      totalAffectedTasks += taskIds.length
    }

    // Trash the project
    await db
      .update(projects)
      .set({
        status: "trashed",
        trashedAt: now,
        updatedAt: now,
      })
      .where(eq(projects.id, projectId))

    // Publish project delete event
    Bus.publish({
      type: "project.deleted",
      userId,
      properties: { id: projectId },
    })
  }

  // Get all non-trashed tasks directly in the area (listId = areaId)
  const directTaskIds = await getAreaDirectTaskIds(areaId, userId, {
    excludeTrashed: true,
    excludeTemplates: true,
  })

  // Trash all tasks directly in the area
  if (directTaskIds.length > 0) {
    await db
      .update(tasks)
      .set({
        status: "trashed",
        trashedAt: now,
        updatedAt: now,
      })
      .where(inArray(tasks.id, directTaskIds))

    // Publish events for each task
    for (const taskId of directTaskIds) {
      Bus.publish({
        type: "task.deleted",
        userId,
        properties: { id: taskId },
      })
    }

    totalAffectedTasks += directTaskIds.length
  }

  // Soft delete the area
  const [area] = await db
    .update(areas)
    .set({
      trashedAt: now,
      updatedAt: now,
    })
    .where(and(eq(areas.id, areaId), eq(areas.userId, userId)))
    .returning()

  if (!area) {
    return { success: false, affectedProjects: 0, affectedTasks: 0 }
  }

  // Publish area deleted event
  Bus.publish({
    type: "area.deleted",
    userId,
    properties: { id: areaId },
  })

  return {
    success: true,
    affectedProjects: projectIds.length,
    affectedTasks: totalAffectedTasks,
  }
}
