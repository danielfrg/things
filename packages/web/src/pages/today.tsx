import { useSearchParams } from "@solidjs/router"
import { createEffect, createMemo, createSignal, Show } from "solid-js"
import { TodayStarIcon } from "@/components/icons"
import { ViewContainer } from "@/components/layout/view-container"
import { TaskToolbarPickers } from "@/components/task-toolbar-pickers"
import { GroupedTaskList, type TaskMoveInfo, type TaskPickerControls } from "@/components/tasks"
import { NewTaskButton, SearchButton, ViewToolbar } from "@/components/toolbar"
import { useApp } from "@/context/app"
import { useSidebarData } from "@/context/sidebar"
import { useTodayView } from "@/context/view-adapters"

export function Today() {
  const app = useApp()
  const data = useTodayView()
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
    return data.sections.flatMap((section) => section.tasks).find((task) => task.id === id)
  })

  createEffect(() => {
    if (!canSchedule()) {
      setScheduleOpen(false)
    }
    if (!canMove()) {
      setMoveOpen(false)
    }
  })

  const handleComplete = (id: string, completed: boolean) => {
    data.completeTask(id, completed)
  }

  const handleCancel = (id: string) => {
    data.cancelTask(id)
  }

  const handleUncancel = (id: string) => {
    data.uncancelTask(id)
  }

  const handleUpdate = (id: string, updates: Record<string, unknown>) => {
    data.updateTask(id, updates)
  }

  const handleMove = async (info: TaskMoveInfo) => {
    const { taskId, fromSectionId, toSectionId, toSection, newTaskIds } = info
    const updates: Record<string, unknown> = {
      contextType: "today", // Tell the server we're in Today view
    }

    // Determine what to update based on destination section
    if (toSection.isEvening) {
      updates.isEvening = true
    } else {
      updates.isEvening = false
    }

    if (toSection.projectId) {
      updates.listId = toSection.projectId
    } else if (toSection.id === "section:no-project") {
      updates.listId = null
    } else if (toSection.areaId) {
      updates.listId = toSection.areaId
    } else if (toSection.dateStr) {
      updates.scheduledDate = toSection.dateStr
    }

    await data.moveTask(taskId, fromSectionId, toSectionId, newTaskIds, updates)
  }

  const handleReorder = (sectionId: string, taskIds: string[]) => {
    data.reorderTasks(taskIds, sectionId, { type: "today" })
  }

  const handleConvertToRepeat = async (taskId: string, rrule: string, startDate: string) => {
    await data.convertToRepeat(taskId, rrule, startDate)
    data.refetch()
  }

  return (
    <ViewContainer
      title="Today"
      icon={<TodayStarIcon class="w-6 h-6" />}
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
        <Show
          when={data.sections.length > 0 && data.sections.some((s) => s.tasks.length > 0)}
          fallback={
            <div class="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <TodayStarIcon class="w-12 h-12 mb-4 opacity-30" />
              <p class="text-sm">Nothing scheduled for today</p>
              <p class="text-xs mt-1">Schedule tasks from your inbox to see them here</p>
            </div>
          }
        >
          <GroupedTaskList
            sections={data.sections}
            onComplete={handleComplete}
            onCancel={handleCancel}
            onUncancel={handleUncancel}
            onUpdate={handleUpdate}
            onMove={handleMove}
            onReorder={handleReorder}
            hideScheduledDate
            autoCommitSticky
            onRegisterPickers={setPickers}
            taskTags={data.taskTags}
            onTagAdd={data.addTagToTask}
            onTagRemove={data.removeTagFromTask}
            onFetchTags={data.fetchTaskTags}
            onConvertToRepeat={handleConvertToRepeat}
            checklistItems={data.checklistItems}
            onFetchChecklistItems={data.fetchChecklistItems}
            onCreateChecklistItem={data.createChecklistItem}
            onUpdateChecklistItem={data.updateChecklistItem}
            onDeleteChecklistItem={data.deleteChecklistItem}
            onReorderChecklistItems={data.reorderChecklistItems}
            projects={sidebar.activeProjects}
            areas={sidebar.sortedAreas}
            initialExpandedTaskId={initialTaskId()}
          />
        </Show>
      </Show>
    </ViewContainer>
  )
}
