import { Show } from "solid-js"
import { Cloud as CloudIcon, CloudOff as CloudOffIcon } from "lucide-solid"
import { useEvent } from "@/context/event"

export function SyncStatus() {
  const event = useEvent()

  return (
    <div class="flex items-center" title={event.connected ? "Connected" : "Disconnected"}>
      <Show when={event.connected} fallback={<CloudOffIcon class="w-4 h-4 text-muted-foreground" />}>
        <CloudIcon class="w-4 h-4 text-muted-foreground" />
      </Show>
    </div>
  )
}
