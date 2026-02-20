import { and, eq, isNotNull, isNull } from "drizzle-orm"
import type { Context } from "hono"
import { Hono } from "hono"
import { describeRoute, resolver, validator } from "hono-openapi"
import z from "zod"
import { db } from "@/db"
import { projects, tags, tasks, taskTags } from "@/db/schema"
import { Bus } from "../bus"
import type { AuthContext } from "../middleware/auth"
import { requireWriteScope } from "../middleware/auth"
import {
  CompleteTaskSchema,
  CreateTaskSchema,
  ErrorSchema,
  MoveTaskSchema,
  ReorderTasksSchema,
  SuccessSchema,
  TagSchema,
  TaskSchema,
  UpdateTaskSchema,
} from "./schemas"
import { type ContextType, ensureTaskOrderings, reorderTasksInContext } from "../services/ordering"
import { validateListId, validateHeadingId, getProjectIdForTask } from "../services/hierarchy"
import { isProjectId } from "@/lib/id"

function validationHook<T>(result: { success: boolean; data?: T; error?: unknown }, c: Context) {
  if (!result.success) {
    console.log("[VALIDATION ERROR]", JSON.stringify(result.error, null, 2))
  }
}

// Helper to format a task for API response
// Position is not included in the task itself - it's context-dependent
function formatTaskResponse(task: {
  id: string
  title: string
  notes: string | null
  status: "active" | "completed" | "cancelled" | "trashed" | null
  isSomeday: boolean
  scheduledDate: string | null
  deadline: string | null
  isEvening: boolean
  listId: string | null
  headingId: string | null
  isTemplate: boolean
  rrule: string | null
  nextOccurrence: string | null
  templateId: string | null
  completedAt: Date | null
  trashedAt: Date | null
  isLogged: boolean
  createdAt: Date
}) {
  return {
    id: task.id,
    title: task.title,
    notes: task.notes,
    status: task.status,
    isSomeday: task.isSomeday,
    scheduledDate: task.scheduledDate,
    deadline: task.deadline,
    isEvening: task.isEvening,
    position: 0, // Position is context-dependent, default to 0
    listId: task.listId,
    headingId: task.headingId,
    // Template fields
    isTemplate: task.isTemplate,
    rrule: task.rrule,
    nextOccurrence: task.nextOccurrence,
    templateId: task.templateId,
    completedAt: task.completedAt?.toISOString() ?? null,
    trashedAt: task.trashedAt?.toISOString() ?? null,
    isLogged: task.isLogged,
    createdAt: task.createdAt.toISOString(),
  }
}

