import { createFileRoute } from '@tanstack/react-router';
import { useMemo } from 'react';
import { BookCheckIcon } from '@/components/icons';
import { ViewContainer } from '@/components/layout/ViewContainer';
import { StandardListView } from '@/components/StandardListView';
import { SearchButton, ViewToolbar } from '@/components/ToolbarButtons';
import { useTasks } from '@/lib/contexts/DataContext';

export const Route = createFileRoute('/logbook')({
  component: LogbookView,
});

function LogbookView() {
  const { data: tasks, loading } = useTasks();

  const boardData = useMemo(() => {
    const completed = tasks
      .filter((t) => t.status === 'completed' && !t.trashedAt)
      .sort((a, b) => a.position - b.position);

    return {
      sections: [{ id: 'logbook', title: '', tasks: completed }],
    };
  }, [tasks]);

  return (
    <ViewContainer
      title="Logbook"
      icon={<BookCheckIcon className="w-6 h-6 text-things-green" />}
      iconColor="text-things-green"
      toolbar={
        <ViewToolbar>
          <SearchButton />
        </ViewToolbar>
      }
    >
      <StandardListView
        boardData={boardData}
        loading={loading}
        emptyMessage="No completed tasks."
        uncompleteStatus="inbox"
      />
    </ViewContainer>
  );
}
