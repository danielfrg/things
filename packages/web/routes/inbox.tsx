import { createFileRoute } from '@tanstack/react-router';
import { useMemo } from 'react';
import { InboxIcon } from '@/components/icons';
import { ViewContainer } from '@/components/layout/ViewContainer';
import { StandardListView } from '@/components/StandardListView';
import {
  NewTaskButton,
  SearchButton,
  ViewToolbar,
} from '@/components/ToolbarButtons';
import { useTasks } from '@/lib/contexts/DataContext';

export const Route = createFileRoute('/inbox')({
  component: InboxView,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      task: (search.task as string) || undefined,
    };
  },
});

function InboxView() {
  const search = Route.useSearch();
  const { data: tasks, loading } = useTasks();

  const boardData = useMemo(() => {
    const inboxTasks = tasks
      .filter((task) => {
        if (task.trashedAt) return false;
        if (task.scheduledDate) return false;
        if (task.projectId) return false;
        if (task.areaId) return false;
        return task.status === 'inbox';
      })
      .sort((a, b) => a.position - b.position);

    return {
      sections: [{ id: 'inbox', title: '', tasks: inboxTasks }],
    };
  }, [tasks]);

  return (
    <ViewContainer
      title="Inbox"
      icon={<InboxIcon className="w-6 h-6 text-things-blue" />}
      iconColor="text-things-blue"
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
        emptyMessage="Inbox is empty. Add a task to get started."
        uncompleteStatus="inbox"
        initialSelectedTaskId={search.task}
      />
    </ViewContainer>
  );
}
