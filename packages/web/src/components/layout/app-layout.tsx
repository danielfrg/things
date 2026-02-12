import type { ParentProps } from "solid-js"
import { Sidebar, SidebarProvider } from "./sidebar"

export function AppLayout(props: ParentProps) {
  return (
    <SidebarProvider>
      <div class="h-screen flex">
        <Sidebar />
        <main class="flex-1 overflow-hidden bg-background">{props.children}</main>
      </div>
    </SidebarProvider>
  )
}
