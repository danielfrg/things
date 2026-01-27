import { useMemo } from 'react';
import type { TaskGroupsData, TSection } from '@/components/board';
import type { AreaRecord, ProjectRecord, TaskRecord } from '@/db/validation';

type TaskStatus = 'anytime' | 'someday';

interface UseBoardDataByStatusOptions {
  status: TaskStatus;
  tasks: TaskRecord[];
  projects: ProjectRecord[];
  areas: AreaRecord[];
}

/**
 * Hook that groups tasks by project/area for status-based views (Anytime, Someday).
 * Extracts the common grouping logic used across multiple routes.
 */
export function useBoardDataByStatus({
  status,
  tasks,
  projects,
  areas,
}: UseBoardDataByStatusOptions): TaskGroupsData {
  const activeProjects = useMemo(
    () =>
      projects
        .filter((p) => p.status === 'active')
        .sort((a, b) => a.position - b.position),
    [projects],
  );

  const filteredTasks = useMemo(
    () =>
      tasks.filter((t) => {
        if (t.trashedAt) return false;
        if (t.status === 'completed') return false;
        return t.status === status;
      }),
    [tasks, status],
  );

  const tasksWithoutProject = useMemo(
    () =>
      filteredTasks
        .filter((t) => !t.projectId && !t.areaId)
        .sort((a, b) => a.position - b.position),
    [filteredTasks],
  );

  const projectsWithTasks = useMemo(() => {
    return activeProjects
      .map((project) => ({
        project,
        tasks: filteredTasks
          .filter((t) => t.projectId === project.id)
          .sort((a, b) => a.position - b.position),
      }))
      .filter((item) => item.tasks.length > 0);
  }, [activeProjects, filteredTasks]);

  const projectsWithoutArea = useMemo(
    () => projectsWithTasks.filter((item) => !item.project.areaId),
    [projectsWithTasks],
  );

  const areasWithContent = useMemo(() => {
    return areas
      .map((area) => ({
        area,
        tasksWithoutProject: filteredTasks
          .filter((t) => t.areaId === area.id && !t.projectId)
          .sort((a, b) => a.position - b.position),
        projects: projectsWithTasks.filter(
          (item) => item.project.areaId === area.id,
        ),
      }))
      .filter((a) => a.tasksWithoutProject.length > 0 || a.projects.length > 0);
  }, [areas, filteredTasks, projectsWithTasks]);

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

    return { sections };
  }, [tasksWithoutProject, projectsWithoutArea, areasWithContent]);

  return boardData;
}
