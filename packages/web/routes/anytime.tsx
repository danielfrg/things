import { createFileRoute } from '@tanstack/react-router';
import { LayersIcon } from '@/components/icons';
import { ViewContainer } from '@/components/layout/ViewContainer';
import { StandardListView } from '@/components/StandardListView';
import {
  NewTaskButton,
  SearchButton,
  ViewToolbar,
} from '@/components/ToolbarButtons';
import { useAreas, useProjects, useTasks } from '@/lib/contexts/DataContext';
import { useBoardDataByStatus } from '@/lib/hooks/useBoardDataByStatus';

export const Route = createFileRoute('/anytime')({
  component: AnytimeView,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      task: (search.task as string) || undefined,
    };
  },
});

function AnytimeView() {
  const search = Route.useSearch();
  const { data: tasks, loading: tasksLoading } = useTasks();
  const { data: projects, loading: projectsLoading } = useProjects();
  const { data: areas, loading: areasLoading } = useAreas();

  const boardData = useBoardDataByStatus({
    status: 'anytime',
    tasks,
    projects,
    areas,
  });

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
        initialSelectedTaskId={search.task}
      />
    </ViewContainer>
  );
}
