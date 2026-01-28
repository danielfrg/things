import {
  addDays,
  format,
  isBefore,
  isSameDay,
  isToday,
  startOfDay,
} from 'date-fns';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import {
  type Area,
  areas,
  type Project,
  projects,
  type RepeatingRule,
  repeatingRules,
  type Task,
  tasks,
} from '@/db/schema';

// =============================================================================
// Types
// =============================================================================

export interface ViewTask {
  id: string;
  title: string;
  notes: string | null;
  status: string;
  type: string;
  scheduledDate: string | null;
  deadline: string | null;
  isEvening: boolean;
  position: number;
  projectId: string | null;
  headingId: string | null;
  areaId: string | null;
  completedAt: string | null;
  trashedAt: string | null;
  createdAt: string;
}

export interface ViewSection {
  id: string;
  title: string;
  tasks: ViewTask[];
  projectId?: string;
  areaId?: string;
  isEvening?: boolean;
  isCompleted?: boolean;
}

export interface ViewResponse {
  sections: ViewSection[];
}

export interface DayGroup {
  id: string;
  date: string | null;
  label: string;
  tasks: ViewTask[];
  templates: ViewRepeatingRule[];
  isLater?: boolean;
}

export interface ViewRepeatingRule {
  id: string;
  title: string;
  notes: string | null;
  rrule: string;
  nextOccurrence: string;
  status: string;
  projectId: string | null;
  areaId: string | null;
}

export interface UpcomingViewResponse {
  days: DayGroup[];
}

// =============================================================================
// Helpers
// =============================================================================

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatTask(t: Task): ViewTask {
  return {
    id: t.id,
    title: t.title,
    notes: t.notes,
    status: t.status,
    type: t.type,
    scheduledDate: t.scheduledDate,
    deadline: t.deadline,
    isEvening: t.isEvening ?? false,
    position: t.position,
    projectId: t.projectId,
    headingId: t.headingId,
    areaId: t.areaId,
    completedAt: t.completedAt?.toISOString() ?? null,
    trashedAt: t.trashedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
  };
}

function formatRepeatingRule(r: RepeatingRule): ViewRepeatingRule {
  return {
    id: r.id,
    title: r.title,
    notes: r.notes,
    rrule: r.rrule,
    nextOccurrence: r.nextOccurrence,
    status: r.status,
    projectId: r.projectId,
    areaId: r.areaId,
  };
}

// =============================================================================
// Today View
// =============================================================================

