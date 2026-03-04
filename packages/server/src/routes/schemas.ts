import z from "zod"
import { isValidListId, isValidHeadingId } from "@/lib/id"

export const ErrorSchema = z
  .object({
    error: z.string(),
  })
  .meta({ ref: "Error" })

export const SuccessSchema = z
  .object({
    success: z.boolean(),
    message: z.string().optional(),
  })
  .meta({ ref: "Success" })

export const TaskStatusSchema = z.enum(["active", "completed", "cancelled", "trashed"]).nullable()

// ListId schema: must be a valid area (area_) or project (prj_) ID, or null
export const ListIdSchema = z
  .string()
  .refine((val) => isValidListId(val), {
    message: "listId must be a valid area (area_) or project (prj_) ID",
  })
  .nullable()
  .optional()

// HeadingId schema: must be a valid heading (hdg_) ID, or null
export const HeadingIdSchema = z
  .string()
  .refine((val) => isValidHeadingId(val), {
    message: "headingId must be a valid heading (hdg_) ID",
  })
  .nullable()
  .optional()

export const TaskSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    notes: z.string().nullable(),
    status: TaskStatusSchema,
    isSomeday: z.boolean(),
    scheduledDate: z.string().nullable(),
    deadline: z.string().nullable(),
    isEvening: z.boolean(),
    position: z.number(),
    // List hierarchy: which List does this task belong to?
    listId: z.string().nullable(),
    // Heading: is this task grouped under a Heading within the List?
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
  .meta({ ref: "Task" })

export const CreateTaskSchema = z
  .object({
    title: z.string().min(1),
    notes: z.string().nullable().optional(),
    status: TaskStatusSchema.optional(),
    isSomeday: z.boolean().optional().default(false),
    scheduledDate: z.string().nullable().optional(),
    deadline: z.string().nullable().optional(),
    // List hierarchy: listId points to area or project
    listId: ListIdSchema,
    // Heading: headingId points to a heading within the list (optional)
    headingId: HeadingIdSchema,
    // Note: position is computed server-side via task_orderings table
    // New tasks are inserted at the top of their relevant contexts
  })
  .meta({ ref: "CreateTask" })

export const UpdateTaskSchema = z
  .object({
    title: z.string().min(1).optional(),
    notes: z.string().nullable().optional(),
    status: TaskStatusSchema.optional(),
    isSomeday: z.boolean().optional(),
    scheduledDate: z.string().nullable().optional(),
    deadline: z.string().nullable().optional(),
    isEvening: z.boolean().optional(),
    // List hierarchy: listId points to area or project
    listId: ListIdSchema,
    // Heading: headingId points to a heading within the list (optional)
    headingId: HeadingIdSchema,
    // Note: position changes should go through POST /tasks/reorder endpoint
    trashedAt: z.string().nullable().optional(),
    // Skip publishing SSE events (used during move operations where tasks.reordered handles sync)
    skipEvents: z.boolean().optional(),
  })
  .meta({ ref: "UpdateTask" })

export const CompleteTaskSchema = z
  .object({
    completed: z.boolean(),
  })
  .meta({ ref: "CompleteTask" })

export const ContextTypeSchema = z.enum([
  "inbox",
  "today",
  "upcoming",
  "anytime",
  "someday",
  "logbook",
  "trash",
  "project",
  "heading",
  "area",
])

export const ReorderTasksSchema = z
  .object({
    ids: z.array(z.string()).min(1),
    contextType: ContextTypeSchema.optional(),
    contextId: z.string().nullable().optional(),
  })
  .meta({ ref: "ReorderTasks" })

