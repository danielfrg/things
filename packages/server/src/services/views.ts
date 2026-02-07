import { addDays, format, isBefore, isSameDay, isToday, startOfDay } from "date-fns"
import { and, eq, isNotNull, isNull, or } from "drizzle-orm"
import { db } from "@/db"
import { type Area, areas, headings, type Project, projects, type Task, tags, tasks, taskTags } from "@/db/schema"
import { getListType, isProjectId } from "@/lib/id"
import { type ContextType, getPositionMap } from "./ordering"
import { spawnDueTemplates } from "./templates"
// =============================================================================
// Types
// =============================================================================
export interface ViewTaskTag {
  id: string
  title: string
}
export interface ViewTask {
  id: string
  title: string
  notes: string | null
  status: string | null
  isSomeday: boolean
  scheduledDate: string | null
  deadline: string | null
  isEvening: boolean
  position: number
  // New List model
  listId: string | null
  headingId: string | null
  // Template relationship
  isTemplate: boolean
  templateId: string | null
  completedAt: string | null
  trashedAt: string | null
  isLogged: boolean
  createdAt: string
  tags?: ViewTaskTag[]
}
export interface ViewSection {
  id: string
  title: string
  tasks: ViewTask[]
  templates?: ViewRepeatingRule[]
  projectId?: string
  areaId?: string
  isEvening?: boolean
  headingId?: string
  isBacklog?: boolean
  isCompleted?: boolean
  isRepeated?: boolean
}
export interface ViewResponse {
  sections: ViewSection[]
}
export interface DayGroup {
  id: string
  date: string | null
  label: string
  tasks: ViewTask[]
  templates: ViewRepeatingRule[]
  isLater?: boolean
}
export interface ViewRepeatingRule {
  id: string
  title: string
  notes: string | null
  rrule: string
  nextOccurrence: string
  status: string
  listId: string | null
  headingId: string | null
}
export interface UpcomingViewResponse {
  days: DayGroup[]
}
// =============================================================================
// Hierarchy Helpers
// =============================================================================
// Build a map of projectId -> areaId for efficient area lookups
async function buildProjectAreaMap(userId: string): Promise<Map<string, string | null>> {
  const allProjects = await db
    .select({ id: projects.id, areaId: projects.areaId })
    .from(projects)
    .where(eq(projects.userId, userId))
  const map = new Map<string, string | null>()
  for (const p of allProjects) {
    map.set(p.id, p.areaId)
  }
  return map
}
// Get projectId from task - direct from listId if it's a project
function getProjectId(task: Task): string | null {
  if (!task.listId) return null
  return isProjectId(task.listId) ? task.listId : null
}
// Get areaId from task - either direct from listId (if area) or via project lookup
function getAreaId(task: Task, projectAreaMap: Map<string, string | null>): string | null {
  if (!task.listId) return null
  const listType = getListType(task.listId)
  if (listType === "area") return task.listId
  if (listType === "project") {
    return projectAreaMap.get(task.listId) ?? null
  }
  return null
}
// =============================================================================
// Helpers
// =============================================================================
function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split("-").map(Number)
  const year = parts[0] ?? 0
  const month = parts[1] ?? 1
  const day = parts[2] ?? 1
  return new Date(year, month - 1, day)
}
function formatTask(t: Task, position: number): ViewTask {
  return {
    id: t.id,
    title: t.title,
    notes: t.notes,
    status: t.status,
    isSomeday: t.isSomeday ?? false,
    scheduledDate: t.scheduledDate,
    deadline: t.deadline,
    isEvening: t.isEvening ?? false,
    position,
    listId: t.listId,
    headingId: t.headingId,
    isTemplate: t.isTemplate ?? false,
    templateId: t.templateId,
    completedAt: t.completedAt?.toISOString() ?? null,
    trashedAt: t.trashedAt?.toISOString() ?? null,
    isLogged: t.isLogged ?? false,
    createdAt: t.createdAt.toISOString(),
  }
}
// Sort tasks by position from the position map, fallback to createdAt
function sortTasksByPosition(tasksToSort: Task[], positionMap: Map<string, number>): Task[] {
  return [...tasksToSort].sort((a, b) => {
    const posA = positionMap.get(a.id) ?? a.createdAt.getTime()
    const posB = positionMap.get(b.id) ?? b.createdAt.getTime()
    return posA - posB
  })
}
// Fetch tags for a list of task IDs and return a map
async function fetchTagsForTasks(userId: string, taskIds: string[]): Promise<Map<string, ViewTaskTag[]>> {
  if (taskIds.length === 0) return new Map()
  const result = await db
    .select({
      taskId: taskTags.taskId,
      tagId: tags.id,
      tagTitle: tags.title,
    })
    .from(taskTags)
    .innerJoin(tags, eq(taskTags.tagId, tags.id))
    .where(and(eq(taskTags.userId, userId), isNull(taskTags.trashedAt)))

  const map = new Map<string, ViewTaskTag[]>()
  for (const row of result) {
    if (!taskIds.includes(row.taskId)) continue
    const existing = map.get(row.taskId) ?? []
    existing.push({ id: row.tagId, title: row.tagTitle })
    map.set(row.taskId, existing)
  }
  return map
}
function formatTemplate(t: Task): ViewRepeatingRule {
  return {
    id: t.id,
    title: t.title,
    notes: t.notes,
    rrule: t.rrule ?? "",
    nextOccurrence: t.nextOccurrence ?? "",
    status: t.status ?? "active",
    listId: t.listId,
    headingId: t.headingId,
  }
}
// =============================================================================
// Today View
// =============================================================================
export async function getTodayView(userId: string): Promise<ViewResponse> {
  const todayStart = startOfDay(new Date())
  const todayStr = format(todayStart, "yyyy-MM-dd")

  // Spawn any due templates first
  await spawnDueTemplates(todayStr, userId)

  const isDateOverdue = (dateStr: string | null) => {
    if (!dateStr) return false
    return isBefore(startOfDay(parseLocalDate(dateStr)), todayStart)
  }
  const isDateToday = (dateStr: string | null) => {
    if (!dateStr) return false
    return isToday(parseLocalDate(dateStr))
  }

  // Fetch all relevant data
  const [allTasks, allProjects, allAreas, todayPositions, projectAreaMap] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.userId, userId)),
    db.select().from(projects).where(eq(projects.userId, userId)),
    db.select().from(areas).where(eq(areas.userId, userId)),
    getPositionMap(userId, "today", null),
    buildProjectAreaMap(userId),
  ])

  // Filter tasks for today view (including completed/cancelled today)
  const todayTasks = allTasks.filter((task: Task) => {
    if (task.trashedAt) return false
    if (task.isTemplate) return false
    const scheduledOverdue = isDateOverdue(task.scheduledDate)
    const scheduledToday = isDateToday(task.scheduledDate)
    const deadlineOverdue = isDateOverdue(task.deadline)
    const deadlineToday = isDateToday(task.deadline)
    const isScheduledForToday = scheduledOverdue || scheduledToday || deadlineOverdue || deadlineToday
    // Logged tasks don't appear in Today view (only in logbook)
    if (task.isLogged) return false
    // Completed tasks only show if completed today (and not logged)
    if (task.completedAt && !task.status?.match(/cancelled/)) {
      return isToday(task.completedAt)
    }
    // Cancelled tasks show if they were scheduled for today OR cancelled today (and not logged)
    if (task.status === "cancelled") {
      const cancelledToday = task.completedAt ? isToday(task.completedAt) : false
      return isScheduledForToday || cancelledToday
    }
    // Active tasks show if scheduled for today
    return isScheduledForToday
  })

  // All tasks (both active and completed) - completed tasks stay in their original section
  const regularTasks = sortTasksByPosition(
    todayTasks.filter((t: Task) => !t.isEvening),
    todayPositions,
  )
  const eveningTasks = sortTasksByPosition(
    todayTasks.filter((t: Task) => t.isEvening),
    todayPositions,
  )

  // Filter tasks without project or area
  const tasksWithoutProject = regularTasks.filter((t: Task) => {
    const projectId = getProjectId(t)
    const areaId = getAreaId(t, projectAreaMap)
    return !projectId && !areaId
  })

  const activeProjects = allProjects
    .filter((p: Project) => p.status === "active" && !p.trashedAt)
    .sort((a: Project, b: Project) => a.position - b.position)

  type ProjectWithTasks = { project: Project; tasks: Task[] }
  const projectsWithTasks: ProjectWithTasks[] = activeProjects
    .map((project: Project) => ({
      project,
      tasks: regularTasks.filter((t: Task) => getProjectId(t) === project.id),
    }))
    .filter((item: ProjectWithTasks) => item.tasks.length > 0)

  const projectsWithoutArea = projectsWithTasks.filter((p: ProjectWithTasks) => !p.project.areaId)

  type AreaWithContent = {
    area: Area
    tasksWithoutProject: Task[]
    projects: ProjectWithTasks[]
  }
  const areasWithContent: AreaWithContent[] = allAreas
    .filter((a: Area) => !a.trashedAt)
    .map((area: Area) => ({
      area,
      tasksWithoutProject: regularTasks.filter((t: Task) => {
        const areaId = getAreaId(t, projectAreaMap)
        const projectId = getProjectId(t)
        return areaId === area.id && !projectId
      }),
      projects: projectsWithTasks.filter((p: ProjectWithTasks) => p.project.areaId === area.id),
    }))
    .filter((a: AreaWithContent) => a.tasksWithoutProject.length > 0 || a.projects.length > 0)

  // Build sections
  const sections: ViewSection[] = []

  if (tasksWithoutProject.length > 0) {
    sections.push({
      id: "section:no-project",
      title: "No Project",
      tasks: tasksWithoutProject.map((t) => formatTask(t, todayPositions.get(t.id) ?? 0)),
    })
  }

  for (const { project, tasks: projectTasks } of projectsWithoutArea) {
    sections.push({
      id: `section:project:${project.id}`,
      title: project.title,
      tasks: projectTasks.map((t) => formatTask(t, todayPositions.get(t.id) ?? 0)),
      projectId: project.id,
    })
  }

  for (const { area, tasksWithoutProject: areaTasks, projects: areaProjects } of areasWithContent) {
    if (areaTasks.length > 0) {
      sections.push({
        id: `section:area:${area.id}`,
        title: area.title,
        tasks: areaTasks.map((t) => formatTask(t, todayPositions.get(t.id) ?? 0)),
        areaId: area.id,
      })
    }
    for (const { project, tasks: projectTasks } of areaProjects) {
      sections.push({
        id: `section:project:${project.id}`,
        title: project.title,
        tasks: projectTasks.map((t) => formatTask(t, todayPositions.get(t.id) ?? 0)),
        projectId: project.id,
      })
    }
  }

  if (eveningTasks.length > 0) {
    sections.push({
      id: "section:evening",
      title: "This Evening",
      tasks: eveningTasks.map((t) => formatTask(t, todayPositions.get(t.id) ?? 0)),
      isEvening: true,
    })
  }

  // Add tags to all tasks in all sections
  const allTaskIds = sections.flatMap((s) => s.tasks.map((t) => t.id))
  const tagsMap = await fetchTagsForTasks(userId, allTaskIds)
  for (const section of sections) {
    for (const task of section.tasks) {
      task.tags = tagsMap.get(task.id) ?? []
    }
  }

  return { sections }
}
// =============================================================================
// Inbox View
// =============================================================================
export async function getInboxView(userId: string): Promise<ViewResponse> {
  // Inbox = tasks with null status (unprocessed)
  const [result, inboxPositions] = await Promise.all([
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), isNull(tasks.status), isNull(tasks.trashedAt), eq(tasks.isTemplate, false))),
    getPositionMap(userId, "inbox", null),
  ])

  const sorted = sortTasksByPosition(result, inboxPositions)
  const formattedTasks = sorted.map((t) => formatTask(t, inboxPositions.get(t.id) ?? 0))

  // Add tags to tasks
  const taskIds = formattedTasks.map((t) => t.id)
  const tagsMap = await fetchTagsForTasks(userId, taskIds)
  for (const task of formattedTasks) {
    task.tags = tagsMap.get(task.id) ?? []
  }

  return {
    sections: [
      {
        id: "inbox",
        title: "Inbox",
        tasks: formattedTasks,
      },
    ],
  }
}
// =============================================================================
// Upcoming View
// =============================================================================
function getDayLabel(date: Date): string {
  const tomorrow = addDays(startOfDay(new Date()), 1)
  if (isSameDay(date, tomorrow)) return "Tomorrow"
  return format(date, "EEEE")
}
export async function getUpcomingView(userId: string): Promise<UpcomingViewResponse> {
  const today = startOfDay(new Date())

  const allTasks = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, userId), isNull(tasks.trashedAt)))
  // Separate regular tasks from templates
  const regularTasks = allTasks.filter((t: Task) => !t.isTemplate)
  const templates = allTasks.filter((t: Task) => t.isTemplate && t.status === "active")
  // Filter upcoming tasks (after today) - include completed tasks scheduled for future dates
  const upcomingTasks = regularTasks.filter((task: Task) => {
    if (!task.scheduledDate && !task.deadline) return false
    const taskDate = task.scheduledDate
      ? startOfDay(parseLocalDate(task.scheduledDate))
      : task.deadline
        ? startOfDay(parseLocalDate(task.deadline))
        : null
    return taskDate && !isBefore(taskDate, addDays(today, 1))
  })
  const days: DayGroup[] = []
  const sevenDaysFromNow = addDays(today, 7)
  // Next 7 days
  for (let i = 1; i <= 7; i++) {
    const date = addDays(today, i)
    const dateStr = format(date, "yyyy-MM-dd")
    // Get positions for this specific date
    const datePositions = await getPositionMap(userId, "upcoming", dateStr)
    const dayTasks = upcomingTasks.filter((t: Task) => {
      const scheduledDate = t.scheduledDate ? startOfDay(parseLocalDate(t.scheduledDate)) : null
      const deadline = t.deadline ? startOfDay(parseLocalDate(t.deadline)) : null
      return (
        (scheduledDate && isSameDay(scheduledDate, date)) || (deadline && !scheduledDate && isSameDay(deadline, date))
      )
    })
    const sortedDayTasks = sortTasksByPosition(dayTasks, datePositions)
    const dayTemplates = templates.filter((t: Task) => {
      if (!t.nextOccurrence) return false
      const nextDate = startOfDay(parseLocalDate(t.nextOccurrence))
      return isSameDay(nextDate, date)
    })
    if (sortedDayTasks.length > 0 || dayTemplates.length > 0 || i === 1) {
      days.push({
        id: dateStr,
        date: dateStr,
        label: getDayLabel(date),
        tasks: sortedDayTasks.map((t) => formatTask(t, datePositions.get(t.id) ?? 0)),
        templates: dayTemplates.map((t) => formatTemplate(t)),
      })
    }
  }
  // Later (beyond 7 days)
  const laterTasks = upcomingTasks.filter((t: Task) => {
    const scheduledDate = t.scheduledDate ? startOfDay(parseLocalDate(t.scheduledDate)) : null
    const deadline = t.deadline ? startOfDay(parseLocalDate(t.deadline)) : null
    const taskDate = scheduledDate || deadline
    return taskDate && !isBefore(taskDate, addDays(sevenDaysFromNow, 1))
  })
  // Sort later tasks by date first, then by position within date
  const laterTasksSorted = [...laterTasks].sort((a, b) => {
    const dateA = a.scheduledDate || a.deadline || ""
    const dateB = b.scheduledDate || b.deadline || ""
    if (dateA !== dateB) return dateA.localeCompare(dateB)
    return a.createdAt.getTime() - b.createdAt.getTime()
  })
  const laterTemplates = templates.filter((t: Task) => {
    if (!t.nextOccurrence) return false
    const nextDate = startOfDay(parseLocalDate(t.nextOccurrence))
    return !isBefore(nextDate, addDays(sevenDaysFromNow, 1))
  })
  if (laterTasksSorted.length > 0 || laterTemplates.length > 0) {
    days.push({
      id: "later",
      date: null,
      label: "Later",
      tasks: laterTasksSorted.map((t) => formatTask(t, 0)),
      templates: laterTemplates.map((t) => formatTemplate(t)),
      isLater: true,
    })
  }

  // Add tags to all tasks in all days
  const allTaskIds = days.flatMap((d) => d.tasks.map((t) => t.id))
  const tagsMap = await fetchTagsForTasks(userId, allTaskIds)
  for (const day of days) {
    for (const task of day.tasks) {
      task.tags = tagsMap.get(task.id) ?? []
    }
  }

  return { days }
}
// =============================================================================
// Anytime View
// =============================================================================
export async function getAnytimeView(userId: string): Promise<ViewResponse> {
  // Anytime = active tasks without scheduled date, not someday
  // Also include cancelled tasks that belong to anytime view (cancelled today)
  const [allTasks, allProjects, allAreas, anytimePositions, projectAreaMap] = await Promise.all([
    db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.isSomeday, false),
          isNull(tasks.scheduledDate),
          isNull(tasks.trashedAt),
          eq(tasks.isTemplate, false),
          or(eq(tasks.status, "active"), eq(tasks.status, "cancelled")),
        ),
      ),
    db.select().from(projects).where(eq(projects.userId, userId)),
    db.select().from(areas).where(eq(areas.userId, userId)),
    getPositionMap(userId, "anytime", null),
    buildProjectAreaMap(userId),
  ])

  // Filter cancelled tasks to only include those cancelled today (and not logged)
  const filteredTasks = allTasks.filter((t: Task) => {
    if (t.isLogged) return false
    if (t.status === "cancelled") {
      return t.completedAt ? isToday(t.completedAt) : false
    }
    return true
  })

  const response = buildSectionedView(filteredTasks, allProjects, allAreas, anytimePositions, projectAreaMap)
  return addTagsToViewResponse(userId, response)
}
// =============================================================================
// Someday View
// =============================================================================
export async function getSomedayView(userId: string): Promise<ViewResponse> {
  // Someday = active tasks with isSomeday=true that don't have a scheduledDate
  // Also include cancelled tasks that belong to someday view (cancelled today)
  const [allTasks, allProjects, allAreas, somedayPositions, projectAreaMap] = await Promise.all([
    db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.isSomeday, true),
          isNull(tasks.scheduledDate),
          isNull(tasks.trashedAt),
          eq(tasks.isTemplate, false),
          or(eq(tasks.status, "active"), eq(tasks.status, "cancelled")),
        ),
      ),
    db.select().from(projects).where(eq(projects.userId, userId)),
    db.select().from(areas).where(eq(areas.userId, userId)),
    getPositionMap(userId, "someday", null),
    buildProjectAreaMap(userId),
  ])

  // Filter cancelled tasks to only include those cancelled today (and not logged)
  const filteredTasks = allTasks.filter((t: Task) => {
    if (t.isLogged) return false
    if (t.status === "cancelled") {
      return t.completedAt ? isToday(t.completedAt) : false
    }
    return true
  })

  const response = buildSectionedView(filteredTasks, allProjects, allAreas, somedayPositions, projectAreaMap)
  return addTagsToViewResponse(userId, response)
}
// =============================================================================
// Shared Sectioned View Builder
// =============================================================================
// Add tags to a ViewResponse (for all tasks in all sections)
async function addTagsToViewResponse(userId: string, response: ViewResponse): Promise<ViewResponse> {
  const allTaskIds = response.sections.flatMap((s) => s.tasks.map((t) => t.id))
  if (allTaskIds.length === 0) return response
  const tagsMap = await fetchTagsForTasks(userId, allTaskIds)
  for (const section of response.sections) {
    for (const task of section.tasks) {
      task.tags = tagsMap.get(task.id) ?? []
    }
  }
  return response
}
function buildSectionedView(
  allTasks: Task[],
  allProjects: Project[],
  allAreas: Area[],
  positionMap: Map<string, number>,
  projectAreaMap: Map<string, string | null>,
): ViewResponse {
  const activeProjects = allProjects
    .filter((p: Project) => p.status === "active" && !p.trashedAt)
    .sort((a: Project, b: Project) => a.position - b.position)

  const sortedTasks = sortTasksByPosition(allTasks, positionMap)

  const tasksWithoutProject = sortedTasks.filter((t: Task) => {
    const projectId = getProjectId(t)
    const areaId = getAreaId(t, projectAreaMap)
    return !projectId && !areaId
  })

  type ProjectWithTasks = { project: Project; tasks: Task[] }
  const projectsWithTasks: ProjectWithTasks[] = activeProjects
    .map((project: Project) => ({
      project,
      tasks: sortedTasks.filter((t: Task) => getProjectId(t) === project.id),
    }))
    .filter((item: ProjectWithTasks) => item.tasks.length > 0)

  const projectsWithoutArea = projectsWithTasks.filter((item: ProjectWithTasks) => !item.project.areaId)

  type AreaWithContent = {
    area: Area
    tasksWithoutProject: Task[]
    projects: ProjectWithTasks[]
  }
  const areasWithContent: AreaWithContent[] = allAreas
    .filter((a: Area) => !a.trashedAt)
    .map((area: Area) => ({
      area,
      tasksWithoutProject: sortedTasks.filter((t: Task) => {
        const areaId = getAreaId(t, projectAreaMap)
        const projectId = getProjectId(t)
        return areaId === area.id && !projectId
      }),
      projects: projectsWithTasks.filter((item: ProjectWithTasks) => item.project.areaId === area.id),
    }))
    .filter((a: AreaWithContent) => a.tasksWithoutProject.length > 0 || a.projects.length > 0)

  const sections: ViewSection[] = []

  if (tasksWithoutProject.length > 0) {
    sections.push({
      id: "section:no-project",
      title: "No Project",
      tasks: tasksWithoutProject.map((t) => formatTask(t, positionMap.get(t.id) ?? 0)),
    })
  }

  for (const { project, tasks: projectTasks } of projectsWithoutArea) {
    sections.push({
      id: `section:project:${project.id}`,
      title: project.title,
      tasks: projectTasks.map((t) => formatTask(t, positionMap.get(t.id) ?? 0)),
      projectId: project.id,
    })
  }

  for (const { area, tasksWithoutProject: areaTasks, projects: areaProjects } of areasWithContent) {
    if (areaTasks.length > 0) {
      sections.push({
        id: `section:area:${area.id}`,
        title: area.title,
        tasks: areaTasks.map((t) => formatTask(t, positionMap.get(t.id) ?? 0)),
        areaId: area.id,
      })
    }
    for (const { project, tasks: projectTasks } of areaProjects) {
      sections.push({
        id: `section:project:${project.id}`,
        title: project.title,
        tasks: projectTasks.map((t) => formatTask(t, positionMap.get(t.id) ?? 0)),
        projectId: project.id,
      })
    }
  }

  return { sections }
}
// =============================================================================
// Logbook View
// =============================================================================
export async function getLogbookView(userId: string): Promise<ViewResponse> {
  const result = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        isNull(tasks.trashedAt),
        eq(tasks.isTemplate, false),
        // Only show tasks that have been explicitly logged
        eq(tasks.isLogged, true),
      ),
    )
  // Sort by completedAt descending (most recently completed first)
  const sorted = [...result].sort((a, b) => {
    const aTime = a.completedAt?.getTime() ?? 0
    const bTime = b.completedAt?.getTime() ?? 0
    return bTime - aTime
  })

  const formattedTasks = sorted.map((t, index) => formatTask(t, index))

  // Add tags
  const taskIds = formattedTasks.map((t) => t.id)
  const tagsMap = await fetchTagsForTasks(userId, taskIds)
  for (const task of formattedTasks) {
    task.tags = tagsMap.get(task.id) ?? []
  }

  return {
    sections: [
      {
        id: "logbook",
        title: "Logbook",
        tasks: formattedTasks,
      },
    ],
  }
}
// =============================================================================
// Trash View
// =============================================================================
export async function getTrashView(userId: string): Promise<ViewResponse> {
  const result = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.isTemplate, false),
        or(eq(tasks.status, "trashed"), isNotNull(tasks.trashedAt)),
      ),
    )
  // Sort by trashedAt descending (most recently trashed first)
  const sorted = [...result].sort((a, b) => {
    const aTime = a.trashedAt?.getTime() ?? 0
    const bTime = b.trashedAt?.getTime() ?? 0
    return bTime - aTime
  })

  const formattedTasks = sorted.map((t, index) => formatTask(t, index))

  // Add tags
  const taskIds = formattedTasks.map((t) => t.id)
  const tagsMap = await fetchTagsForTasks(userId, taskIds)
  for (const task of formattedTasks) {
    task.tags = tagsMap.get(task.id) ?? []
  }

  return {
    sections: [
      {
        id: "trash",
        title: "Trash",
        tasks: formattedTasks,
      },
    ],
  }
}
// =============================================================================
// Project View
// =============================================================================
export interface ProjectViewResponse {
  project: {
    id: string
    title: string
    notes: string | null
    status: string
    areaId: string | null
  } | null
  sections: ViewSection[]
}
export async function getProjectView(userId: string, projectId: string): Promise<ProjectViewResponse> {
  const [projectResults, allTasks, allHeadings, projectPositions, projectTemplates] = await Promise.all([
    db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId), isNull(projects.trashedAt))),
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), isNull(tasks.trashedAt), eq(tasks.isTemplate, false))),
    db
      .select()
      .from(headings)
      .where(and(eq(headings.projectId, projectId), isNull(headings.trashedAt))),
    getPositionMap(userId, "project", projectId),
    db
      .select()
      .from(tasks)
      .where(
        and(eq(tasks.userId, userId), eq(tasks.listId, projectId), eq(tasks.isTemplate, true), isNull(tasks.trashedAt)),
      ),
  ])
  const project = projectResults[0]
  if (!project) {
    return { project: null, sections: [] }
  }
  // Filter tasks that belong to this project (listId = projectId)
  const projectTasks = allTasks.filter((t) => t.listId === projectId)
  // Separate headings
  const backlogHeading = allHeadings.find((h) => h.isBacklog)
  const regularHeadings = allHeadings.filter((h) => !h.isBacklog).sort((a, b) => a.position - b.position)
  // Active tasks (not completed/cancelled, not someday) - but include cancelled today (and not logged)
  const activeTasks = projectTasks.filter((t) => {
    if (t.isLogged) return false
    if (t.status === "cancelled") {
      return t.completedAt ? isToday(t.completedAt) : false
    }
    return !t.completedAt && !t.isSomeday
  })
  // Unheaded active tasks (no headingId)
  const unheaded = sortTasksByPosition(
    activeTasks.filter((t) => !t.headingId),
    projectPositions,
  )
  // Backlog tasks (isSomeday=true)
  const backlog = sortTasksByPosition(
    projectTasks.filter((t) => t.isSomeday),
    projectPositions,
  )
  // Completed today (not logged)
  const completedToday = sortTasksByPosition(
    projectTasks.filter((t) => t.completedAt && isToday(t.completedAt) && !t.isLogged),
    projectPositions,
  )
  const sections: ViewSection[] = []
  // Unheaded section - only add if there are tasks (no header shown)
  if (unheaded.length > 0) {
    sections.push({
      id: "section:unheaded",
      title: "",
      tasks: unheaded.map((t) => formatTask(t, projectPositions.get(t.id) ?? 0)),
      projectId,
    })
  }
  // Regular heading sections
  for (const heading of regularHeadings) {
    const headingTasks = sortTasksByPosition(
      activeTasks.filter((t) => t.headingId === heading.id),
      projectPositions,
    )
    sections.push({
      id: `section:heading:${heading.id}`,
      title: heading.title,
      tasks: headingTasks.map((t) => formatTask(t, projectPositions.get(t.id) ?? 0)),
      projectId,
      headingId: heading.id,
    })
  }
  // Backlog section (show if there are backlog tasks OR if a backlog heading exists)
  // If no backlog heading exists in DB, create a virtual section
  if (backlog.length > 0 || backlogHeading) {
    sections.push({
      id: backlogHeading ? `section:heading:${backlogHeading.id}` : "section:backlog",
      title: backlogHeading?.title ?? "Someday",
      tasks: backlog.map((t) => formatTask(t, projectPositions.get(t.id) ?? 0)),
      projectId,
      headingId: backlogHeading?.id,
      isBacklog: true,
    })
  }
  // Repeated section - templates assigned to this project, sorted by next occurrence
  const sortedTemplates = [...projectTemplates].sort((a, b) => {
    const dateA = a.nextOccurrence ?? ""
    const dateB = b.nextOccurrence ?? ""
    return dateA.localeCompare(dateB)
  })
  if (sortedTemplates.length > 0) {
    sections.push({
      id: "section:repeated",
      title: "Repeated",
      tasks: [],
      templates: sortedTemplates.map((t) => formatTemplate(t)),
      projectId,
      isRepeated: true,
    })
  }
  // Completed today section
  if (completedToday.length > 0) {
    sections.push({
      id: "section:completed",
      title: "Completed Today",
      tasks: completedToday.map((t) => formatTask(t, projectPositions.get(t.id) ?? 0)),
      projectId,
      isCompleted: true,
    })
  }
  // Add tags to all tasks
  const allTaskIds = sections.flatMap((s) => s.tasks.map((t) => t.id))
  const tagsMap = await fetchTagsForTasks(userId, allTaskIds)
  for (const section of sections) {
    for (const task of section.tasks) {
      task.tags = tagsMap.get(task.id) ?? []
    }
  }
  return {
    project: {
      id: project.id,
      title: project.title,
      notes: project.notes,
      status: project.status,
      areaId: project.areaId,
    },
    sections,
  }
}
// =============================================================================
// Area View
// =============================================================================
export interface AreaViewResponse {
  area: {
    id: string
    title: string
  } | null
  sections: ViewSection[]
  projects: Array<{
    id: string
    title: string
    taskCount: number
    progress: number
  }>
}
export async function getAreaView(userId: string, areaId: string): Promise<AreaViewResponse> {
  const [areaResults, allTasks, areaProjects, areaPositions, areaTemplates] = await Promise.all([
    db
      .select()
      .from(areas)
      .where(and(eq(areas.id, areaId), eq(areas.userId, userId), isNull(areas.trashedAt))),
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), isNull(tasks.trashedAt), eq(tasks.isTemplate, false))),
    db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.userId, userId),
          eq(projects.areaId, areaId),
          eq(projects.status, "active"),
          isNull(projects.trashedAt),
        ),
      ),
    getPositionMap(userId, "area", areaId),
    db
      .select()
      .from(tasks)
      .where(
        and(eq(tasks.userId, userId), eq(tasks.listId, areaId), eq(tasks.isTemplate, true), isNull(tasks.trashedAt)),
      ),
  ])
  const area = areaResults[0]
  if (!area) {
    return { area: null, sections: [], projects: [] }
  }
  // Tasks directly in the area (listId = areaId, not someday) - include cancelled today
  const areaTasks = sortTasksByPosition(
    allTasks.filter((t) => {
      if (t.listId !== areaId) return false
      if (t.isLogged) return false
      if (t.status === "cancelled") {
        return t.completedAt ? isToday(t.completedAt) : false
      }
      return !t.completedAt && !t.isSomeday
    }),
    areaPositions,
  )
  // Someday tasks in the area (listId = areaId)
  const somedayTasks = sortTasksByPosition(
    allTasks.filter((t) => {
      return t.listId === areaId && t.isSomeday
    }),
    areaPositions,
  )
  const sections: ViewSection[] = []
  // Area tasks section
  if (areaTasks.length > 0) {
    sections.push({
      id: "section:area-tasks",
      title: "",
      tasks: areaTasks.map((t) => formatTask(t, areaPositions.get(t.id) ?? 0)),
      areaId,
    })
  }
  // Someday section - only show if there are someday tasks
  if (somedayTasks.length > 0) {
    sections.push({
      id: "section:someday",
      title: "Someday",
      tasks: somedayTasks.map((t) => formatTask(t, areaPositions.get(t.id) ?? 0)),
      areaId,
      isBacklog: true,
    })
  }
  // Repeated section - templates assigned to this area, sorted by next occurrence
  const sortedTemplates = [...areaTemplates].sort((a, b) => {
    const dateA = a.nextOccurrence ?? ""
    const dateB = b.nextOccurrence ?? ""
    return dateA.localeCompare(dateB)
  })
  if (sortedTemplates.length > 0) {
    sections.push({
      id: "section:repeated",
      title: "Repeated",
      tasks: [],
      templates: sortedTemplates.map((t) => formatTemplate(t)),
      areaId,
      isRepeated: true,
    })
  }
  // Projects with task counts and progress
  const projectsWithStats = areaProjects
    .sort((a, b) => a.position - b.position)
    .map((project) => {
      const projectTasks = allTasks.filter((t) => t.listId === project.id)
      const activeProjTasks = projectTasks.filter((t) => t.status !== "completed")
      const completedTasks = projectTasks.filter((t) => t.status === "completed")
      const progress = projectTasks.length > 0 ? Math.round((completedTasks.length / projectTasks.length) * 100) : 0
      return {
        id: project.id,
        title: project.title,
        taskCount: activeProjTasks.length,
        progress,
      }
    })
  // Add tags to all tasks
  const allTaskIds = sections.flatMap((s) => s.tasks.map((t) => t.id))
  const tagsMap = await fetchTagsForTasks(userId, allTaskIds)
  for (const section of sections) {
    for (const task of section.tasks) {
      task.tags = tagsMap.get(task.id) ?? []
    }
  }
  return {
    area: {
      id: area.id,
      title: area.title,
    },
    sections,
    projects: projectsWithStats,
  }
}
