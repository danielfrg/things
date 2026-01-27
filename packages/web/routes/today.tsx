import { createFileRoute } from '@tanstack/react-router';
import { format, isBefore, isToday, startOfDay } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  TaskGroupsData,
  TaskMoveInfo,
  TSection,
} from '@/components/board';
import { TodayStarIcon } from '@/components/icons';
import { ViewContainer } from '@/components/layout/ViewContainer';
import { StandardListView } from '@/components/StandardListView';
import {
  NewTaskButton,
  SearchButton,
  ViewToolbar,
} from '@/components/ToolbarButtons';
import type { ProjectRecord } from '@/db/validation';
import {
  useAreas,
  useProjects,
  useReorderTasks,
  useTasks,
  useUpdateTask,
} from '@/lib/contexts/DataContext';
import { parseLocalDate } from '@/lib/utils';

export const Route = createFileRoute('/today')({
  component: TodayView,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      task: (search.task as string) || undefined,
    };
  },
});

function TodayView() {
  const search = Route.useSearch();
  const { data: tasks, loading: tasksLoading } = useTasks();
  const { data: projects, loading: projectsLoading } = useProjects();
  const { data: areas, loading: areasLoading } = useAreas();

  const updateTask = useUpdateTask();
  const reorderTasks = useReorderTasks();

  const todayStart = startOfDay(new Date());
  const todayStr = format(todayStart, 'yyyy-MM-dd');

  // Auto-update overdue scheduled dates to today
  useEffect(() => {
    if (tasksLoading) return;

    const overdueTasks = tasks.filter((task) => {
      if (task.trashedAt) return false;
      if (task.status === 'completed') return false;
      if (!task.scheduledDate) return false;
      return isBefore(
        startOfDay(parseLocalDate(task.scheduledDate)),
        todayStart,
      );
    });

    for (const task of overdueTasks) {
      updateTask.mutate({ id: task.id, changes: { scheduledDate: todayStr } });
    }
  }, [tasksLoading]);

  const isDateOverdue = useCallback(
    (dateStr: string | null | undefined) => {
      if (!dateStr) return false;
      return isBefore(startOfDay(parseLocalDate(dateStr)), todayStart);
    },
    [todayStart],
  );

  const isDateToday = useCallback((dateStr: string | null | undefined) => {
    if (!dateStr) return false;
    return isToday(parseLocalDate(dateStr));
  }, []);

  const tasksInTodayView = useMemo(() => {
    return tasks.filter((task) => {
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
  }, [tasks, isDateOverdue, isDateToday]);

  const activeTasks = useMemo(
    () =>
      tasksInTodayView.filter((t) => t.status !== 'completed' && !t.isEvening),
    [tasksInTodayView],
  );

  const eveningTasks = useMemo(
    () =>
      tasksInTodayView
        .filter((t) => t.status !== 'completed' && t.isEvening)
        .sort((a, b) => a.position - b.position),
    [tasksInTodayView],
  );

  const completedTasks = useMemo(
    () =>
      tasksInTodayView
        .filter((t) => t.status === 'completed')
        .sort((a, b) => a.position - b.position),
    [tasksInTodayView],
  );

  const tasksWithoutProject = useMemo(
    () =>
      activeTasks
        .filter((t) => !t.projectId && !t.areaId)
        .sort((a, b) => a.position - b.position),
    [activeTasks],
  );

  const activeProjects = useMemo(
    () =>
      projects
        .filter((p) => p.status === 'active')
        .sort((a, b) => a.position - b.position),
    [projects],
  );

  const projectsWithTodayTasks = useMemo(() => {
    return activeProjects
      .map((project) => ({
        project,
        tasks: activeTasks
          .filter((t) => t.projectId === project.id)
          .sort((a, b) => a.position - b.position),
      }))
      .filter((item) => item.tasks.length > 0);
  }, [activeProjects, activeTasks]);

  const projectsWithoutArea = useMemo(
    () => projectsWithTodayTasks.filter((p) => !p.project.areaId),
    [projectsWithTodayTasks],
  );

  const areasWithContent = useMemo(() => {
    return areas
      .map((area) => ({
        area,
        tasksWithoutProject: activeTasks
          .filter((t) => t.areaId === area.id && !t.projectId)
          .sort((a, b) => a.position - b.position),
        projects: projectsWithTodayTasks.filter(
          (p) => p.project.areaId === area.id,
        ),
      }))
      .filter((a) => a.tasksWithoutProject.length > 0 || a.projects.length > 0);
  }, [areas, activeTasks, projectsWithTodayTasks]);

  const boardData = useMemo((): TaskGroupsData => {
    const sections: TSection[] = [];

    if (tasksWithoutProject.length > 0) {
      sections.push({
        id: 'section:no-project',
        title: 'No Project',
        tasks: tasksWithoutProject,
      });
    }

    for (const { project, tasks: projectTasks } of projectsWithoutArea) {
      sections.push({
        id: `section:project:${project.id}`,
        title: project.title,
        tasks: projectTasks,
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
          tasks: areaTasks,
          areaId: area.id,
        });
      }

      for (const { project, tasks: projectTasks } of areaProjects) {
        sections.push({
          id: `section:project:${project.id}`,
          title: project.title,
          tasks: projectTasks,
          projectId: project.id,
        });
      }
    }

    if (eveningTasks.length > 0) {
      sections.push({
        id: 'section:evening',
        title: 'This Evening',
        tasks: eveningTasks,
        isEvening: true,
      });
    }

    if (completedTasks.length > 0) {
      sections.push({
        id: 'section:completed',
        title: 'Completed',
        tasks: completedTasks,
        isCompleted: true,
      });
    }

    return { sections };
  }, [
    tasksWithoutProject,
    projectsWithoutArea,
    areasWithContent,
    eveningTasks,
    completedTasks,
  ]);

  const handleTaskMove = useCallback(
    (info: TaskMoveInfo, allProjects: ProjectRecord[]) => {
      const { taskId, toSection, newTaskIds } = info;
      const changes: Record<string, unknown> = {};

      if (toSection.isEvening) {
        changes.isEvening = true;
      } else {
        changes.isEvening = false;
      }

      if (toSection.projectId) {
        const project = allProjects.find((p) => p.id === toSection.projectId);
        changes.projectId = toSection.projectId;
        changes.areaId = project?.areaId ?? null;
      } else if (toSection.id === 'section:no-project') {
        changes.projectId = null;
        changes.areaId = null;
      } else if (toSection.id.startsWith('section:area:')) {
        const areaId = toSection.id.replace('section:area:', '');
        changes.projectId = null;
        changes.areaId = areaId;
      }

      updateTask.mutate({ id: taskId, changes });
      reorderTasks.mutate(newTaskIds);
    },
    [updateTask, reorderTasks],
  );

  const loading = tasksLoading || projectsLoading || areasLoading;

  return (
    <ViewContainer
      title="Today"
      icon={<TodayStarIcon className="w-6 h-6 text-things-yellow" />}
      iconColor="text-things-yellow"
      toolbar={
        <ViewToolbar>
          <NewTaskButton />
          <SearchButton />
        </ViewToolbar>
      }
    >
      <StandardListView
        boardData={boardData}
        loading={loading}
        emptyMessage="No tasks scheduled for today."
        uncompleteStatus="scheduled"
        hideToday
        onTaskMove={handleTaskMove}
        initialSelectedTaskId={search.task}
      />
    </ViewContainer>
  );
}