export const MoveTaskSchema = z
  .object({
    fromSectionId: z.string(),
    toSectionId: z.string(),
    newTaskIds: z.array(z.string()).min(1),
    // Task updates - uses listId + headingId
    listId: ListIdSchema,
    headingId: HeadingIdSchema,
    isEvening: z.boolean().optional(),
    scheduledDate: z.string().nullable().optional(),
    // Context for ordering - which view this move is happening in
    contextType: z
      .enum(["inbox", "today", "upcoming", "anytime", "someday", "logbook", "trash", "project", "heading", "area"])
      .optional(),
    contextId: z.string().nullable().optional(),
  })
  .meta({ ref: "MoveTask" })

export const ProjectStatusSchema = z.enum(["active", "completed", "trashed"])

export const ProjectSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    notes: z.string().nullable(),
    status: ProjectStatusSchema,
    position: z.number(),
    areaId: z.string().nullable(),
    completedAt: z.string().nullable(),
    trashedAt: z.string().nullable(),
    createdAt: z.string(),
  })
  .meta({ ref: "Project" })

export const CreateProjectSchema = z
  .object({
    title: z.string().min(1),
    notes: z.string().optional(),
    status: ProjectStatusSchema.optional().default("active"),
    areaId: z.string().nullable().optional(),
    position: z.number().optional(),
  })
  .meta({ ref: "CreateProject" })

export const UpdateProjectSchema = z
  .object({
    title: z.string().min(1).optional(),
    notes: z.string().nullable().optional(),
    status: ProjectStatusSchema.optional(),
    areaId: z.string().nullable().optional(),
    position: z.number().optional(),
  })
  .meta({ ref: "UpdateProject" })

export const AreaSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    position: z.number(),
    createdAt: z.string(),
  })
  .meta({ ref: "Area" })

export const CreateAreaSchema = z
  .object({
    title: z.string().min(1),
    position: z.number().optional(),
  })
  .meta({ ref: "CreateArea" })

export const UpdateAreaSchema = z
  .object({
    title: z.string().min(1).optional(),
    position: z.number().optional(),
  })
  .meta({ ref: "UpdateArea" })

export const TagSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    position: z.number(),
    createdAt: z.string(),
  })
  .meta({ ref: "Tag" })

export const CreateTagSchema = z
  .object({
    title: z.string().min(1),
    position: z.number().optional(),
  })
  .meta({ ref: "CreateTag" })

export const UpdateTagSchema = z
  .object({
    title: z.string().min(1).optional(),
    position: z.number().optional(),
  })
  .meta({ ref: "UpdateTag" })

export const ChecklistItemSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    completed: z.boolean(),
    position: z.number(),
    taskId: z.string(),
    createdAt: z.string(),
  })
  .meta({ ref: "ChecklistItem" })

export const CreateChecklistItemSchema = z
  .object({
    title: z.string(),
    completed: z.boolean().optional().default(false),
    position: z.number().optional(),
  })
  .meta({ ref: "CreateChecklistItem" })

export const UpdateChecklistItemSchema = z
  .object({
    title: z.string().optional(),
    completed: z.boolean().optional(),
    position: z.number().optional(),
  })
  .meta({ ref: "UpdateChecklistItem" })

export const HeadingSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    position: z.number(),
    isBacklog: z.boolean(),
    projectId: z.string(),
    createdAt: z.string(),
  })
  .meta({ ref: "Heading" })

export const CreateHeadingSchema = z
  .object({
    title: z.string().min(1),
    projectId: z.string(),
    position: z.number().optional(),
    isBacklog: z.boolean().optional().default(false),
  })
  .meta({ ref: "CreateHeading" })

export const UpdateHeadingSchema = z
  .object({
    title: z.string().min(1).optional(),
    position: z.number().optional(),
    isBacklog: z.boolean().optional(),
  })
  .meta({ ref: "UpdateHeading" })

export const RepeatingRuleStatusSchema = z.enum(["active", "paused"])