export async function getTodayView(userId: string): Promise<ViewResponse> {
  const todayStart = startOfDay(new Date());

  const isDateOverdue = (dateStr: string | null) => {
    if (!dateStr) return false;
    return isBefore(startOfDay(parseLocalDate(dateStr)), todayStart);
  };

  const isDateToday = (dateStr: string | null) => {
    if (!dateStr) return false;
    return isToday(parseLocalDate(dateStr));
  };

  // Fetch all relevant data
  const [allTasks, allProjects, allAreas] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.userId, userId)),
    db.select().from(projects).where(eq(projects.userId, userId)),
    db.select().from(areas).where(eq(areas.userId, userId)),
  ]);

  // Filter tasks for today view
  const todayTasks = allTasks.filter((task: Task) => {
    if (task.trashedAt) return false;

    if (task.status === 'completed') {
      return task.completedAt ? isToday(task.completedAt) : false;
    }

    const scheduledOverdue = isDateOverdue(task.scheduledDate);
    const scheduledToday = isDateToday(task.scheduledDate);
    const deadlineOverdue = isDateOverdue(task.deadline);
    const deadlineToday = isDateToday(task.deadline);

    return (
      scheduledOverdue || scheduledToday || deadlineOverdue || deadlineToday
    );
  });

  const activeTasks = todayTasks.filter(
    (t: Task) => t.status !== 'completed' && !t.isEvening,
  );
  const eveningTasks = todayTasks
    .filter((t: Task) => t.status !== 'completed' && t.isEvening)
    .sort((a: Task, b: Task) => a.position - b.position);
  const completedTasks = todayTasks
    .filter((t: Task) => t.status === 'completed')
    .sort((a: Task, b: Task) => a.position - b.position);

  const tasksWithoutProject = activeTasks
    .filter((t: Task) => !t.projectId && !t.areaId)
    .sort((a: Task, b: Task) => a.position - b.position);

  const activeProjects = allProjects
    .filter((p: Project) => p.status === 'active' && !p.deletedAt)
    .sort((a: Project, b: Project) => a.position - b.position);

  type ProjectWithTasks = { project: Project; tasks: Task[] };

  const projectsWithTasks: ProjectWithTasks[] = activeProjects
    .map((project: Project) => ({
      project,
      tasks: activeTasks
        .filter((t: Task) => t.projectId === project.id)
        .sort((a: Task, b: Task) => a.position - b.position),
    }))
    .filter((item: ProjectWithTasks) => item.tasks.length > 0);

  const projectsWithoutArea = projectsWithTasks.filter(
    (p: ProjectWithTasks) => !p.project.areaId,
  );

  type AreaWithContent = {
    area: Area;
    tasksWithoutProject: Task[];
    projects: ProjectWithTasks[];
  };

  const areasWithContent: AreaWithContent[] = allAreas
    .filter((a: Area) => !a.deletedAt)
    .map((area: Area) => ({
      area,
      tasksWithoutProject: activeTasks
        .filter((t: Task) => t.areaId === area.id && !t.projectId)
        .sort((a: Task, b: Task) => a.position - b.position),
      projects: projectsWithTasks.filter(
        (p: ProjectWithTasks) => p.project.areaId === area.id,
      ),
    }))
    .filter(
      (a: AreaWithContent) =>
        a.tasksWithoutProject.length > 0 || a.projects.length > 0,
    );

  // Build sections
  const sections: ViewSection[] = [];

  if (tasksWithoutProject.length > 0) {
    sections.push({
      id: 'section:no-project',
      title: 'No Project',
      tasks: tasksWithoutProject.map(formatTask),
    });
  }

  for (const { project, tasks: projectTasks } of projectsWithoutArea) {
    sections.push({
      id: `section:project:${project.id}`,
      title: project.title,
      tasks: projectTasks.map(formatTask),
      projectId: project.id,
    });
  }

  for (const {
    area,
    tasksWithoutProject: areaTasks,
    projects: areaProjects,
  } of areasWithContent) {
    if (areaTasks.length > 0) {
      sections.push({
        id: `section:area:${area.id}`,
        title: area.title,
        tasks: areaTasks.map(formatTask),
        areaId: area.id,
      });
    }

    for (const { project, tasks: projectTasks } of areaProjects) {
      sections.push({
        id: `section:project:${project.id}`,
        title: project.title,
        tasks: projectTasks.map(formatTask),
        projectId: project.id,
      });
    }
  }

  if (eveningTasks.length > 0) {
    sections.push({
      id: 'section:evening',
      title: 'This Evening',
      tasks: eveningTasks.map(formatTask),
      isEvening: true,
    });
  }

  if (completedTasks.length > 0) {
    sections.push({
      id: 'section:completed',
      title: 'Completed',
      tasks: completedTasks.map(formatTask),
      isCompleted: true,
    });
  }

  return { sections };
}

// =============================================================================
// Inbox View
// =============================================================================

export async function getInboxView(userId: string): Promise<ViewResponse> {
  const result = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.status, 'inbox'),
        isNull(tasks.trashedAt),
        isNull(tasks.scheduledDate),
        isNull(tasks.projectId),
        isNull(tasks.areaId),
      ),
    );

  const sorted = result.sort((a: Task, b: Task) => a.position - b.position);

  return {
    sections: [
      {
        id: 'inbox',
        title: 'Inbox',
        tasks: sorted.map(formatTask),
      },
    ],
  };
}

