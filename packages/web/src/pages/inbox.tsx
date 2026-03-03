import { useSearchParams } from "@solidjs/router"
import { Show } from "solid-js"
import { InboxIcon } from "@/components/icons"
import { ViewContainer } from "@/components/layout/view-container"
import { TaskList } from "@/components/tasks"
import { MoveTaskButton, NewTaskButton, SearchButton, SetDateButton, ViewToolbar } from "@/components/toolbar"
import { useApp } from "@/context/app"
import { useInboxView } from "@/context/view-adapters"

export function Inbox() {
  const app = useApp()
  const data = useInboxView()
  const [searchParams] = useSearchParams()

  const initialTaskId = () => {
    const taskParam = searchParams.task
    return typeof taskParam === "string" ? taskParam : null
  }

  return (
    <ViewContainer
      title="Inbox"
      icon={<InboxIcon class="w-6 h-6" />}
      toolbar={
        <ViewToolbar>
          <NewTaskButton onClick={app.openTaskInput} />
          <SetDateButton />
          <MoveTaskButton />
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
