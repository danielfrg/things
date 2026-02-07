import type { ParentProps } from "solid-js"
import { Sidebar } from "./sidebar"

export function AppLayout(props: ParentProps) {
  return (
    <div class="h-screen flex">
      <Sidebar />
      <main class="flex-1 overflow-hidden bg-background">{props.children}</main>
    </div>
  )
}