// =============================================================================
// Upcoming View
// =============================================================================

function getDayLabel(date: Date): string {
  const tomorrow = addDays(startOfDay(new Date()), 1);
  if (isSameDay(date, tomorrow)) return 'Tomorrow';
  return format(date, 'EEEE');
}

export async function getUpcomingView(
  userId: string,
): Promise<UpcomingViewResponse> {
  const today = startOfDay(new Date());

  const [allTasks, allRules] = await Promise.all([
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), isNull(tasks.trashedAt))),
    db
      .select()
      .from(repeatingRules)
      .where(
        and(
          eq(repeatingRules.userId, userId),
          isNull(repeatingRules.deletedAt),
        ),
      ),
  ]);

  // Filter upcoming tasks (after today)
  const upcomingTasks = allTasks.filter((task: Task) => {
    if (task.status === 'completed') return false;
    if (!task.scheduledDate && !task.deadline) return false;

    const taskDate = task.scheduledDate
      ? startOfDay(parseLocalDate(task.scheduledDate))
      : task.deadline
        ? startOfDay(parseLocalDate(task.deadline))
        : null;

    return taskDate && !isBefore(taskDate, addDays(today, 1));
  });

  const activeTemplates = allRules.filter(
    (r: RepeatingRule) => r.status === 'active',
  );

  const days: DayGroup[] = [];
  const sevenDaysFromNow = addDays(today, 7);

  // Next 7 days
  for (let i = 1; i <= 7; i++) {
    const date = addDays(today, i);
    const dateStr = format(date, 'yyyy-MM-dd');

    const dayTasks = upcomingTasks
      .filter((t: Task) => {
        const scheduledDate = t.scheduledDate
          ? startOfDay(parseLocalDate(t.scheduledDate))
          : null;
        const deadline = t.deadline
          ? startOfDay(parseLocalDate(t.deadline))
          : null;
        return (
          (scheduledDate && isSameDay(scheduledDate, date)) ||
          (deadline && !scheduledDate && isSameDay(deadline, date))
        );
      })
      .sort((a: Task, b: Task) => a.position - b.position);

    const dayTemplates = activeTemplates.filter((r: RepeatingRule) => {
      const nextDate = startOfDay(parseLocalDate(r.nextOccurrence));
      return isSameDay(nextDate, date);
    });

    if (dayTasks.length > 0 || dayTemplates.length > 0 || i === 1) {
      days.push({
        id: dateStr,
        date: dateStr,
        label: getDayLabel(date),
        tasks: dayTasks.map(formatTask),
        templates: dayTemplates.map(formatRepeatingRule),
      });
    }
  }

  // Later (beyond 7 days)
  const laterTasks = upcomingTasks
    .filter((t: Task) => {
      const scheduledDate = t.scheduledDate
        ? startOfDay(parseLocalDate(t.scheduledDate))
        : null;
      const deadline = t.deadline
        ? startOfDay(parseLocalDate(t.deadline))
        : null;
      const taskDate = scheduledDate || deadline;
      return taskDate && !isBefore(taskDate, addDays(sevenDaysFromNow, 1));
    })
    .sort((a: Task, b: Task) => {
      const dateA = a.scheduledDate || a.deadline || '';
      const dateB = b.scheduledDate || b.deadline || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return a.position - b.position;
    });

  const laterTemplates = activeTemplates.filter((r: RepeatingRule) => {
    const nextDate = startOfDay(parseLocalDate(r.nextOccurrence));
    return !isBefore(nextDate, addDays(sevenDaysFromNow, 1));
  });

  if (laterTasks.length > 0 || laterTemplates.length > 0) {
    days.push({
      id: 'later',
      date: null,
      label: 'Later',
      tasks: laterTasks.map(formatTask),
      templates: laterTemplates.map(formatRepeatingRule),
      isLater: true,
    });
  }

  return { days };
}

// =============================================================================
// Anytime View
// =============================================================================

