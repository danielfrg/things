import { createStore } from "solid-js/store"
import type { ChecklistItemInfo, TaskTagInfo } from "./data"
import { useSDK } from "./sdk"

/**
 * Creates tag and checklist management functions that can be used by any view.
 * This is a factory function, not a context, so it can be used in multiple places
 * without nesting providers.
 */
export function createTagsManager() {
  const sdk = useSDK()
  const [taskTags, setTaskTags] = createStore<Record<string, TaskTagInfo[]>>({})
  const [checklistItems, setChecklistItems] = createStore<Record<string, ChecklistItemInfo[]>>({})

  const fetchTaskTags = async (taskId: string): Promise<TaskTagInfo[]> => {
    try {
      const { data, error } = await sdk.client.getApiV1TasksByIdTags({
        id: taskId,
      })
      if (error) return []
      const tags = data ?? []
      setTaskTags(taskId, tags as TaskTagInfo[])
      return tags as TaskTagInfo[]
    } catch {
      return []
    }
  }

  const addTagToTask = async (taskId: string, tagId: string) => {
    try {
      const { error } = await sdk.client.postApiV1TasksByIdTagsByTagId({
        id: taskId,
        tagId,
      })
      if (error) {
        throw new Error("Failed to add tag")
      }
      await fetchTaskTags(taskId)
      return true
    } catch (e) {
      console.error("[TagsManager] add tag error:", e)
      return false
    }
  }

  const removeTagFromTask = async (taskId: string, tagId: string) => {
    // Optimistic update
    setTaskTags(taskId, (tags) => (tags ?? []).filter((t) => t.id !== tagId))

    try {
      const { error } = await sdk.client.deleteApiV1TasksByIdTagsByTagId({
        id: taskId,
        tagId,
      })
      if (error) {
        await fetchTaskTags(taskId)
        return false
      }
      return true
    } catch (e) {
      console.error("[TagsManager] remove tag error:", e)
      await fetchTaskTags(taskId)
      return false
    }
  }

  const convertToRepeat = async (taskId: string, rrule: string, startDate: string) => {
    try {
      const { data, error } = await sdk.client.postApiV1RepeatingRulesFromTask({
        taskId,
        rrule,
        startDate,
      })
      if (error) {
        throw new Error("Failed to convert task to repeat")
      }
      return data
    } catch (e) {
      console.error("[TagsManager] convert to repeat error:", e)
      return null
    }
  }

  // Checklist functions
  const fetchChecklistItems = async (taskId: string): Promise<ChecklistItemInfo[]> => {
    try {
      const { data, error } = await sdk.client.getApiV1TasksByTaskIdChecklist({
        taskId,
      })
      if (error) return []
      const items = data ?? []
      setChecklistItems(taskId, items as ChecklistItemInfo[])
      return items as ChecklistItemInfo[]
    } catch {
      return []
    }
  }

  const createChecklistItem = async (
    taskId: string,
    item: { title: string; completed: boolean; position: number },
  ): Promise<ChecklistItemInfo | null> => {
    try {
      const { data, error } = await sdk.client.postApiV1TasksByTaskIdChecklist({
        taskId,
        createChecklistItem: {
          title: item.title,
          completed: item.completed,
          position: item.position,
        },
      })
      if (error) {
        return null
      }
      const created = data as ChecklistItemInfo
      setChecklistItems(taskId, (items) => [...(items ?? []), created].sort((a, b) => a.position - b.position))
      return created
    } catch (e) {
      console.error("[TagsManager] create checklist item error:", e)
      return null
    }
  }

  const updateChecklistItem = async (
    taskId: string,
    itemId: string,
    changes: Partial<ChecklistItemInfo>,
  ): Promise<ChecklistItemInfo | null> => {
    // Optimistic update
    setChecklistItems(taskId, (items) => (items ?? []).map((i) => (i.id === itemId ? { ...i, ...changes } : i)))

    try {
      const { data, error } = await sdk.client.putApiV1TasksByTaskIdChecklistById({
        taskId,
        id: itemId,
        updateChecklistItem: {
          title: changes.title,
          completed: changes.completed,
          position: changes.position,
        },
      })
      if (error) {
        await fetchChecklistItems(taskId)
        return null
      }
      return data as ChecklistItemInfo
    } catch (e) {
      console.error("[TagsManager] update checklist item error:", e)
      await fetchChecklistItems(taskId)
      return null
    }
  }

  const deleteChecklistItem = async (taskId: string, itemId: string): Promise<boolean> => {
    // Optimistic update
    setChecklistItems(taskId, (items) => (items ?? []).filter((i) => i.id !== itemId))

    try {
      const { error } = await sdk.client.deleteApiV1TasksByTaskIdChecklistById({
        taskId,
        id: itemId,
      })
      if (error) {
        await fetchChecklistItems(taskId)
        return false
      }
      return true
    } catch (e) {
      console.error("[TagsManager] delete checklist item error:", e)
      await fetchChecklistItems(taskId)
      return false
    }
  }

  const reorderChecklistItems = async (taskId: string, items: { id: string; position: number }[]): Promise<boolean> => {
    // Optimistic update
    setChecklistItems(taskId, (current) =>
      (current ?? []).map((item) => {
        const reordered = items.find((i) => i.id === item.id)
        return reordered ? { ...item, position: reordered.position } : item
      }),
    )

    try {
      await Promise.all(
        items.map((item) =>
          sdk.client.putApiV1TasksByTaskIdChecklistById({
            taskId,
            id: item.id,
            updateChecklistItem: {
              position: item.position,
            },
          }),
        ),
      )
      return true
    } catch (e) {
      console.error("[TagsManager] reorder checklist items error:", e)
      await fetchChecklistItems(taskId)
      return false
    }
  }

  return {
    taskTags,
    fetchTaskTags,
    addTagToTask,
    removeTagFromTask,
    convertToRepeat,
    checklistItems,
    fetchChecklistItems,
    createChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
    reorderChecklistItems,
  }
}

export type TagsManager = ReturnType<typeof createTagsManager>
