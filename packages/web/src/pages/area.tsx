import { A, useNavigate, useParams, useSearchParams } from "@solidjs/router"
import { createSignal, For, Show } from "solid-js"
import { AreaActionsMenu } from "@/components/area-actions-menu"
import { BoxIcon } from "@/components/icons"
import { ViewContainer } from "@/components/layout/view-container"
import { GroupedTaskList, type TaskMoveInfo } from "@/components/tasks"
import { NewTaskButton, SearchButton, ViewToolbar } from "@/components/toolbar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ProjectProgressIcon } from "@/components/ui/project-progress-icon"
import { useApp } from "@/context/app"
import { AreaDataProvider, useAreaData } from "@/context/area"
import { useSidebarData } from "@/context/sidebar"
import { toast } from "@/lib/toast"

function AreaContent() {
  const app = useApp()
  const data = useAreaData()
  const sidebar = useSidebarData()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Dialog state
  const [showDeleteDialog, setShowDeleteDialog] = createSignal(false)
  const [isProcessing, setIsProcessing] = createSignal(false)
  const [contentCount, setContentCount] = createSignal({ projectCount: 0, taskCount: 0 })

  const initialTaskId = () => {
    const taskParam = searchParams.task
    return typeof taskParam === "string" ? taskParam : null
  }

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

  const handleTitleChange = (title: string) => {
    if (title) {
      data.updateArea({ title })
    }
  }

  const handleDeleteClick = async () => {
    // Fetch content count before showing dialog
    const counts = await data.getContentCount()
    setContentCount(counts)
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = async () => {
    setIsProcessing(true)
    const result = await data.deleteArea()
    setIsProcessing(false)
    setShowDeleteDialog(false)

    if (result.success) {
      toast.success("Area deleted")
      navigate("/today")
    } else {
      toast.error(result.error || "Failed to delete area")
    }
  }

  const handleMove = async (info: TaskMoveInfo) => {
    const { taskId, fromSectionId, toSectionId, toSection, newTaskIds } = info
    const updates: Record<string, unknown> = {
      listId: data.area?.id,
    }

    // Handle isSomeday change based on destination section
    if (toSection.id === "section:someday" || toSection.isBacklog) {
      updates.isSomeday = true
    } else if (toSection.id === "section:area-tasks") {
      // Moving to regular area tasks section - clear isSomeday
      const task = data.sections.flatMap((s) => s.tasks).find((t) => t.id === taskId)
      if (task?.isSomeday) {
        updates.isSomeday = false
      }
    }

    await data.moveTask(taskId, fromSectionId, toSectionId, newTaskIds, updates)
  }

  const handleReorder = (sectionId: string, taskIds: string[]) => {
    data.reorderTasks(taskIds, sectionId)
  }

  const handleConvertToRepeat = async (taskId: string, rrule: string, startDate: string) => {
    await data.convertToRepeat(taskId, rrule, startDate)
    data.refetch()
  }

  const handleTemplateUpdate = (id: string, updates: Record<string, unknown>) => {
    data.updateTemplate(id, updates)
  }

  const handleTemplateDelete = (id: string) => {
    data.deleteTemplate(id)
  }

  const hasTasks = () =>
    data.sections.length > 0 && data.sections.some((s) => s.tasks.length > 0 || (s.templates?.length ?? 0) > 0)
  const hasProjects = () => data.projects.length > 0

  return (
    <Show
      when={!data.loading}
      fallback={
        <div class="flex items-center justify-center py-12">
          <span class="text-muted-foreground">Loading...</span>
        </div>
      }
    >
      <Show
        when={data.area}
        fallback={
          <div class="flex items-center justify-center py-12">
            <span class="text-muted-foreground">Area not found</span>
          </div>
        }
      >
        <ViewContainer
          title={data.area!.title}
          icon={<BoxIcon class="w-6 h-6 text-things-green" stroke-width={2} />}
          onTitleChange={handleTitleChange}
          titleActions={<AreaActionsMenu onDelete={handleDeleteClick} />}
          toolbar={
            <ViewToolbar>
              <NewTaskButton onClick={app.openTaskInput} />
              <SearchButton onClick={app.openCommandPalette} />
            </ViewToolbar>
          }
        >
          <Show when={data.error}>
            <div class="flex items-center justify-center py-12">
              <span class="text-destructive">{data.error}</span>
            </div>
          </Show>

          <Show when={!data.error}>
            <div class="space-y-8">
              {/* Task sections using GroupedTaskList */}
              <Show when={hasTasks()}>
                <GroupedTaskList
                  sections={data.sections}
                  onComplete={handleComplete}
                  onCancel={handleCancel}
                  onUncancel={handleUncancel}
                  onUpdate={handleUpdate}
                  onMove={handleMove}
                  onReorder={handleReorder}
                  showTodayStar
                  taskTags={data.taskTags}
                  onTagAdd={data.addTagToTask}
                  onTagRemove={data.removeTagFromTask}
                  onFetchTags={data.fetchTaskTags}
                  onConvertToRepeat={handleConvertToRepeat}
                  onTemplateUpdate={handleTemplateUpdate}
                  onTemplateDelete={handleTemplateDelete}
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

              {/* Projects section */}
              <Show when={hasProjects()}>
                <section>
                  <div class="mb-2 px-4">
                    <div class="text-[15px] font-semibold text-things-blue border-b border-section-border pb-2">
                      Projects
                    </div>
                  </div>
                  <div class="space-y-1 px-4 md:px-2">
                    <For each={data.projects}>
                      {(project) => (
                        <A
                          href={`/project/${project.id}`}
                          class="flex items-center gap-2.5 h-7 px-2 rounded-md hover:bg-secondary transition-colors"
                        >
                          <ProjectProgressIcon
                            progress={project.progress}
                            size={16}
                            variant="sidebar"
                            class="text-things-blue shrink-0"
                          />
                          <span class="text-[15px] font-semibold text-foreground">{project.title}</span>
                          <Show when={project.taskCount > 0}>
                            <span class="text-[11px] text-muted-foreground border border-hint rounded px-1.5 py-0.5">
                              {project.taskCount}
                            </span>
                          </Show>
                        </A>
                      )}
                    </For>
                  </div>
                </section>
              </Show>

              {/* Empty state */}
              <Show when={!hasProjects() && !hasTasks()}>
                <div class="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <BoxIcon class="w-12 h-12 mb-4 opacity-30" />
                  <p class="text-sm">No projects or tasks in this area yet</p>
                </div>
              </Show>
            </div>
          </Show>
        </ViewContainer>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog()} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Area</AlertDialogTitle>
              <AlertDialogDescription>
                <Show
                  when={contentCount().projectCount > 0 || contentCount().taskCount > 0}
                  fallback="Are you sure you want to delete this area? This action can be undone from trash."
                >
                  This will also delete {contentCount().projectCount} project
                  {contentCount().projectCount !== 1 ? "s" : ""} and {contentCount().taskCount} task
                  {contentCount().taskCount !== 1 ? "s" : ""}. This action can be undone from trash.
                </Show>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessing()}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={isProcessing()}
                class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isProcessing() ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Show>
    </Show>
  )
}

export function Area() {
  const params = useParams<{ areaId: string }>()

  return (
    <AreaDataProvider areaId={params.areaId}>
      <AreaContent />
    </AreaDataProvider>
  )
}
