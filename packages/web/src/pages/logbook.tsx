import { createSignal, Show } from "solid-js"
import { BookCheckIcon } from "@/components/icons"
import { ViewContainer } from "@/components/layout/view-container"
import { VirtualTaskCardList } from "@/components/tasks/virtual-task-card-list"
import { LogCompletedButton, SearchButton, ViewToolbar } from "@/components/toolbar"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useApp } from "@/context/app"
import { useLogbookView } from "@/context/view-adapters"
import { toast } from "@/lib/toast"

export function Logbook() {
  const app = useApp()
  const data = useLogbookView()
  const [isLogging, setIsLogging] = createSignal(false)
  const [expandedTaskId, setExpandedTaskId] = createSignal<string | null>(null)
  const [showProjectCompletedAlert, setShowProjectCompletedAlert] = createSignal(false)

  const handleComplete = async (id: string, completed: boolean) => {
    // In logbook, clicking checkbox restores the task
    if (!completed) {
      await restoreTask(id)
    }
  }

  const handleUncancel = async (id: string) => {
    // Uncancelling in logbook also restores the task
    await restoreTask(id)
  }

  const restoreTask = async (id: string) => {
    const result = await data.restoreFromLogbook(id)
    if (!result.success) {
      if (result.error?.includes("project") && result.error?.includes("completed")) {
        setShowProjectCompletedAlert(true)
      } else {
        toast.error(result.error || "Failed to restore task")
      }
    } else {
      toast.success("Task restored")
    }
  }

  const handleUpdate = (id: string, updates: Record<string, unknown>) => {
    data.updateTask(id, updates)
  }

  const handleExpand = (id: string) => {
    setExpandedTaskId((current) => (current === id ? null : id))
  }

  const handleLogCompleted = async () => {
    setIsLogging(true)
    const result = await data.logCompletedToday()
    setIsLogging(false)

    if (result.success) {
      if (result.count > 0) {
        toast.success(`Logged ${result.count} completed task${result.count === 1 ? "" : "s"}`)
      } else {
        toast.info("No tasks completed today to log")
      }
    } else {
      toast.error("Failed to log completed tasks")
    }
  }

  return (
    <ViewContainer
      title="Logbook"
      icon={<BookCheckIcon class="w-6 h-6 text-things-green" />}
      toolbar={
        <ViewToolbar>
          <LogCompletedButton onClick={handleLogCompleted} disabled={isLogging()} />
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
          when={data.tasks.length > 0}
          fallback={
            <div class="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <BookCheckIcon class="w-12 h-12 mb-4 opacity-30" />
              <p class="text-sm">No completed tasks.</p>
            </div>
          }
        >
          <div class="px-2 md:px-2">
            <VirtualTaskCardList
              tasks={data.tasks}
              expandedTaskId={expandedTaskId}
              onExpand={handleExpand}
              onComplete={handleComplete}
              onUncancel={handleUncancel}
              onUpdate={handleUpdate}
              showCompletedDate
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

      {/* Alert for completed project -- logbook */}
      <AlertDialog open={showProjectCompletedAlert()} onOpenChange={setShowProjectCompletedAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cannot Restore Task</AlertDialogTitle>
            <AlertDialogDescription>
              This task belongs to a project that has been completed. You cannot restore it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button onClick={() => setShowProjectCompletedAlert(false)}>OK</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ViewContainer>
  )
}
