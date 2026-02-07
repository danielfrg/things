import type { ThingsClient } from "@things/sdk"
import { createMemo } from "solid-js"
import { createSimpleContext } from "./context"
import { useSDK } from "./sdk"

/**
 * Centralized API client that wraps the SDK and provides:
 * - Type-safe API calls
 * - Automatic auth headers
 * - Consistent error handling
 */
export const { use: useAPI, provider: APIProvider } = createSimpleContext({
  name: "API",
  init: () => {
    const sdk = useSDK()

    // Create a memo for the client to ensure reactivity
    const client = createMemo(() => sdk.client)

    // Helper to handle API responses consistently
    const handleResponse = async <T>(promise: Promise<{ data?: T; error?: unknown }>): Promise<T | null> => {
      const result = await promise
      if (result.error) {
        console.error("[API] error:", result.error)
        return null
      }
      return result.data ?? null
    }

    // Tasks API
    const tasks = {
      list: () => handleResponse(client().getApiV1Tasks()),

      get: (id: string) => handleResponse(client().getApiV1TasksById({ id })),

      create: (data: Parameters<ThingsClient["postApiV1Tasks"]>[0]) => handleResponse(client().postApiV1Tasks(data)),

      update: (id: string, data: Omit<Parameters<ThingsClient["putApiV1TasksById"]>[0], "id">) =>
        handleResponse(client().putApiV1TasksById({ id, ...data })),

      delete: (id: string) => handleResponse(client().deleteApiV1TasksById({ id })),

      deletePermanent: (id: string) => handleResponse(client().deleteApiV1TasksByIdPermanent({ id })),

      complete: (id: string, completed: boolean) =>
        handleResponse(
          client().postApiV1TasksByIdComplete({
            id,
            completeTask: { completed },
          }),
        ),

      restore: (id: string) => handleResponse(client().postApiV1TasksByIdRestore({ id })),

      // Tags
      getTags: (id: string) => handleResponse(client().getApiV1TasksByIdTags({ id })),

      addTag: (id: string, tagId: string) => handleResponse(client().postApiV1TasksByIdTagsByTagId({ id, tagId })),

      removeTag: (id: string, tagId: string) => handleResponse(client().deleteApiV1TasksByIdTagsByTagId({ id, tagId })),

      // Checklist
      getChecklist: (taskId: string) => handleResponse(client().getApiV1TasksByTaskIdChecklist({ taskId })),

      createChecklistItem: (taskId: string, data: { title?: string; completed?: boolean; position?: number }) =>
        handleResponse(client().postApiV1TasksByTaskIdChecklist({ taskId, ...data })),

      updateChecklistItem: (
        taskId: string,
        id: string,
        data: { title?: string; completed?: boolean; position?: number },
      ) => handleResponse(client().putApiV1TasksByTaskIdChecklistById({ taskId, id, ...data })),

      deleteChecklistItem: (taskId: string, id: string) =>
        handleResponse(client().deleteApiV1TasksByTaskIdChecklistById({ taskId, id })),
    }

    // Views API
    const views = {
      inbox: () => handleResponse(client().getApiV1ViewsInbox()),
      today: () => handleResponse(client().getApiV1ViewsToday()),
      upcoming: () => handleResponse(client().getApiV1ViewsUpcoming()),
      anytime: () => handleResponse(client().getApiV1ViewsAnytime()),
      someday: () => handleResponse(client().getApiV1ViewsSomeday()),
      logbook: () => handleResponse(client().getApiV1ViewsLogbook()),
    }

    // Projects API
    const projects = {
      list: () => handleResponse(client().getApiV1Projects()),

      get: (id: string) => handleResponse(client().getApiV1ProjectsById({ id })),

      create: (data: Parameters<ThingsClient["postApiV1Projects"]>[0]) =>
        handleResponse(client().postApiV1Projects(data)),

      update: (id: string, data: Omit<Parameters<ThingsClient["putApiV1ProjectsById"]>[0], "id">) =>
        handleResponse(client().putApiV1ProjectsById({ id, ...data })),

      delete: (id: string) => handleResponse(client().deleteApiV1ProjectsById({ id })),
    }

    // Areas API
    const areas = {
      list: () => handleResponse(client().getApiV1Areas()),

      get: (id: string) => handleResponse(client().getApiV1AreasById({ id })),

      create: (data: Parameters<ThingsClient["postApiV1Areas"]>[0]) => handleResponse(client().postApiV1Areas(data)),

      update: (id: string, data: Omit<Parameters<ThingsClient["putApiV1AreasById"]>[0], "id">) =>
        handleResponse(client().putApiV1AreasById({ id, ...data })),

      delete: (id: string) => handleResponse(client().deleteApiV1AreasById({ id })),
    }

    // Tags API
    const tags = {
      list: () => handleResponse(client().getApiV1Tags()),

      get: (id: string) => handleResponse(client().getApiV1TagsById({ id })),

      create: (data: Parameters<ThingsClient["postApiV1Tags"]>[0]) => handleResponse(client().postApiV1Tags(data)),

      update: (id: string, data: Omit<Parameters<ThingsClient["putApiV1TagsById"]>[0], "id">) =>
        handleResponse(client().putApiV1TagsById({ id, ...data })),

      delete: (id: string) => handleResponse(client().deleteApiV1TagsById({ id })),
    }

    // Headings API
    const headings = {
      list: () => handleResponse(client().getApiV1Headings()),

      get: (id: string) => handleResponse(client().getApiV1HeadingsById({ id })),

      create: (data: Parameters<ThingsClient["postApiV1Headings"]>[0]) =>
        handleResponse(client().postApiV1Headings(data)),

      update: (id: string, data: Omit<Parameters<ThingsClient["putApiV1HeadingsById"]>[0], "id">) =>
        handleResponse(client().putApiV1HeadingsById({ id, ...data })),

      delete: (id: string) => handleResponse(client().deleteApiV1HeadingsById({ id })),
    }

    // Repeating Rules API
    const repeatingRules = {
      list: () => handleResponse(client().getApiV1RepeatingRules()),

      get: (id: string) => handleResponse(client().getApiV1RepeatingRulesById({ id })),

      create: (data: Parameters<ThingsClient["postApiV1RepeatingRules"]>[0]) =>
        handleResponse(client().postApiV1RepeatingRules(data)),

      update: (id: string, data: Omit<Parameters<ThingsClient["putApiV1RepeatingRulesById"]>[0], "id">) =>
        handleResponse(client().putApiV1RepeatingRulesById({ id, ...data })),

      delete: (id: string) => handleResponse(client().deleteApiV1RepeatingRulesById({ id })),

      pause: (id: string) => handleResponse(client().postApiV1RepeatingRulesByIdPause({ id })),

      resume: (id: string) => handleResponse(client().postApiV1RepeatingRulesByIdResume({ id })),
    }

    // Additional endpoints
    const raw = {
      reorderTasks: async (
        ids: string[],
        contextType?: "inbox" | "today" | "upcoming" | "anytime" | "someday" | "logbook" | "project" | "area" | "trash",
        contextId?: string,
      ) => {
        const { error } = await client().postApiV1TasksReorder({
          reorderTasks: { ids, contextType, contextId },
        })
        return !error
      },

      convertToRepeat: async (taskId: string, rrule: string, startDate: string) => {
        return handleResponse(
          client().postApiV1RepeatingRulesFromTask({
            taskId,
            rrule,
            startDate,
          }),
        )
      },

      getProjectView: async (projectId: string) => {
        return handleResponse(client().getApiV1ViewsProjectById({ id: projectId }))
      },

      getAreaView: async (areaId: string) => {
        return handleResponse(client().getApiV1ViewsAreaById({ id: areaId }))
      },

      getTrashView: async () => {
        return handleResponse(client().getApiV1ViewsTrash())
      },
    }

    return {
      tasks,
      views,
      projects,
      areas,
      tags,
      headings,
      repeatingRules,
      raw,
    }
  },
})
