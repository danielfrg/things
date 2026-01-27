import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useMemo, useState } from 'react';
import { Trash2Icon } from '@/components/icons';
import { ViewContainer } from '@/components/layout/ViewContainer';
import { StandardListView } from '@/components/StandardListView';
import { SearchButton, ViewToolbar } from '@/components/ToolbarButtons';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  useDeleteTask,
  useTasks,
  useUpdateTask,
} from '@/lib/contexts/DataContext';

export const Route = createFileRoute('/trash')({
  component: TrashView,
});

function TrashView() {
  const { data: tasks, loading } = useTasks();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [showEmptyDialog, setShowEmptyDialog] = useState(false);

  const trashedTasks = useMemo(
    () =>
      tasks
        .filter((t) => Boolean(t.trashedAt) || t.status === 'trashed')
        .sort((a, b) => a.position - b.position),
    [tasks],
  );

  const boardData = useMemo(
    () => ({
      sections: [{ id: 'trash', title: '', tasks: trashedTasks }],
    }),
    [trashedTasks],
  );

  const handleRestore = useCallback(
    (taskId: string) => {
      updateTask.mutate({
        id: taskId,
        changes: { status: 'inbox', trashedAt: null },
      });
    },
    [updateTask],
  );

  const handlePermanentDelete = useCallback(
    (taskId: string) => {
      deleteTask.mutate(taskId);
    },
    [deleteTask],
  );

  const handleEmptyTrash = () => {
    for (const task of trashedTasks) {
      deleteTask.mutate(task.id);
    }
    setShowEmptyDialog(false);
  };

  const count = trashedTasks.length;

  return (
    <>
      <ViewContainer
        title="Trash"
        icon={<Trash2Icon className="w-6 h-6 text-muted-foreground" />}
        iconColor="text-muted-foreground"
        actions={
          count > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowEmptyDialog(true)}
            >
              Empty Trash
            </Button>
          ) : null
        }
        toolbar={
          <ViewToolbar>
            <SearchButton />
          </ViewToolbar>
        }
      >
        <StandardListView
          boardData={boardData}
          loading={loading}
          emptyMessage="Trash is empty."
          uncompleteStatus="inbox"
          isTrash
          onRestore={handleRestore}
          onPermanentDelete={handlePermanentDelete}
        />
      </ViewContainer>

      {/* Empty Trash Confirmation Dialog */}
      <AlertDialog open={showEmptyDialog} onOpenChange={setShowEmptyDialog}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Empty Trash</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete {count} {count === 1 ? 'task' : 'tasks'}? This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleEmptyTrash}>
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
