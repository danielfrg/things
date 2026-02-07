import type { Section } from "@/components/tasks/types"
import type { TaskInfo } from "@/context/data"

const taskKey = Symbol("task")
const sectionKey = Symbol("section")

export type TaskData = {
  [taskKey]: true
  taskId: TaskInfo["id"]
  rect: DOMRect
}

export type SectionData = {
  [sectionKey]: true
  section: Section
}

export function getTaskData(task: TaskInfo, rect: DOMRect): TaskData {
  return {
    [taskKey]: true,
    taskId: task.id,
    rect,
  }
}

export function isTaskData(data: Record<string | symbol, unknown>): data is TaskData {
  return data[taskKey] === true
}

export function getSectionData(section: Section): SectionData {
  return {
    [sectionKey]: true,
    section,
  }
}

export function isSectionData(data: Record<string | symbol, unknown>): data is SectionData {
  return data[sectionKey] === true
}
