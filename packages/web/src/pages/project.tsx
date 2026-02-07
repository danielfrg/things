import { useNavigate, useParams, useSearchParams } from "@solidjs/router"
import { createEffect, createSignal, Show } from "solid-js"
import { ViewContainer } from "@/components/layout/view-container"
import { ProjectActionsMenu } from "@/components/project-actions-menu"
import { GroupedTaskList, type TaskMoveInfo } from "@/components/tasks"
import { AddHeadingButton, NewTaskButton, SearchButton, ViewToolbar } from "@/components/toolbar"
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
import { ProseEditor } from "@/components/ui/prose-editor"
import { useApp } from "@/context/app"
import { ProjectDataProvider, useProjectData } from "@/context/project"
import { useSidebarData } from "@/context/sidebar"
import { createTagsManager } from "@/context/tags-manager"
import { toast } from "@/lib/toast"

function ProjectContent() {
  const app = useApp()
  const data = useProjectData()
  const sidebar = useSidebarData()
  const tags = createTagsManager()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Dialog state
  const [showCompleteDialog, setShowCompleteDialog] = createSignal(false)
  const [showDeleteDialog, setShowDeleteDialog] = createSignal(false)
  const [activeTaskCount, setActiveTaskCount] = createSignal(0)
  const [isProcessing, setIsProcessing] = createSignal(false)

  const initialTaskId = () => {
    const taskParam = searchParams.task
    return typeof taskParam === "string" ? taskParam : null
  }

  // Local state for notes to avoid re-render on every keystroke
  const [localNotes, setLocalNotes] = createSignal("")

  // Sync local notes when project changes
  let lastProjectId = ""
  createEffect(() => {
    const project = data.project
    if (project && project.id !== lastProjectId) {
      lastProjectId = project.id
      setLocalNotes(project.notes ?? "")
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

  const handleTitleChange = (title: string) => {
    if (title) {
      data.updateProject({ title })
    }
  }

  const handleNotesBlur = () => {
    const trimmed = localNotes().trim()
    if (trimmed !== (data.project?.notes ?? "")) {
      data.updateProject({ notes: trimmed || null })
    }
  }

  const handleMove = async (info: TaskMoveInfo) => {
    const { taskId, fromSectionId, toSectionId, toSection, newTaskIds } = info
    const updates: Record<string, unknown> = {}

    // Handle heading changes within project
    if (toSection.id === "section:unheaded") {
      updates.headingId = null
      // If moving from backlog/someday section, clear isSomeday
      const task = data.sections.flatMap((s) => s.tasks).find((t) => t.id === taskId)
      if (task?.isSomeday) {
        updates.isSomeday = false
      }
    } else if (toSection.id === "section:backlog" || toSection.isBacklog) {
      // Moving to backlog/someday section (virtual or real)
      updates.isSomeday = true
      // Clear headingId if it's the virtual backlog section
      if (toSection.id === "section:backlog") {
        updates.headingId = null
      } else {
        const headingId = toSection.id.replace("section:heading:", "")
        updates.headingId = headingId
      }
    } else if (toSection.id.startsWith("section:heading:")) {
      const headingId = toSection.id.replace("section:heading:", "")
      updates.headingId = headingId
      // Moving from backlog to regular heading - clear isSomeday
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

  // Calculate progress
  const progress = () => {
    const allTasks = data.sections.flatMap((s) => s.tasks)
    if (allTasks.length === 0) return 0
    const completed = allTasks.filter((t) => t.completedAt).length
    return Math.round((completed / allTasks.length) * 100)
  }

  const handleAddHeading = async () => {
    await data.createHeading("New Heading")
  }

  const handleHeadingEdit = (headingId: string, title: string) => {
    data.updateHeading(headingId, title)
  }

  const handleHeadingDelete = async (headingId: string) => {
    const result = await data.deleteHeading(headingId)
    if (!result.success) {
      toast.error(result.error || "Failed to delete heading")
    }
  }

  const handleHeadingMoveUp = async (headingId: string) => {
    await data.moveHeading(headingId, "up")
  }

  const handleHeadingMoveDown = async (headingId: string) => {
    await data.moveHeading(headingId, "down")
  }

  const handleConvertToRepeat = async (taskId: string, rrule: string, startDate: string) => {
    await tags.convertToRepeat(taskId, rrule, startDate)
    data.refetch()
  }

  const handleTemplateUpdate = (id: string, updates: Record<string, unknown>) => {
    data.updateTemplate(id, updates)
  }

  const handleTemplateDelete = (id: string) => {
    data.deleteTemplate(id)
  }

  // Project action handlers
  const handleCompleteClick = async () => {
    const count = await data.getActiveTaskCount()
    setActiveTaskCount(count)
    setShowCompleteDialog(true)
  }

  const handleDeleteClick = async () => {
    const count = await data.getActiveTaskCount()
    setActiveTaskCount(count)
    setShowDeleteDialog(true)
  }

  const handleConfirmComplete = async () => {
    setIsProcessing(true)
    const result = await data.completeProject()
    setIsProcessing(false)
    setShowCompleteDialog(false)

    if (result.success) {
      toast.success(`Project completed with ${result.affectedTasks} task(s)`)
      navigate("/anytime")
    } else {
      toast.error("Failed to complete project")
    }
  }

  const handleConfirmDelete = async () => {
    setIsProcessing(true)
    const result = await data.deleteProject()
    setIsProcessing(false)
    setShowDeleteDialog(false)

    if (result.success) {
      toast.success(`Project and ${result.affectedTasks} task(s) moved to trash`)
      navigate("/anytime")
    } else {
      toast.error("Failed to delete project")
    }
  }

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
        when={data.project}
        fallback={
          <div class="flex items-center justify-center py-12">
            <span class="text-muted-foreground">Project not found</span>
          </div>
        }
      >
        <ViewContainer
          title={data.project!.title}
          icon={<ProjectProgressIcon progress={progress()} size={24} class="text-things-blue" />}
          onTitleChange={handleTitleChange}
          titleActions={<ProjectActionsMenu onComplete={handleCompleteClick} onDelete={handleDeleteClick} />}
          headerExtra={
            <ProseEditor
              value={localNotes()}
              onChange={setLocalNotes}
              onBlur={handleNotesBlur}
              placeholder="Notes"
              class="text-[15px]"
            />
          }
          toolbar={
            <ViewToolbar>
              <NewTaskButton onClick={app.openTaskInput} />
              <AddHeadingButton onClick={handleAddHeading} />
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
            <Show
              when={
                data.sections.length > 0 &&
                data.sections.some((s) => s.tasks.length > 0 || (s.templates?.length ?? 0) > 0)
              }
              fallback={
                <div class="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <p class="text-sm">No tasks in this project</p>
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
                onHeadingEdit={handleHeadingEdit}
                onHeadingDelete={handleHeadingDelete}
                onHeadingMoveUp={handleHeadingMoveUp}
                onHeadingMoveDown={handleHeadingMoveDown}
                isProjectView
                showTodayStar
                taskTags={tags.taskTags}
                onTagAdd={tags.addTagToTask}
                onTagRemove={tags.removeTagFromTask}
                onFetchTags={tags.fetchTaskTags}
                onConvertToRepeat={handleConvertToRepeat}
                onTemplateUpdate={handleTemplateUpdate}
                onTemplateDelete={handleTemplateDelete}
                checklistItems={tags.checklistItems}
                onFetchChecklistItems={tags.fetchChecklistItems}
                onCreateChecklistItem={tags.createChecklistItem}
                onUpdateChecklistItem={tags.updateChecklistItem}
                onDeleteChecklistItem={tags.deleteChecklistItem}
                onReorderChecklistItems={tags.reorderChecklistItems}
                projects={sidebar.activeProjects}
                areas={sidebar.sortedAreas}
                initialExpandedTaskId={initialTaskId()}
              />
            </Show>
          </Show>
        </ViewContainer>

        {/* Complete Project Confirmation Dialog */}
        <AlertDialog open={showCompleteDialog()} onOpenChange={setShowCompleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Complete Project</AlertDialogTitle>
              <AlertDialogDescription>
                <Show when={activeTaskCount() > 0} fallback="Are you sure you want to complete this project?">
                  This project has {activeTaskCount()} active task(s). They will all be marked as completed.
                </Show>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessing()}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmComplete} disabled={isProcessing()}>
                {isProcessing() ? "Completing..." : "Complete Project"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Project Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog()} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Project</AlertDialogTitle>
              <AlertDialogDescription>
                <Show
                  when={activeTaskCount() > 0}
                  fallback="Are you sure you want to delete this project? This action can be undone from trash."
                >
                  This project has {activeTaskCount()} task(s). The project and all its tasks will be moved to trash.
                </Show>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessing()}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} disabled={isProcessing()} variant="destructive">
                {isProcessing() ? "Deleting..." : "Delete Project"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Show>
    </Show>
  )
}

export function Project() {
  const params = useParams<{ projectId: string }>()

  return (
    <ProjectDataProvider projectId={params.projectId}>
      <ProjectContent />
    </ProjectDataProvider>
  )
}
