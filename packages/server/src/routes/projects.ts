import { and, eq, isNull } from "drizzle-orm"
import { Hono } from "hono"
import { describeRoute, resolver, validator } from "hono-openapi"
import z from "zod"
import { db } from "@/db"
import { projects } from "@/db/schema"
import { Bus } from "../bus"
import type { AuthContext } from "../middleware/auth"
import { requireWriteScope } from "../middleware/auth"
import { completeProject, getProjectActiveTaskCount, trashProject } from "../services/project-cascade"
import { CreateProjectSchema, ErrorSchema, ProjectSchema, SuccessSchema, UpdateProjectSchema } from "./schemas"

// Schema for project complete/delete response
const ProjectActionResponseSchema = z
  .object({
    success: z.boolean(),
    affectedTasks: z.number(),
    message: z.string().optional(),
  })
  .meta({ ref: "ProjectActionResponse" })

// Schema for task count response
const TaskCountResponseSchema = z
  .object({
    count: z.number(),
  })
  .meta({ ref: "TaskCountResponse" })

export function ProjectRoutes() {
  return new Hono<AuthContext>()
    .get(
      "/",
      describeRoute({
        tags: ["Projects"],
        summary: "List all projects",
        responses: {
          200: {
            description: "List of projects",
            content: {
              "application/json": { schema: resolver(z.array(ProjectSchema)) },
            },
          },
        },
      }),
      async (c) => {
        const userId = c.get("userId")
        const result = await db
          .select()
          .from(projects)
          .where(and(eq(projects.userId, userId), isNull(projects.trashedAt)))
        const formatted = result.map((p) => ({
          id: p.id,
          title: p.title,
          notes: p.notes,
          status: p.status,
          position: p.position,
          areaId: p.areaId,
          completedAt: p.completedAt?.toISOString() ?? null,
          trashedAt: p.trashedAt?.toISOString() ?? null,
          createdAt: p.createdAt.toISOString(),
        }))
        return c.json(formatted, 200)
      },
    )
    .post(
      "/",
      describeRoute({
        tags: ["Projects"],
        summary: "Create a new project",
        requestBody: {
          content: {
            "application/json": {
              schema: resolver(CreateProjectSchema) as any,
            },
          },
        },
        responses: {
          201: {
            description: "Project created",
            content: {
              "application/json": { schema: resolver(ProjectSchema) },
            },
          },
          403: {
            description: "Forbidden",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      validator("json", CreateProjectSchema),
      async (c) => {
        if (!requireWriteScope(c)) {
          return c.json({ error: "Forbidden - API key does not have write permission" }, 403)
        }
        const userId = c.get("userId")
        const body = c.req.valid("json")
        const [project] = await db
          .insert(projects)
          .values({
            userId,
            title: body.title,
            notes: body.notes,
            status: body.status,
            areaId: body.areaId,
            position: body.position ?? 0,
          })
          .returning()
        if (!project) {
          return c.json({ error: "Failed to create project" }, 500)
        }
        const projectData = {
          id: project.id,
          title: project.title,
          notes: project.notes,
          status: project.status,
          position: project.position,
          areaId: project.areaId,
          completedAt: project.completedAt?.toISOString() ?? null,
          trashedAt: project.trashedAt?.toISOString() ?? null,
          createdAt: project.createdAt.toISOString(),
        }
        Bus.publish({
          type: "project.created",
          userId,
          properties: projectData,
        })
        return c.json(projectData, 201)
      },
    )
    .get(
      "/:id",
      describeRoute({
        tags: ["Projects"],
        summary: "Get a project by ID",
        responses: {
          200: {
            description: "Project details",
            content: {
              "application/json": { schema: resolver(ProjectSchema) },
            },
          },
          404: {
            description: "Project not found",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      async (c) => {
        const userId = c.get("userId")
        const id = c.req.param("id")
        const [project] = await db
          .select()
          .from(projects)
          .where(and(eq(projects.id, id), eq(projects.userId, userId)))
        if (!project) {
          return c.json({ error: "Project not found" }, 404)
        }
        return c.json(
          {
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
          200,
        )
      },
    )
    .put(
      "/:id",
      describeRoute({
        tags: ["Projects"],
        summary: "Update a project",
        requestBody: {
          content: {
            "application/json": {
              schema: resolver(UpdateProjectSchema) as any,
            },
          },
        },
        responses: {
          200: {
            description: "Project updated",
            content: {
              "application/json": { schema: resolver(ProjectSchema) },
            },
          },
          403: {
            description: "Forbidden",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
          404: {
            description: "Project not found",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      validator("json", UpdateProjectSchema),
      async (c) => {
        if (!requireWriteScope(c)) {
          return c.json({ error: "Forbidden - API key does not have write permission" }, 403)
        }
        const userId = c.get("userId")
        const id = c.req.param("id")
        const body = c.req.valid("json")
        const [project] = await db
          .update(projects)
          .set({ ...body, updatedAt: new Date() })
          .where(and(eq(projects.id, id), eq(projects.userId, userId)))
          .returning()
        if (!project) {
          return c.json({ error: "Project not found" }, 404)
        }
        const projectData = {
          id: project.id,
          title: project.title,
          notes: project.notes,
          status: project.status,
          position: project.position,
          areaId: project.areaId,
          completedAt: project.completedAt?.toISOString() ?? null,
          trashedAt: project.trashedAt?.toISOString() ?? null,
          createdAt: project.createdAt.toISOString(),
        }
        Bus.publish({
          type: "project.updated",
          userId,
          properties: projectData,
        })
        return c.json(projectData, 200)
      },
    )
    .get(
      "/:id/task-count",
      describeRoute({
        tags: ["Projects"],
        summary: "Get the count of active tasks in a project",
        responses: {
          200: {
            description: "Task count",
            content: {
              "application/json": { schema: resolver(TaskCountResponseSchema) },
            },
          },
          404: {
            description: "Project not found",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      async (c) => {
        const userId = c.get("userId")
        const id = c.req.param("id")

        // Verify project exists
        const [project] = await db
          .select({ id: projects.id })
          .from(projects)
          .where(and(eq(projects.id, id), eq(projects.userId, userId)))

        if (!project) {
          return c.json({ error: "Project not found" }, 404)
        }

        const count = await getProjectActiveTaskCount(id, userId)
        return c.json({ count }, 200)
      },
    )
    .post(
      "/:id/complete",
      describeRoute({
        tags: ["Projects"],
        summary: "Complete a project and its active tasks",
        description:
          "Marks the project as completed and cascades the completion to all active tasks within the project.",
        responses: {
          200: {
            description: "Project completed",
            content: {
              "application/json": { schema: resolver(ProjectActionResponseSchema) },
            },
          },
          403: {
            description: "Forbidden",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
          404: {
            description: "Project not found",
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

        const result = await completeProject(id, userId)

        if (!result.success) {
          return c.json({ error: "Project not found" }, 404)
        }

        return c.json(
          {
            success: true,
            affectedTasks: result.affectedTasks,
            message: `Project completed with ${result.affectedTasks} task(s) marked as done`,
          },
          200,
        )
      },
    )
    .delete(
      "/:id",
      describeRoute({
        tags: ["Projects"],
        summary: "Delete a project and its tasks",
        description: "Moves the project and all its tasks to trash.",
        responses: {
          200: {
            description: "Project deleted",
            content: {
              "application/json": { schema: resolver(ProjectActionResponseSchema) },
            },
          },
          403: {
            description: "Forbidden",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
          404: {
            description: "Project not found",
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

        const result = await trashProject(id, userId)

        if (!result.success) {
          return c.json({ error: "Project not found" }, 404)
        }

        return c.json(
          {
            success: true,
            affectedTasks: result.affectedTasks,
            message: `Project and ${result.affectedTasks} task(s) moved to trash`,
          },
          200,
        )
      },
    )
}