export function TaskRoutes() {
  return new Hono<AuthContext>()
    .get(
      "/",
      describeRoute({
        tags: ["Tasks"],
        summary: "List all tasks",
        responses: {
          200: {
            description: "List of tasks",
            content: {
              "application/json": { schema: resolver(z.array(TaskSchema)) },
            },
          },
        },
      }),
      async (c) => {
        const userId = c.get("userId")
        const result = await db
          .select()
          .from(tasks)
          .where(and(eq(tasks.userId, userId), isNull(tasks.trashedAt)))
        const formatted = await Promise.all(result.map(formatTaskResponse))
        return c.json(formatted, 200)
      },
    )
    .post(
      "/",
      describeRoute({
        tags: ["Tasks"],
        summary: "Create a new task",
        requestBody: {
          content: {
            "application/json": { schema: resolver(CreateTaskSchema) as any },
          },
        },
        responses: {
          201: {
            description: "Task created",
            content: { "application/json": { schema: resolver(TaskSchema) } },
          },
          400: {
            description: "Invalid parentId",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
          403: {
            description: "Forbidden",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      validator("json", CreateTaskSchema, validationHook),
      async (c) => {
        if (!requireWriteScope(c)) {
          return c.json({ error: "Forbidden - API key does not have write permission" }, 403)
        }
        const userId = c.get("userId")
        const body = c.req.valid("json")

        // Validate listId if provided
        if (body.listId) {
          const validation = await validateListId(body.listId, userId)
          if (!validation.valid) {
            return c.json({ error: validation.error ?? "Invalid listId" }, 400)
          }
        }

        // Validate headingId if provided
        if (body.headingId) {
          const validation = await validateHeadingId(body.headingId, userId, body.listId)
          if (!validation.valid) {
            return c.json({ error: validation.error ?? "Invalid headingId" }, 400)
          }
        }

        const [task] = await db
          .insert(tasks)
          .values({
            userId,
            title: body.title,
            notes: body.notes,
            status: body.status,
            isSomeday: body.isSomeday,
            scheduledDate: body.scheduledDate,
            deadline: body.deadline,
            listId: body.listId ?? null,
            headingId: body.headingId ?? null,
          })
          .returning()
        if (!task) {
          return c.json({ error: "Failed to create task" }, 500)
        }

        // Create orderings for all relevant contexts
        await ensureTaskOrderings(userId, task)

        const taskData = formatTaskResponse(task)
        Bus.publish({
          type: "task.created",
          userId,
          properties: taskData,
        })
        return c.json(taskData, 201)
      },
    )
    .post(
      "/reorder",
      describeRoute({
        tags: ["Tasks"],
        summary: "Reorder tasks within a context",
        description:
          "Reorder tasks by providing ordered task IDs and the context they belong to. " +
          "Context types: inbox, today, upcoming, anytime, someday, logbook, trash, project, heading, area. " +
          "For project/heading/area contexts, provide contextId. For upcoming, contextId is the date (YYYY-MM-DD).",
        requestBody: {
          content: {
            "application/json": { schema: resolver(ReorderTasksSchema) as any },
          },
        },
        responses: {
          200: {
            description: "Tasks reordered",
            content: {
              "application/json": { schema: resolver(SuccessSchema) },
            },
          },
          403: {
            description: "Forbidden",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      validator("json", ReorderTasksSchema),
      async (c) => {
        if (!requireWriteScope(c)) {
          return c.json({ error: "Forbidden - API key does not have write permission" }, 403)
        }
        const userId = c.get("userId")
        const body = c.req.valid("json")

        // Default context is "today" for backward compatibility
        const contextType = (body.contextType ?? "today") as ContextType
        const contextId = body.contextId ?? null

        // Reorder tasks in the specified context
        await reorderTasksInContext(userId, body.ids, contextType, contextId)

        // Publish a single reorder event for cross-tab sync
        Bus.publish({
          type: "tasks.reordered",
          userId,
          properties: {
            contextType,
            contextId,
            taskIds: body.ids,
          },
        })

        return c.json({ success: true, message: "Tasks reordered" }, 200)
      },
    )
    .post(
      "/:id/move",
      describeRoute({
        tags: ["Tasks"],
        summary: "Move a task between sections",
        description:
          "Move a task from one section to another (e.g., between projects in Today view). " +
          "This updates the task's parentId and reorders tasks in the destination section.",
        requestBody: {
          content: {
            "application/json": { schema: resolver(MoveTaskSchema) as any },
          },
        },
        responses: {
          200: {
            description: "Task moved",
            content: { "application/json": { schema: resolver(TaskSchema) } },
          },
          400: {
            description: "Invalid parentId",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
          403: {
            description: "Forbidden",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
          404: {
            description: "Task not found",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      validator("json", MoveTaskSchema),
      async (c) => {
        if (!requireWriteScope(c)) {
          return c.json({ error: "Forbidden - API key does not have write permission" }, 403)
        }
        const userId = c.get("userId")
        const id = c.req.param("id")
        const body = c.req.valid("json")

        // Validate listId if provided
        if (body.listId) {
          const validation = await validateListId(body.listId, userId)
          if (!validation.valid) {
            return c.json({ error: validation.error ?? "Invalid listId" }, 400)
          }
        }

        // Validate headingId if provided
        if (body.headingId) {
          // If headingId is being set but listId is not provided in the move,
          // fetch the current task's listId to validate the heading belongs to it
          let effectiveListId = body.listId
          if (!effectiveListId) {
            const [currentTask] = await db
              .select({ listId: tasks.listId })
              .from(tasks)
              .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
            effectiveListId = currentTask?.listId ?? null
          }

          const validation = await validateHeadingId(body.headingId, userId, effectiveListId)
          if (!validation.valid) {
            return c.json({ error: validation.error ?? "Invalid headingId" }, 400)
          }
        }

        // Build updates from the move request
        const updates: Record<string, unknown> = { updatedAt: new Date() }
        if (body.listId !== undefined) updates.listId = body.listId
        if (body.headingId !== undefined) updates.headingId = body.headingId
        if (body.isEvening !== undefined) updates.isEvening = body.isEvening
        if (body.scheduledDate !== undefined) updates.scheduledDate = body.scheduledDate

        // Update the task
        const [task] = await db
          .update(tasks)
          .set(updates)
          .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
          .returning()

        if (!task) {
          return c.json({ error: "Task not found" }, 404)
        }

        // Update orderings based on new task state
        await ensureTaskOrderings(userId, task)

        // Determine context for ordering
        // Use explicit contextType if provided, otherwise infer from scheduledDate
        let contextType: string = body.contextType ?? (body.scheduledDate ? "upcoming" : "today")
        let contextId: string | null = body.contextId ?? body.scheduledDate ?? null

        // Reorder tasks in the destination section
        await reorderTasksInContext(userId, body.newTaskIds, contextType as ContextType, contextId)

        const taskData = formatTaskResponse(task)

        // Publish task.moved event for cross-tab sync
        Bus.publish({
          type: "task.moved",
          userId,
          properties: {
            task: taskData,
            fromSectionId: body.fromSectionId,
            toSectionId: body.toSectionId,
            newTaskIds: body.newTaskIds,
            contextType,
            contextId,
          },
        })

        return c.json(taskData, 200)
      },
    )
    .get(
      "/:id",
      describeRoute({
        tags: ["Tasks"],
        summary: "Get a task by ID",
        responses: {
          200: {
            description: "Task details",
            content: { "application/json": { schema: resolver(TaskSchema) } },
          },
          404: {
            description: "Task not found",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      async (c) => {
        const userId = c.get("userId")
        const id = c.req.param("id")
        const [task] = await db
          .select()
          .from(tasks)
          .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
        if (!task) {
          return c.json({ error: "Task not found" }, 404)
        }
        return c.json(formatTaskResponse(task), 200)
      },
    )
    .put(
      "/:id",
      describeRoute({
        tags: ["Tasks"],
        summary: "Update a task",
        requestBody: {
          content: {
            "application/json": { schema: resolver(UpdateTaskSchema) as any },
          },
        },
        responses: {
          200: {
            description: "Task updated",
            content: { "application/json": { schema: resolver(TaskSchema) } },
          },
          400: {
            description: "Invalid parentId",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
          403: {
            description: "Forbidden",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
          404: {
            description: "Task not found",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      validator("json", UpdateTaskSchema, validationHook),
      async (c) => {
        if (!requireWriteScope(c)) {
          return c.json({ error: "Forbidden - API key does not have write permission" }, 403)
        }
        const userId = c.get("userId")
        const id = c.req.param("id")
        const body = c.req.valid("json")

        // Validate listId if provided
        if (body.listId) {
          const validation = await validateListId(body.listId, userId)
          if (!validation.valid) {
            return c.json({ error: validation.error ?? "Invalid listId" }, 400)
          }
        }

        // Validate headingId if provided
        if (body.headingId) {
          // If headingId is being updated but listId is not provided,
          // we need to fetch the current task's listId to validate the heading belongs to it
          let effectiveListId = body.listId
          if (!effectiveListId) {
            const [currentTask] = await db
              .select({ listId: tasks.listId })
              .from(tasks)
              .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
            effectiveListId = currentTask?.listId ?? null
          }

          const validation = await validateHeadingId(body.headingId, userId, effectiveListId)
          if (!validation.valid) {
            return c.json({ error: validation.error ?? "Invalid headingId" }, 400)
          }
        }

        const updates = { ...body, updatedAt: new Date() } as Record<string, unknown>
        // Remove position from updates - position is handled via reorder endpoint
        delete updates.position
        // Remove skipEvents from updates - it's not a database field
        const skipEvents = body.skipEvents
        delete updates.skipEvents

        // Convert trashedAt string to Date if provided
        if (body.trashedAt) {
          updates.trashedAt = new Date(body.trashedAt)
        }

        // If status is being set to cancelled, set completedAt timestamp
        if (body.status === "cancelled") {
          updates.completedAt = new Date()
        }

        // If status is being set to active, clear completedAt (uncancelling/uncompleting)
        if (body.status === "active") {
          const [existing] = await db
            .select({ status: tasks.status })
            .from(tasks)
            .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
          if (existing?.status === "cancelled" || existing?.status === "completed") {
            updates.completedAt = null
          }
        }

        // If setting a scheduledDate on a someday task, clear isSomeday
        // so it appears in Today/Upcoming instead of Someday
        if (body.scheduledDate !== undefined && body.scheduledDate !== null) {
          const [existing] = await db
            .select({ isSomeday: tasks.isSomeday })
            .from(tasks)
            .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
          if (existing?.isSomeday) {
            updates.isSomeday = false
          }
        }

        const [task] = await db
          .update(tasks)
          .set(updates)
          .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
          .returning()
        if (!task) {
          return c.json({ error: "Task not found" }, 404)
        }

        // Update orderings based on new task state
        await ensureTaskOrderings(userId, task)

        const taskData = formatTaskResponse(task)

        // Only publish SSE event if not skipped (used during move operations)
        if (!skipEvents) {
          Bus.publish({
            type: "task.updated",
            userId,
            properties: taskData,
          })
        }

        return c.json(taskData, 200)
      },
    )
    .delete(
      "/:id",
      describeRoute({
        tags: ["Tasks"],
        summary: "Trash a task",
        responses: {
          200: {
            description: "Task trashed",
            content: {
              "application/json": { schema: resolver(SuccessSchema) },
            },
          },
          403: {
            description: "Forbidden",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
          404: {
            description: "Task not found",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      async (c) => {
        if (!requireWriteScope(c)) {
          return c.json({ error: "Forbidden - API key does not have write permission" }, 403)
        }
        const userId = c.get("userId")
        const id = c.req.param("id")
        const [task] = await db
          .update(tasks)
          .set({
            status: "trashed",
            trashedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
          .returning()
        if (!task) {
          return c.json({ error: "Task not found" }, 404)
        }

        // Update orderings (will move to trash context)
        await ensureTaskOrderings(userId, task)

        Bus.publish({
          type: "task.deleted",
          userId,
          properties: { id: task.id },
        })
        return c.json({ success: true, message: "Task moved to trash" }, 200)
      },
    )
    .post(
      "/:id/complete",
      describeRoute({
        tags: ["Tasks"],
        summary: "Toggle task completion",
        requestBody: {
          content: {
            "application/json": { schema: resolver(CompleteTaskSchema) as any },
          },
        },
        responses: {
          200: {
            description: "Task updated",
            content: { "application/json": { schema: resolver(TaskSchema) } },
          },
          403: {
            description: "Forbidden",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
          404: {
            description: "Task not found",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      validator("json", CompleteTaskSchema),
      async (c) => {
        if (!requireWriteScope(c)) {
          return c.json({ error: "Forbidden - API key does not have write permission" }, 403)
        }
        const userId = c.get("userId")
        const id = c.req.param("id")
        const body = c.req.valid("json")
        const [task] = await db
          .update(tasks)
          .set({
            // Don't change status - only update completedAt
            // This preserves which view the task belongs to
            completedAt: body.completed ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
          .returning()
        if (!task) {
          return c.json({ error: "Task not found" }, 404)
        }

        const taskData = formatTaskResponse(task)
        Bus.publish({
          type: "task.updated",
          userId,
          properties: taskData,
        })
        return c.json(taskData, 200)
      },
    )
    .post(
      "/:id/restore",
      describeRoute({
        tags: ["Tasks"],
        summary: "Restore task from trash",
        description:
          "Restores a trashed task. " + "If the task belongs to a completed or trashed project, returns an error.",
        responses: {
          200: {
            description: "Task restored",
            content: { "application/json": { schema: resolver(TaskSchema) } },
          },
          400: {
            description: "Cannot restore - project is completed or trashed",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
          403: {
            description: "Forbidden",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
          404: {
            description: "Task not found",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      async (c) => {
        if (!requireWriteScope(c)) {
          return c.json({ error: "Forbidden - API key does not have write permission" }, 403)
        }
        const userId = c.get("userId")
        const id = c.req.param("id")

        // First, get the task to check its project
        const [existingTask] = await db
          .select()
          .from(tasks)
          .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))

        if (!existingTask) {
          return c.json({ error: "Task not found" }, 404)
        }

        // Check if task belongs to a project and if that project is completed or trashed
        // With the new model, we can get projectId directly from listId (if it's a project)
        const projectId = isProjectId(existingTask.listId) ? existingTask.listId : null
        if (projectId) {
          const [project] = await db
            .select({ status: projects.status, trashedAt: projects.trashedAt })
            .from(projects)
            .where(eq(projects.id, projectId))

          if (project?.status === "completed") {
            return c.json({ error: "Cannot restore task - the project it belongs to has been completed" }, 400)
          }
          if (project?.trashedAt) {
            return c.json({ error: "Cannot restore task - the project it belongs to has been deleted" }, 400)
          }
        }

        const [task] = await db
          .update(tasks)
          .set({ status: "active", trashedAt: null, updatedAt: new Date() })
          .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
          .returning()
        if (!task) {
          return c.json({ error: "Task not found" }, 404)
        }

        // Update orderings (will move out of trash context)
        await ensureTaskOrderings(userId, task)

        const taskData = formatTaskResponse(task)
        Bus.publish({
          type: "task.updated",
          userId,
          properties: taskData,
        })

        return c.json(taskData, 200)
      },
    )
    .post(
      "/:id/restore-from-logbook",
      describeRoute({
        tags: ["Tasks"],
        summary: "Restore task from logbook",
        description:
          "Restores a completed/cancelled task from logbook. " +
          "If the task belongs to a completed project, returns an error.",
        responses: {
          200: {
            description: "Task restored",
            content: { "application/json": { schema: resolver(TaskSchema) } },
          },
          400: {
            description: "Cannot restore - project is completed",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
          403: {
            description: "Forbidden",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
          404: {
            description: "Task not found",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      async (c) => {
        if (!requireWriteScope(c)) {
          return c.json({ error: "Forbidden - API key does not have write permission" }, 403)
        }
        const userId = c.get("userId")
        const id = c.req.param("id")

        // First, get the task to check its project
        const [existingTask] = await db
          .select()
          .from(tasks)
          .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))

        if (!existingTask) {
          return c.json({ error: "Task not found" }, 404)
        }

        // Check if task belongs to a project and if that project is completed or deleted
        // With the new model, we can get projectId directly from listId (if it's a project)
        const projectId = isProjectId(existingTask.listId) ? existingTask.listId : null
        if (projectId) {
          const [project] = await db
            .select({ status: projects.status, trashedAt: projects.trashedAt })
            .from(projects)
            .where(eq(projects.id, projectId))

          if (project?.status === "completed") {
            return c.json({ error: "Cannot restore task - the project it belongs to has been completed" }, 400)
          }
          if (project?.trashedAt) {
            return c.json({ error: "Cannot restore task - the project it belongs to has been deleted" }, 400)
          }
        }

        // Restore the task
        const [task] = await db
          .update(tasks)
          .set({
            status: "active",
            completedAt: null,
            isLogged: false,
            updatedAt: new Date(),
          })
          .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
          .returning()

        if (!task) {
          return c.json({ error: "Task not found" }, 404)
        }

        // Update orderings
        await ensureTaskOrderings(userId, task)

        const taskData = formatTaskResponse(task)
        Bus.publish({
          type: "task.updated",
          userId,
          properties: taskData,
        })

        return c.json(taskData, 200)
      },
    )
    .post(
      "/log-completed",
      describeRoute({
        tags: ["Tasks"],
        summary: "Log all completed/cancelled tasks",
        description:
          "Marks all unlogged completed/cancelled tasks as logged. " +
          "Logged tasks only appear in the logbook, not in 'completed today' sections.",
        responses: {
          200: {
            description: "Tasks logged",
            content: {
              "application/json": {
                schema: resolver(
                  z.object({
                    success: z.boolean(),
                    count: z.number().describe("Number of tasks logged"),
                  }),
                ),
              },
            },
          },
          403: {
            description: "Forbidden",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      async (c) => {
        if (!requireWriteScope(c)) {
          return c.json({ error: "Forbidden - API key does not have write permission" }, 403)
        }
        const userId = c.get("userId")

        // Find all completed/cancelled tasks that aren't logged yet.
        // This includes tasks from previous days that were never logged,
        // preventing them from falling into limbo (invisible everywhere).
        const result = await db
          .update(tasks)
          .set({ isLogged: true, scheduledDate: null, isEvening: false, updatedAt: new Date() })
          .where(
            and(
              eq(tasks.userId, userId),
              eq(tasks.isLogged, false),
              isNull(tasks.trashedAt),
              isNotNull(tasks.completedAt),
            ),
          )
          .returning()

        // Publish events for each logged task
        for (const task of result) {
          const taskData = formatTaskResponse(task)
          Bus.publish({
            type: "task.updated",
            userId,
            properties: taskData,
          })
        }

        return c.json({ success: true, count: result.length }, 200)
      },
    )
    .delete(
      "/:id/permanent",
      describeRoute({
        tags: ["Tasks"],
        summary: "Permanently delete a task",
        responses: {
          200: {
            description: "Task deleted",
            content: {
              "application/json": { schema: resolver(SuccessSchema) },
            },
          },
          403: {
            description: "Forbidden",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
          404: {
            description: "Task not found",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      async (c) => {
        if (!requireWriteScope(c)) {
          return c.json({ error: "Forbidden - API key does not have write permission" }, 403)
        }
        const userId = c.get("userId")
        const id = c.req.param("id")
        // Note: task_orderings will be cascade deleted due to FK constraint
        const result = await db
          .delete(tasks)
          .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
          .returning()
        if (result.length === 0) {
          return c.json({ error: "Task not found" }, 404)
        }
        return c.json({ success: true, message: "Task permanently deleted" }, 200)
      },
    )
    .get(
      "/:id/tags",
      describeRoute({
        tags: ["Tasks"],
        summary: "Get tags for a task",
        responses: {
          200: {
            description: "List of tags",
            content: {
              "application/json": { schema: resolver(z.array(TagSchema)) },
            },
          },
          404: {
            description: "Task not found",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      async (c) => {
        const userId = c.get("userId")
        const id = c.req.param("id")
        const [task] = await db
          .select()
          .from(tasks)
          .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
        if (!task) {
          return c.json({ error: "Task not found" }, 404)
        }
        const result = await db
          .select({
            id: tags.id,
            title: tags.title,
            position: tags.position,
            createdAt: tags.createdAt,
          })
          .from(taskTags)
          .innerJoin(tags, eq(taskTags.tagId, tags.id))
          .where(and(eq(taskTags.taskId, id), eq(taskTags.userId, userId)))
        const formatted = result.map((t) => ({
          id: t.id,
          title: t.title,
          position: t.position,
          createdAt: t.createdAt.toISOString(),
        }))
        return c.json(formatted, 200)
      },
    )
    .post(
      "/:id/tags/:tagId",
      describeRoute({
        tags: ["Tasks"],
        summary: "Add a tag to a task",
        responses: {
          200: {
            description: "Tag added",
            content: {
              "application/json": { schema: resolver(SuccessSchema) },
            },
          },
          403: {
            description: "Forbidden",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
          404: {
            description: "Task or tag not found",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
          409: {
            description: "Tag already assigned",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      async (c) => {
        if (!requireWriteScope(c)) {
          return c.json({ error: "Forbidden - API key does not have write permission" }, 403)
        }
        const userId = c.get("userId")
        const id = c.req.param("id")
        const tagId = c.req.param("tagId")
        const [task] = await db
          .select()
          .from(tasks)
          .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
        if (!task) {
          return c.json({ error: "Task not found" }, 404)
        }
        const [tag] = await db
          .select()
          .from(tags)
          .where(and(eq(tags.id, tagId), eq(tags.userId, userId)))
        if (!tag) {
          return c.json({ error: "Tag not found" }, 404)
        }
        const [existing] = await db
          .select()
          .from(taskTags)
          .where(and(eq(taskTags.taskId, id), eq(taskTags.tagId, tagId), eq(taskTags.userId, userId)))
        if (existing) {
          return c.json({ error: "Tag already assigned to this task" }, 409)
        }
        await db.insert(taskTags).values({ userId, taskId: id, tagId })
        return c.json({ success: true, message: "Tag added to task" }, 200)
      },
    )
    .delete(
      "/:id/tags/:tagId",
      describeRoute({
        tags: ["Tasks"],
        summary: "Remove a tag from a task",
        responses: {
          200: {
            description: "Tag removed",
            content: {
              "application/json": { schema: resolver(SuccessSchema) },
            },
          },
          403: {
            description: "Forbidden",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
          404: {
            description: "Task-tag association not found",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      async (c) => {
        if (!requireWriteScope(c)) {
          return c.json({ error: "Forbidden - API key does not have write permission" }, 403)
        }
        const userId = c.get("userId")
        const id = c.req.param("id")
        const tagId = c.req.param("tagId")
        const result = await db
          .delete(taskTags)
          .where(and(eq(taskTags.taskId, id), eq(taskTags.tagId, tagId), eq(taskTags.userId, userId)))
          .returning()
        if (result.length === 0) {
          return c.json({ error: "Task-tag association not found" }, 404)
        }
        return c.json({ success: true, message: "Tag removed from task" }, 200)
      },
    )
}
