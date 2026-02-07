import { EventEmitter } from "events"
import z from "zod"

// Task info schema (matches TaskSchema from routes/schemas.ts)
export const TaskInfo = z.object({
  id: z.string(),
  title: z.string(),
  notes: z.string().nullable(),
  status: z.enum(["active", "completed", "cancelled", "trashed"]).nullable(),
  isSomeday: z.boolean(),
  scheduledDate: z.string().nullable(),
  deadline: z.string().nullable(),
  isEvening: z.boolean(),
  position: z.number(),
  // List hierarchy
  listId: z.string().nullable(),
  headingId: z.string().nullable(),
  // Template fields
  isTemplate: z.boolean(),
  rrule: z.string().nullable(),
  nextOccurrence: z.string().nullable(),
  templateId: z.string().nullable(),
  completedAt: z.string().nullable(),
  trashedAt: z.string().nullable(),
  isLogged: z.boolean(),
  createdAt: z.string(),
})

// Project info schema (matches ProjectSchema from routes/schemas.ts)
export const ProjectInfo = z.object({
  id: z.string(),
  title: z.string(),
  notes: z.string().nullable(),
  status: z.string(),
  position: z.number(),
  areaId: z.string().nullable(),
  completedAt: z.string().nullable(),
  trashedAt: z.string().nullable(),
  createdAt: z.string(),
})

// Area info schema (matches AreaSchema from routes/schemas.ts)
export const AreaInfo = z.object({
  id: z.string(),
  title: z.string(),
  position: z.number(),
  createdAt: z.string(),
})

// Heading info schema (matches HeadingSchema from routes/schemas.ts)
export const HeadingInfo = z.object({
  id: z.string(),
  title: z.string(),
  position: z.number(),
  isBacklog: z.boolean(),
  projectId: z.string(),
  createdAt: z.string(),
})

// RepeatingRule info schema
export const RepeatingRuleInfo = z.object({
  id: z.string(),
  title: z.string(),
  notes: z.string().nullable(),
  rrule: z.string(),
  nextOccurrence: z.string(),
  status: z.string(),
  // List hierarchy
  listId: z.string().nullable(),
  headingId: z.string().nullable(),
  checklistTemplate: z.string().nullable(),
  tagsTemplate: z.string().nullable(),
  createdAt: z.string(),
})

// Event type definitions - all user-specific events include userId
export const ServerConnectedEvent = z.object({
  type: z.literal("server.connected"),
  userId: z.string().optional(),
  properties: z.object({}),
})

export const ServerHeartbeatEvent = z.object({
  type: z.literal("server.heartbeat"),
  userId: z.string().optional(),
  properties: z.object({}),
})

export const TaskCreatedEvent = z.object({
  type: z.literal("task.created"),
  userId: z.string(),
  properties: TaskInfo,
})

export const TaskUpdatedEvent = z.object({
  type: z.literal("task.updated"),
  userId: z.string(),
  properties: TaskInfo,
})

export const TaskDeletedEvent = z.object({
  type: z.literal("task.deleted"),
  userId: z.string(),
  properties: z.object({ id: z.string() }),
})

export const TasksReorderedEvent = z.object({
  type: z.literal("tasks.reordered"),
  userId: z.string(),
  properties: z.object({
    contextType: z.string(),
    contextId: z.string().nullable(),
    taskIds: z.array(z.string()),
  }),
})

export const TaskMovedEvent = z.object({
  type: z.literal("task.moved"),
  userId: z.string(),
  properties: z.object({
    task: TaskInfo,
    fromSectionId: z.string(),
    toSectionId: z.string(),
    newTaskIds: z.array(z.string()),
    contextType: z.string(),
    contextId: z.string().nullable(),
  }),
})

export const ProjectCreatedEvent = z.object({
  type: z.literal("project.created"),
  userId: z.string(),
  properties: ProjectInfo,
})

export const ProjectUpdatedEvent = z.object({
  type: z.literal("project.updated"),
  userId: z.string(),
  properties: ProjectInfo,
})

export const ProjectDeletedEvent = z.object({
  type: z.literal("project.deleted"),
  userId: z.string(),
  properties: z.object({ id: z.string() }),
})

export const AreaCreatedEvent = z.object({
  type: z.literal("area.created"),
  userId: z.string(),
  properties: AreaInfo,
})

export const AreaUpdatedEvent = z.object({
  type: z.literal("area.updated"),
  userId: z.string(),
  properties: AreaInfo,
})

export const AreaDeletedEvent = z.object({
  type: z.literal("area.deleted"),
  userId: z.string(),
  properties: z.object({ id: z.string() }),
})

export const HeadingCreatedEvent = z.object({
  type: z.literal("heading.created"),
  userId: z.string(),
  properties: HeadingInfo,
})

export const HeadingUpdatedEvent = z.object({
  type: z.literal("heading.updated"),
  userId: z.string(),
  properties: HeadingInfo,
})

export const HeadingDeletedEvent = z.object({
  type: z.literal("heading.deleted"),
  userId: z.string(),
  properties: z.object({ id: z.string(), projectId: z.string() }),
})

export const RepeatingRuleCreatedEvent = z.object({
  type: z.literal("repeatingRule.created"),
  userId: z.string(),
  properties: RepeatingRuleInfo,
})

export const RepeatingRuleUpdatedEvent = z.object({
  type: z.literal("repeatingRule.updated"),
  userId: z.string(),
  properties: RepeatingRuleInfo,
})

export const RepeatingRuleDeletedEvent = z.object({
  type: z.literal("repeatingRule.deleted"),
  userId: z.string(),
  properties: z.object({ id: z.string() }),
})

// Union of all events
export const Event = z.discriminatedUnion("type", [
  ServerConnectedEvent,
  ServerHeartbeatEvent,
  TaskCreatedEvent,
  TaskUpdatedEvent,
  TaskDeletedEvent,
  TasksReorderedEvent,
  TaskMovedEvent,
  ProjectCreatedEvent,
  ProjectUpdatedEvent,
  ProjectDeletedEvent,
  AreaCreatedEvent,
  AreaUpdatedEvent,
  AreaDeletedEvent,
  HeadingCreatedEvent,
  HeadingUpdatedEvent,
  HeadingDeletedEvent,
  RepeatingRuleCreatedEvent,
  RepeatingRuleUpdatedEvent,
  RepeatingRuleDeletedEvent,
])

export type Event = z.infer<typeof Event>

// Simple event bus using Node's EventEmitter
class BusClass extends EventEmitter<{
  event: [Event]
}> {
  publish<T extends Event>(event: T) {
    this.emit("event", event)
  }

  subscribe(callback: (event: Event) => void) {
    this.on("event", callback)
    return () => {
      this.off("event", callback)
    }
  }
}

export const Bus = new BusClass()
