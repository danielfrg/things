import { createFileRoute } from '@tanstack/react-router';
import { SomedayIcon } from '@/components/icons';
import { ViewContainer } from '@/components/layout/ViewContainer';
import { StandardListView } from '@/components/StandardListView';
import {
  NewTaskButton,
  SearchButton,
  ViewToolbar,
} from '@/components/ToolbarButtons';
import { useAreas, useProjects, useTasks } from '@/lib/contexts/DataContext';
import { useBoardDataByStatus } from '@/lib/hooks/useBoardDataByStatus';

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
  const { data: tasks, loading: tasksLoading } = useTasks();
  const { data: projects, loading: projectsLoading } = useProjects();
  const { data: areas, loading: areasLoading } = useAreas();

  const boardData = useBoardDataByStatus({
    status: 'someday',
    tasks,
    projects,
    areas,
  });

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
