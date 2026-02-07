import { useSDK } from "@/context/sdk"

interface UseBatchOperationsReturn {
  batchSetDate: (ids: string[], date: string | null, isEvening?: boolean) => Promise<void>
  batchMove: (ids: string[], listId: string | null, moveToInbox?: boolean) => Promise<void>
  batchTrash: (ids: string[]) => Promise<void>
}

export function useBatchOperations(): UseBatchOperationsReturn {
  const sdk = useSDK()

  const batchSetDate = async (ids: string[], date: string | null, isEvening?: boolean) => {
    await Promise.all(
      ids.map((id) =>
        sdk.client.putApiV1TasksById({
          id,
          updateTask: {
            scheduledDate: date,
            isEvening: isEvening ?? false,
          },
        }),
      ),
    )
  }

  const batchMove = async (ids: string[], listId: string | null, moveToInbox?: boolean) => {
    await Promise.all(
      ids.map((id) =>
        sdk.client.putApiV1TasksById({
          id,
          updateTask: {
            listId,
            headingId: null,
            // If moving to inbox, also clear the status
            status: moveToInbox ? null : "active",
          },
        }),
      ),
    )
  }

  const batchTrash = async (ids: string[]) => {
    const now = new Date().toISOString()
    await Promise.all(
      ids.map((id) =>
        sdk.client.putApiV1TasksById({
          id,
          updateTask: {
            trashedAt: now,
          },
        }),
      ),
    )
  }

  return {
    batchSetDate,
    batchMove,
    batchTrash,
  }
}
