import type { ParentProps } from "solid-js"
import { Toaster } from "solid-sonner"
import { CommandPalette } from "./components/command-palette"
import { GlobalTaskInput } from "./components/global-task-input"
import { AppLayout } from "./components/layout/app-layout"
import { AppProvider, useApp } from "./context/app"
import { SidebarDataProvider } from "./context/sidebar"
import { useHotkey } from "./lib/hooks/useHotkey"

function AppContent(props: ParentProps) {
  const app = useApp()

  // Global hotkeys
  useHotkey("n", () => app.openTaskInput(), { ctrl: true })
  useHotkey("k", () => app.openCommandPalette(), { meta: true })

  return (
    <>
      <AppLayout>{props.children}</AppLayout>
      <GlobalTaskInput open={app.taskInputOpen} onClose={app.closeTaskInput} />
      <CommandPalette open={app.commandPaletteOpen} onClose={app.closeCommandPalette} />
      <Toaster position="top-center" />
    </>
  )
}

function App(props: ParentProps) {
  return (
    <SidebarDataProvider>
      <AppProvider>
        <AppContent>{props.children}</AppContent>
      </AppProvider>
    </SidebarDataProvider>
  )
}

export default App
