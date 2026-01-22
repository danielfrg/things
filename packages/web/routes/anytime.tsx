import { createFileRoute } from '@tanstack/react-router';
import { useMemo } from 'react';
import type { TaskGroupsData, TSection } from '@/components/board';
import { LayersIcon } from '@/components/icons';
import { ViewContainer } from '@/components/layout/ViewContainer';
import { StandardListView } from '@/components/StandardListView';
import {
  NewTaskButton,
  SearchButton,
  ViewToolbar,
} from '@/components/ToolbarButtons';
import { useAreas, useProjects, useTasks } from '@/lib/contexts/DataContext';

export const Route = createFileRoute('/anytime')({
  component: AnytimeView,
});

function AnytimeView() {
  const { data: allTasks, loading: tasksLoading } = useTasks();
  const { data: allProjects, loading: projectsLoading } = useProjects();
  const { data: areas, loading: areasLoading } = useAreas();

  const activeProjects = useMemo(
    () => allProjects.filter((p) => p.status === 'active'),
    [allProjects],
  );

  const anytimeTasks = useMemo(
    () =>
      allTasks.filter((t) => {
        if (t.trashedAt) return false;
        if (t.status === 'completed') return false;
        return t.status === 'anytime';
      }),
    [allTasks],
  );

  const tasksWithoutProject = useMemo(
    () =>
      anytimeTasks
        .filter((t) => !t.projectId && !t.areaId)
        .sort((a, b) => a.position - b.position),
    [anytimeTasks],
  );

  const projectsWithAnytimeTasks = useMemo(() => {
    return activeProjects
      .map((project) => ({
        project,
        tasks: anytimeTasks
          .filter((t) => t.projectId === project.id)
          .sort((a, b) => a.position - b.position),
      }))
      .filter((item) => item.tasks.length > 0);
  }, [activeProjects, anytimeTasks]);

  const projectsWithoutArea = useMemo(
    () => projectsWithAnytimeTasks.filter((item) => !item.project.areaId),
    [projectsWithAnytimeTasks],
  );

  const areasWithContent = useMemo(() => {
    return areas
      .map((area) => ({
        area,
        tasksWithoutProject: anytimeTasks
          .filter((t) => t.areaId === area.id && !t.projectId)
          .sort((a, b) => a.position - b.position),
        projects: projectsWithAnytimeTasks.filter(
          (item) => item.project.areaId === area.id,
        ),
      }))
      .filter((a) => a.tasksWithoutProject.length > 0 || a.projects.length > 0);
  }, [areas, anytimeTasks, projectsWithAnytimeTasks]);

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
      title="Anytime"
      icon={<LayersIcon className="w-6 h-6 text-things-teal" />}
      iconColor="text-things-teal"
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
        emptyMessage="No tasks to do anytime. Tasks without a scheduled date will appear here."
        uncompleteStatus="anytime"
      />
    </ViewContainer>
  );
}
