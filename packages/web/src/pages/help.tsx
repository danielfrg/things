import { For } from "solid-js"
import { BookCheckIcon } from "@/components/icons"
import { cn } from "@/lib/utils"

type Shortcut = {
  keys: string[]
  description: string
}

type ShortcutSection = {
  title: string
  shortcuts: Shortcut[]
}

const sections: ShortcutSection[] = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["Arrow Up", "k"], description: "Select previous task" },
      { keys: ["Arrow Down", "j"], description: "Select next task" },
      { keys: ["Enter"], description: "Expand selected task" },
      { keys: ["Escape"], description: "Deselect task / Close expanded task" },
    ],
  },
  {
    title: "Task Actions",
    shortcuts: [
      { keys: ["Ctrl", "N"], description: "Create new task" },
      {
        keys: ["Ctrl", "S"],
        description: "Open date picker for selected task",
      },
      {
        keys: ["Ctrl", "D"],
        description: "Open move picker for selected task",
      },
    ],
  },
  {
    title: "Global",
    shortcuts: [{ keys: ["Cmd", "K"], description: "Open command palette" }],
  },
]

function Key(props: { children: string }) {
  return (
    <kbd
      class={cn(
        "inline-flex items-center justify-center min-w-[24px] h-6 px-1.5",
        "text-xs font-medium text-foreground",
        "bg-muted border border-border rounded",
      )}
    >
      {props.children}
    </kbd>
  )
}

function ShortcutRow(props: { shortcut: Shortcut }) {
  return (
    <div class="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <span class="text-sm text-foreground">{props.shortcut.description}</span>
      <div class="flex items-center gap-1">
        <For each={props.shortcut.keys}>
          {(key, index) => (
            <>
              <Key>{key}</Key>
              {index() < props.shortcut.keys.length - 1 && <span class="text-xs text-muted-foreground mx-0.5">/</span>}
            </>
          )}
        </For>
      </div>
    </div>
  )
}

function ShortcutSection(props: { section: ShortcutSection }) {
  return (
    <section class="mb-8">
      <h2 class="text-base font-medium text-foreground mb-3">{props.section.title}</h2>
      <div class="rounded-lg border border-border bg-card overflow-hidden px-4">
        <For each={props.section.shortcuts}>{(shortcut) => <ShortcutRow shortcut={shortcut} />}</For>
      </div>
    </section>
  )
}

export function Help() {
  return (
    <div class="flex flex-col h-full bg-background overflow-hidden">
      <div class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div class="max-w-[600px] mx-auto px-6 py-8">
          {/* Page Title */}
          <div class="flex items-center gap-3 mb-8">
            <BookCheckIcon class="w-6 h-6 text-muted-foreground" />
            <h1 class="text-2xl font-semibold text-foreground">Help & Shortcuts</h1>
          </div>

          {/* Keyboard Shortcuts */}
          <For each={sections}>{(section) => <ShortcutSection section={section} />}</For>

          {/* Tips */}
          <section class="mb-8">
            <h2 class="text-base font-medium text-foreground mb-3">Tips</h2>
            <div class="rounded-lg border border-border bg-card overflow-hidden px-4 py-3 space-y-2">
              <p class="text-sm text-muted-foreground">
                <strong class="text-foreground">Drag & drop</strong> - Drag tasks to reorder them or move them to
                different sections in the sidebar.
              </p>
              <p class="text-sm text-muted-foreground">
                <strong class="text-foreground">Quick scheduling</strong> - Use <Key>Ctrl</Key> + <Key>S</Key> to
                quickly set a date for the selected task.
              </p>
              <p class="text-sm text-muted-foreground">
                <strong class="text-foreground">Evening tasks</strong> - When scheduling for today, choose "This
                Evening" to separate tasks you want to do later.
              </p>
              <p class="text-sm text-muted-foreground">
                <strong class="text-foreground">Cancel tasks</strong> - Hold <Key>Option</Key> (Mac) or <Key>Alt</Key>{" "}
                (Windows) and click the checkbox to cancel a task instead of completing it. Cancelled tasks show an X
                and remain visible for the day.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
