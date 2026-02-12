// Shared type definitions used across the application.
// These types represent the shapes returned by the API.

export type SimpleTagInfo = {
  id: string
  title: string
}

export type TaskInfo = {
  id: string
  title: string
  notes: string | null
  status: string | null
  type: string
  isSomeday: boolean
  scheduledDate: string | null
  deadline: string | null
  isEvening: boolean
  position: number
  listId: string | null
  headingId: string | null
  isTemplate: boolean
  templateId: string | null
  completedAt: string | null
  trashedAt: string | null
  isLogged: boolean
  createdAt: string
  tags?: SimpleTagInfo[]
}

export type TaskTagInfo = {
  id: string
  title: string
  position: number
  createdAt: string
}

export type ChecklistItemInfo = {
  id: string
  title: string
  completed: boolean
  position: number
  taskId: string
  createdAt: string
}

export type TemplateInfo = {
  id: string
  title: string
  notes: string | null
  rrule: string
  nextOccurrence: string
  status: string
  listId: string | null
  headingId: string | null
  createdAt: string
}