export const RepeatingRuleSchema = z
  .object({
    id: z.string(),
    rrule: z.string(),
    nextOccurrence: z.string(),
    status: RepeatingRuleStatusSchema,
    title: z.string(),
    notes: z.string().nullable(),
    // List hierarchy
    listId: z.string().nullable(),
    headingId: z.string().nullable(),
    checklistTemplate: z.string().nullable(),
    tagsTemplate: z.string().nullable(),
    createdAt: z.string(),
  })
  .meta({ ref: "RepeatingRule" })

export const CreateRepeatingRuleSchema = z
  .object({
    rrule: z.string().min(1),
    nextOccurrence: z.string(),
    title: z.string().min(1),
    notes: z.string().optional(),
    status: RepeatingRuleStatusSchema.optional().default("active"),
    // List hierarchy
    listId: ListIdSchema,
    headingId: HeadingIdSchema,
    checklistTemplate: z.string().nullable().optional(),
    tagsTemplate: z.string().nullable().optional(),
  })
  .meta({ ref: "CreateRepeatingRule" })

export const UpdateRepeatingRuleSchema = z
  .object({
    rrule: z.string().min(1).optional(),
    nextOccurrence: z.string().optional(),
    title: z.string().min(1).optional(),
    notes: z.string().nullable().optional(),
    status: RepeatingRuleStatusSchema.optional(),
    // List hierarchy
    listId: ListIdSchema,
    headingId: HeadingIdSchema,
    checklistTemplate: z.string().nullable().optional(),
    tagsTemplate: z.string().nullable().optional(),
  })
  .meta({ ref: "UpdateRepeatingRule" })

// Views
export const ViewTaskSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    notes: z.string().nullable(),
    status: z.string().nullable(),
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
    templateId: z.string().nullable(),
    completedAt: z.string().nullable(),
    trashedAt: z.string().nullable(),
    isLogged: z.boolean(),
    createdAt: z.string(),
  })
  .meta({ ref: "ViewTask" })

export const ViewSectionSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    tasks: z.array(ViewTaskSchema),
    projectId: z.string().optional(),
    areaId: z.string().optional(),
    isEvening: z.boolean().optional(),
    isCompleted: z.boolean().optional(),
    headingId: z.string().optional(),
    isBacklog: z.boolean().optional(),
  })
  .meta({ ref: "ViewSection" })

export const ViewResponseSchema = z
  .object({
    sections: z.array(ViewSectionSchema),
  })
  .meta({ ref: "ViewResponse" })

export const ViewRepeatingRuleSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    notes: z.string().nullable(),
    rrule: z.string(),
    nextOccurrence: z.string(),
    status: z.string(),
    // List hierarchy
    listId: z.string().nullable(),
    headingId: z.string().nullable(),
  })
  .meta({ ref: "ViewRepeatingRule" })

export const DayGroupSchema = z
  .object({
    id: z.string(),
    date: z.string().nullable(),
    label: z.string(),
    tasks: z.array(ViewTaskSchema),
    templates: z.array(ViewRepeatingRuleSchema),
    isLater: z.boolean().optional(),
  })
  .meta({ ref: "DayGroup" })

export const UpcomingViewResponseSchema = z
  .object({
    days: z.array(DayGroupSchema),
  })
  .meta({ ref: "UpcomingViewResponse" })

export const ProjectViewResponseSchema = z
  .object({
    project: z
      .object({
        id: z.string(),
        title: z.string(),
        notes: z.string().nullable(),
        status: z.string(),
        areaId: z.string().nullable(),
        progress: z.number(),
      })
      .nullable(),
    sections: z.array(ViewSectionSchema),
  })
  .meta({ ref: "ProjectViewResponse" })

export const AreaProjectSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    taskCount: z.number(),
    progress: z.number(),
  })
  .meta({ ref: "AreaProject" })

export const AreaViewResponseSchema = z
  .object({
    area: z
      .object({
        id: z.string(),
        title: z.string(),
      })
      .nullable(),
    sections: z.array(ViewSectionSchema),
    projects: z.array(AreaProjectSchema),
  })
  .meta({ ref: "AreaViewResponse" })
