import { createSignal } from "solid-js"
import { createSimpleContext } from "./context"

export const { use: useApp, provider: AppProvider } = createSimpleContext({
  name: "App",
  gate: false,
  init: () => {
    const [taskInputOpen, setTaskInputOpen] = createSignal(false)
    const [commandPaletteOpen, setCommandPaletteOpen] = createSignal(false)

    return {
      get taskInputOpen() {
        return taskInputOpen()
      },
      openTaskInput: () => setTaskInputOpen(true),
      closeTaskInput: () => setTaskInputOpen(false),
      get commandPaletteOpen() {
        return commandPaletteOpen()
      },
      openCommandPalette: () => setCommandPaletteOpen(true),
      closeCommandPalette: () => setCommandPaletteOpen(false),
    }
  },
})
