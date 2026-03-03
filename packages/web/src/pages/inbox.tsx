import { useSearchParams } from "@solidjs/router"
import { createEffect, createMemo, createSignal, Show } from "solid-js"
import { InboxIcon } from "@/components/icons"
import { ViewContainer } from "@/components/layout/view-container"
import { TaskToolbarPickers } from "@/components/task-toolbar-pickers"
import { TaskList, type TaskPickerControls } from "@/components/tasks"
import { NewTaskButton, SearchButton, ViewToolbar } from "@/components/toolbar"
import { useApp } from "@/context/app"
import { useSidebarData } from "@/context/sidebar"
import { useInboxView } from "@/context/view-adapters"

export function Inbox() {
  const app = useApp()
  const data = useInboxView()
  const sidebar = useSidebarData()
  const [searchParams] = useSearchParams()
  const [pickers, setPickers] = createSignal<TaskPickerControls | null>(null)
  const [scheduleOpen, setScheduleOpen] = createSignal(false)
  const [moveOpen, setMoveOpen] = createSignal(false)

  const initialTaskId = () => {
    const taskParam = searchParams.task
    return typeof taskParam === "string" ? taskParam : null
  }

  const canSchedule = () => pickers()?.canOpenSchedule() ?? false
  const canMove = () => pickers()?.canOpenMove() ?? false
  const selectedIds = () => pickers()?.selectedIds() ?? []

  const handleBatchDateChange = (ids: string[], date: string | null, isEvening?: boolean) => {
    void Promise.all(ids.map((id) => data.updateTask(id, { scheduledDate: date, isEvening: isEvening ?? false })))
  }

  const handleBatchMove = (ids: string[], listId: string | null, moveToInbox?: boolean) => {
    if (moveToInbox) {
      void Promise.all(
        ids.map((id) =>
          data.updateTask(id, {
            status: null,
            listId: null,
            headingId: null,
            scheduledDate: null,
            isEvening: false,
            isSomeday: false,
          }),
        ),
      )
      return
    }

    void Promise.all(ids.map((id) => data.updateTask(id, { status: "active", listId, headingId: null })))
  }

  const selectedTask = createMemo(() => {
    const id = pickers()?.selectedTaskId()
    if (!id) return undefined
    return data.tasks.find((task) => task.id === id)
  })

  createEffect(() => {
    if (!canSchedule()) {
      setScheduleOpen(false)
    }
    if (!canMove()) {
      setMoveOpen(false)
    }
  })

  return (
    <ViewContainer
      title="Inbox"
      icon={<InboxIcon class="w-6 h-6" />}
      toolbar={
        <ViewToolbar>
          <NewTaskButton onClick={app.openTaskInput} />
          <TaskToolbarPickers
            task={selectedTask()}
            selectedIds={selectedIds()}
            canSchedule={canSchedule()}
            canMove={canMove()}
            scheduleOpen={scheduleOpen()}
            moveOpen={moveOpen()}
            onScheduleOpenChange={setScheduleOpen}
            onMoveOpenChange={setMoveOpen}
            onUpdate={data.updateTask}
            onBatchDateChange={handleBatchDateChange}
            onBatchMove={handleBatchMove}
            projects={sidebar.activeProjects}
            areas={sidebar.sortedAreas}
          />
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
        <TaskList
          tasks={data.tasks}
          onComplete={(id, completed) => data.completeTask(id, completed)}
          onUpdate={(id, updates) => data.updateTask(id, updates)}
          onReorder={(taskId, newIndex) => data.reorderTask(taskId, newIndex)}
          autoCommitSticky
          onRegisterPickers={setPickers}
          projects={sidebar.activeProjects}
          areas={sidebar.sortedAreas}
          taskTags={data.taskTags}
          onTagAdd={(taskId, tagId) => data.addTagToTask(taskId, tagId)}
          onTagRemove={(taskId, tagId) => data.removeTagFromTask(taskId, tagId)}
          onFetchTags={(taskId) => data.fetchTaskTags(taskId)}
          onConvertToRepeat={(taskId, rrule, startDate) => data.convertToRepeat(taskId, rrule, startDate)}
          checklistItems={data.checklistItems}
          onFetchChecklistItems={(taskId) => data.fetchChecklistItems(taskId)}
          onCreateChecklistItem={(taskId, item) => data.createChecklistItem(taskId, item)}
          onUpdateChecklistItem={(taskId, itemId, changes) => data.updateChecklistItem(taskId, itemId, changes)}
          onDeleteChecklistItem={(taskId, itemId) => data.deleteChecklistItem(taskId, itemId)}
          onReorderChecklistItems={(taskId, items) => data.reorderChecklistItems(taskId, items)}
          initialExpandedTaskId={initialTaskId()}
        />

        <Show when={data.tasks.length === 0}>
          <div class="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <InboxIcon class="w-12 h-12 mb-4 opacity-30" />
            <p class="text-sm">Your inbox is empty</p>
          </div>
        </Show>
      </Show>
    </ViewContainer>
  )
}
