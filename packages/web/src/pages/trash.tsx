import { createSignal, Show } from "solid-js"
import { TrashIcon } from "@/components/icons"
import { ViewContainer } from "@/components/layout/view-container"
import { VirtualTaskCardList } from "@/components/tasks/virtual-task-card-list"
import { SearchButton, ViewToolbar } from "@/components/toolbar"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useApp } from "@/context/app"
import { TrashDataProvider, useTrashData } from "@/context/trash"
import { toast } from "@/lib/toast"

function TrashContent() {
  const app = useApp()
  const data = useTrashData()
  const [showEmptyDialog, setShowEmptyDialog] = createSignal(false)
  const [expandedTaskId, setExpandedTaskId] = createSignal<string | null>(null)
  const [showProjectAlert, setShowProjectAlert] = createSignal(false)
  const [projectAlertMessage, setProjectAlertMessage] = createSignal("")

  const handleRestore = async (id: string) => {
    const result = await data.restoreTask(id)
    if (!result.success) {
      if (result.error?.includes("project")) {
        setProjectAlertMessage(result.error)
        setShowProjectAlert(true)
      } else {
        toast.error(result.error || "Failed to restore task")
      }
    } else {
      toast.success("Task restored")
    }
  }

  const handleDelete = async (id: string) => {
    const success = await data.deleteTask(id)
    if (success) {
      toast.success("Task permanently deleted")
    } else {
      toast.error("Failed to delete task")
    }
  }

  const handleEmptyTrash = async () => {
    await data.emptyTrash()
    setShowEmptyDialog(false)
    toast.success("Trash emptied")
  }

  const handleComplete = (_id: string, _completed: boolean) => {
    // In trash view, clicking checkbox does nothing (visual only)
    // Could potentially restore if unchecking
  }

  const handleUpdate = (id: string, updates: Record<string, unknown>) => {
    data.updateTask(id, updates)
  }

  const handleExpand = (id: string) => {
    setExpandedTaskId((current) => (current === id ? null : id))
  }

  const count = () => data.tasks.length

  return (
    <>
      <ViewContainer
        title="Trash"
        icon={<TrashIcon class="w-6 h-6 text-muted-foreground" />}
        toolbar={
          <ViewToolbar>
            <Show when={count() > 0}>
              <Button
                variant="ghost"
                size="sm"
                class="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setShowEmptyDialog(true)}
              >
                Empty Trash
              </Button>
            </Show>
            <SearchButton onClick={app.openCommandPalette} />
          </ViewToolbar>
        }
      >
        <Show when={data.loading}>
          <div class="flex items-center justify-center py-12">
            <span class="text-muted-foreground">Loading...</span>
          </div>
        </Show>

        <Show when={data.error}>
          <div class="flex items-center justify-center py-12">
            <span class="text-destructive">{data.error}</span>
          </div>
        </Show>

        <Show when={!data.loading && !data.error}>
          <Show
            when={count() > 0}
            fallback={
              <div class="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <TrashIcon class="w-12 h-12 mb-4 opacity-30" />
                <p class="text-sm">Trash is empty.</p>
              </div>
            }
          >
            <div class="px-2 md:px-2">
              <VirtualTaskCardList
                tasks={data.tasks}
                expandedTaskId={expandedTaskId}
                onExpand={handleExpand}
                onComplete={handleComplete}
                onUpdate={handleUpdate}
                isTrashView
                onRestore={handleRestore}
                onDelete={handleDelete}
                taskTags={data.taskTags}
                onTagAdd={data.addTagToTask}
                onTagRemove={data.removeTagFromTask}
                onFetchTags={data.fetchTaskTags}
                checklistItems={data.checklistItems}
                onFetchChecklistItems={data.fetchChecklistItems}
                onCreateChecklistItem={data.createChecklistItem}
                onUpdateChecklistItem={data.updateChecklistItem}
                onDeleteChecklistItem={data.deleteChecklistItem}
                onReorderChecklistItems={data.reorderChecklistItems}
              />
            </div>
          </Show>
        </Show>
      </ViewContainer>

      {/* Empty Trash Confirmation Dialog */}
      <AlertDialog open={showEmptyDialog()} onOpenChange={setShowEmptyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Empty Trash</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete {count()} {count() === 1 ? "task" : "tasks"}? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={handleEmptyTrash}>
              Delete All
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert for project completed/trashed */}
      <AlertDialog open={showProjectAlert()} onOpenChange={setShowProjectAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cannot Restore Task</AlertDialogTitle>
            <AlertDialogDescription>{projectAlertMessage()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button onClick={() => setShowProjectAlert(false)}>OK</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function Trash() {
  return (
    <TrashDataProvider>
      <TrashContent />
    </TrashDataProvider>
  )
}
