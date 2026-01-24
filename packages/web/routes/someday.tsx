import { createFileRoute } from '@tanstack/react-router';
import { useMemo } from 'react';
import type { TaskGroupsData, TSection } from '@/components/board';
import { SomedayIcon } from '@/components/icons';
import { ViewContainer } from '@/components/layout/ViewContainer';
import { StandardListView } from '@/components/StandardListView';
import {
  NewTaskButton,
  SearchButton,
  ViewToolbar,
} from '@/components/ToolbarButtons';
import { useAreas, useProjects, useTasks } from '@/lib/contexts/DataContext';

export const Route = createFileRoute('/someday')({
  component: SomedayView,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      task: (search.task as string) || undefined,
    };
  },
});

function SomedayView() {
  const search = Route.useSearch();
  const { data: allTasks, loading: tasksLoading } = useTasks();
  const { data: allProjects, loading: projectsLoading } = useProjects();
  const { data: areas, loading: areasLoading } = useAreas();

  const activeProjects = useMemo(
    () => allProjects.filter((p) => p.status === 'active'),
    [allProjects],
  );

  const somedayTasks = useMemo(
    () =>
      allTasks.filter((t) => {
        if (t.trashedAt) return false;
        if (t.status === 'completed') return false;
        return t.status === 'someday';
      }),
    [allTasks],
  );

  const tasksWithoutProject = useMemo(
    () =>
      somedayTasks
        .filter((t) => !t.projectId && !t.areaId)
        .sort((a, b) => a.position - b.position),
    [somedayTasks],
  );

  const projectsWithSomedayTasks = useMemo(() => {
    return activeProjects
      .map((project) => ({
        project,
        tasks: somedayTasks
          .filter((t) => t.projectId === project.id)
          .sort((a, b) => a.position - b.position),
      }))
      .filter((item) => item.tasks.length > 0);
  }, [activeProjects, somedayTasks]);

  const projectsWithoutArea = useMemo(
    () => projectsWithSomedayTasks.filter((item) => !item.project.areaId),
    [projectsWithSomedayTasks],
  );

  const areasWithContent = useMemo(() => {
    return areas
      .map((area) => ({
        area,
        tasksWithoutProject: somedayTasks
          .filter((t) => t.areaId === area.id && !t.projectId)
          .sort((a, b) => a.position - b.position),
        projects: projectsWithSomedayTasks.filter(
          (item) => item.project.areaId === area.id,
        ),
      }))
      .filter((a) => a.tasksWithoutProject.length > 0 || a.projects.length > 0);
  }, [areas, somedayTasks, projectsWithSomedayTasks]);

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

  const loading = tasksLoading || projectsLoading || areasLoading;

  return (
    <ViewContainer
      title="Someday"
      icon={<SomedayIcon className="w-6 h-6" />}
      iconColor="text-things-beige"
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
        emptyMessage="No someday tasks. Tasks you might want to do later will appear here."
        uncompleteStatus="someday"
        initialSelectedTaskId={search.task}
      />
    </ViewContainer>
  );
}