export async function getAnytimeView(userId: string): Promise<ViewResponse> {
  return getViewByStatus(userId, 'anytime');
}

// =============================================================================
// Someday View
// =============================================================================

export async function getSomedayView(userId: string): Promise<ViewResponse> {
  return getViewByStatus(userId, 'someday');
}

// =============================================================================
// Shared Status-based View Logic
// =============================================================================

async function getViewByStatus(
  userId: string,
  status: 'anytime' | 'someday',
): Promise<ViewResponse> {
  const [allTasks, allProjects, allAreas] = await Promise.all([
    db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.status, status),
          isNull(tasks.trashedAt),
        ),
      ),
    db.select().from(projects).where(eq(projects.userId, userId)),
    db.select().from(areas).where(eq(areas.userId, userId)),
  ]);

  const activeProjects = allProjects
    .filter((p: Project) => p.status === 'active' && !p.deletedAt)
    .sort((a: Project, b: Project) => a.position - b.position);

  const filteredTasks = allTasks.filter((t: Task) => t.status !== 'completed');

  const tasksWithoutProject = filteredTasks
    .filter((t: Task) => !t.projectId && !t.areaId)
    .sort((a: Task, b: Task) => a.position - b.position);

  type ProjectWithTasks = { project: Project; tasks: Task[] };

  const projectsWithTasks: ProjectWithTasks[] = activeProjects
    .map((project: Project) => ({
      project,
      tasks: filteredTasks
        .filter((t: Task) => t.projectId === project.id)
        .sort((a: Task, b: Task) => a.position - b.position),
    }))
    .filter((item: ProjectWithTasks) => item.tasks.length > 0);

  const projectsWithoutArea = projectsWithTasks.filter(
    (item: ProjectWithTasks) => !item.project.areaId,
  );

  type AreaWithContent = {
    area: Area;
    tasksWithoutProject: Task[];
    projects: ProjectWithTasks[];
  };

  const areasWithContent: AreaWithContent[] = allAreas
    .filter((a: Area) => !a.deletedAt)
    .map((area: Area) => ({
      area,
      tasksWithoutProject: filteredTasks
        .filter((t: Task) => t.areaId === area.id && !t.projectId)
        .sort((a: Task, b: Task) => a.position - b.position),
      projects: projectsWithTasks.filter(
        (item: ProjectWithTasks) => item.project.areaId === area.id,
      ),
    }))
    .filter(
      (a: AreaWithContent) =>
        a.tasksWithoutProject.length > 0 || a.projects.length > 0,
    );

  const sections: ViewSection[] = [];

  if (tasksWithoutProject.length > 0) {
    sections.push({
      id: 'section:no-project',
      title: 'No Project',
      tasks: tasksWithoutProject.map(formatTask),
    });
  }

  for (const { project, tasks: projectTasks } of projectsWithoutArea) {
    sections.push({
      id: `section:project:${project.id}`,
      title: project.title,
      tasks: projectTasks.map(formatTask),
      projectId: project.id,
    });
  }

  for (const {
    area,
    tasksWithoutProject: areaTasks,
    projects: areaProjects,
  } of areasWithContent) {
    if (areaTasks.length > 0) {
      sections.push({
        id: `section:area:${area.id}`,
        title: area.title,
        tasks: areaTasks.map(formatTask),
        areaId: area.id,
      });
    }

    for (const { project, tasks: projectTasks } of areaProjects) {
      sections.push({
        id: `section:project:${project.id}`,
        title: project.title,
        tasks: projectTasks.map(formatTask),
        projectId: project.id,
      });
    }
  }

  return { sections };
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
        eq(tasks.status, 'completed'),
        isNull(tasks.trashedAt),
      ),
    );

  const sorted = result.sort((a: Task, b: Task) => a.position - b.position);

  return {
    sections: [
      {
        id: 'logbook',
        title: 'Logbook',
        tasks: sorted.map(formatTask),
      },
    ],
  };
}
