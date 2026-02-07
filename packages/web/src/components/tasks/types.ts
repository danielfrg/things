import type { ChecklistItemInfo, TaskInfo, TaskTagInfo, TemplateInfo } from "@/context/data"
import type { ChecklistItem } from "./checklist-editor"

// Section type - can be used for Today, Upcoming, Project views, etc.
export type Section = {
  id: string
  title: string
  tasks: TaskInfo[]
  templates?: TemplateInfo[] // For Upcoming view - repeating rule templates
  projectId?: string
  areaId?: string
  isEvening?: boolean
  dateStr?: string // For Upcoming view - date sections
  headingId?: string // For Project view - heading sections
  isBacklog?: boolean // For Project view - backlog/someday heading
  isCompleted?: boolean // For completed today section
  isLater?: boolean // For Upcoming view - "Later" section
  isRepeated?: boolean // For Project/Area view - repeated templates section
}

// Information about a task being moved between sections
export type TaskMoveInfo = {
  taskId: string
  fromSectionId: string
  toSectionId: string
  toSection: Section
  newIndex: number
  newTaskIds: string[] // Task IDs in destination section after the move
}

// Props for tag and repeat functionality on tasks
export type TaskEnhancementProps = {
  taskTags?: Record<string, TaskTagInfo[]>
  onTagAdd?: (taskId: string, tagId: string) => void
  onTagRemove?: (taskId: string, tagId: string) => void
  onFetchTags?: (taskId: string) => void
  onConvertToRepeat?: (taskId: string, rrule: string, startDate: string) => void
  checklistItems?: Record<string, ChecklistItemInfo[]>
  onFetchChecklistItems?: (taskId: string) => void
  onCreateChecklistItem?: (taskId: string, item: Omit<ChecklistItem, "id">) => Promise<ChecklistItemInfo | null>
  onUpdateChecklistItem?: (taskId: string, itemId: string, changes: Partial<ChecklistItem>) => void
  onDeleteChecklistItem?: (taskId: string, itemId: string) => void
  onReorderChecklistItems?: (taskId: string, items: { id: string; position: number }[]) => void
}

// Props for template operations
export type TemplateEnhancementProps = {
  onTemplateUpdate?: (id: string, updates: Partial<TemplateInfo>) => void
  onTemplateDelete?: (id: string) => void
}

// Props for grouped task list
export type GroupedTaskListProps = TaskEnhancementProps &
  TemplateEnhancementProps & {
    sections: Section[]
    onComplete: (id: string, completed: boolean) => void
    onCancel?: (id: string) => void
    onUncancel?: (id: string) => void
    onUpdate: (id: string, updates: Partial<TaskInfo>) => void
    onMove: (info: TaskMoveInfo) => void
    onReorder: (sectionId: string, taskIds: string[]) => void
    isSomeday?: boolean
    /** Hide scheduled date in task metadata (for Today/Upcoming views) */
    hideScheduledDate?: boolean
    /** Show star icon for tasks scheduled today instead of "Today" badge */
    showTodayStar?: boolean
    /** For project view - whether headings are editable */
    isProjectView?: boolean
    /** Callback for editing heading titles (project view only) */
    onHeadingEdit?: (headingId: string, title: string) => void
    /** Callback for deleting headings (project view only) */
    onHeadingDelete?: (headingId: string) => void
    /** Callback for moving headings up (project view only) */
    onHeadingMoveUp?: (headingId: string) => void
    /** Callback for moving headings down (project view only) */
    onHeadingMoveDown?: (headingId: string) => void
    /** Batch operations handlers for multi-select */
    onBatchDateChange?: (ids: string[], date: string | null, isEvening?: boolean) => void
    onBatchMove?: (ids: string[], parentId: string | null, moveToInbox?: boolean) => void
    onBatchTrash?: (ids: string[]) => void
    /** Projects and areas for move picker */
    projects?: Array<{ id: string; title: string; areaId?: string | null }>
    areas?: Array<{ id: string; title: string }>
    /** Initial task ID to expand/select when component mounts */
    initialExpandedTaskId?: string | null
    /** Initial template ID to expand when component mounts */
    initialExpandedTemplateId?: string | null
  }
