import { useLocation } from "@solidjs/router"
import { addDays, format } from "date-fns"
import { FolderOpen } from "lucide-solid"
import { createEffect, createMemo, createSignal, For, Show } from "solid-js"
import { BoxIcon, CheckIcon, InboxIcon } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ProjectProgressIcon } from "@/components/ui/project-progress-icon"
import { ProseEditor } from "@/components/ui/prose-editor"
import { Switch } from "@/components/ui/switch"
import { TextField, TextFieldInput } from "@/components/ui/text-field"
import { useSDK } from "@/context/sdk"
import { useSidebarData } from "@/context/sidebar"
import { cn } from "@/lib/utils"

type GlobalTaskInputProps = {
  open: boolean
  onClose: () => void
}

type ViewContext = {
  status: "active"
  isSomeday?: boolean
  scheduledDate?: string
  listId?: string
}

export function GlobalTaskInput(props: GlobalTaskInputProps) {
  const location = useLocation()
  const sdk = useSDK()
  const sidebar = useSidebarData()

  let titleRef: HTMLInputElement | undefined

  const [title, setTitle] = createSignal("")
  const [notes, setNotes] = createSignal("")
  const [scheduledDate, setScheduledDate] = createSignal<string | undefined>(undefined)
  const [listId, setListId] = createSignal<string | null>(null)
  const [createMore, setCreateMore] = createSignal(false)
  const [projectPickerOpen, setProjectPickerOpen] = createSignal(false)
  const [submitting, setSubmitting] = createSignal(false)

  const projects = createMemo(() => sidebar.activeProjects.filter((p) => p.status === "active"))
  const areas = createMemo(() => sidebar.sortedAreas)

  const getViewContext = (): ViewContext => {
    const pathname = location.pathname

    if (pathname === "/today") {
      return {
        status: "active",
        scheduledDate: format(new Date(), "yyyy-MM-dd"),
      }
    }
    if (pathname === "/upcoming") {
      return {
        status: "active",
        scheduledDate: format(addDays(new Date(), 1), "yyyy-MM-dd"),
      }
    }
    if (pathname === "/anytime") {
      return { status: "active" }
    }
    if (pathname === "/someday") {
      return { status: "active", isSomeday: true }
    }
    if (pathname.startsWith("/project/")) {
      const id = pathname.replace("/project/", "")
      return {
        status: "active",
        listId: id,
      }
    }
    if (pathname.startsWith("/area/")) {
      const id = pathname.replace("/area/", "")
      return {
        status: "active",
        listId: id,
      }
    }
    return { status: "active" }
  }

  // Reset form when dialog opens
  createEffect(() => {
    if (props.open) {
      const context = getViewContext()
      setTitle("")
      setNotes("")
      setScheduledDate(context.scheduledDate)
      setListId(context.listId ?? null)
      setProjectPickerOpen(false)

      setTimeout(() => titleRef?.focus(), 50)
    }
  })

  const handleSubmit = async () => {
    const trimmedTitle = title().trim()
    if (!trimmedTitle || submitting()) return

    setSubmitting(true)

    const context = getViewContext()
    const date = scheduledDate()

    // If any organization is provided, set status to "active", otherwise null (inbox)
    const hasOrganization = date || listId() || context.isSomeday

    try {
      const { error } = await sdk.client.postApiV1Tasks({
        createTask: {
          title: trimmedTitle,
          notes: notes().trim() || undefined,
          status: hasOrganization ? "active" : null,
          isSomeday: context.isSomeday ?? false,
          scheduledDate: date ?? undefined,
          deadline: undefined,
          listId: listId() ?? undefined,
          headingId: null,
        },
      })

      if (error) {
        console.error("Failed to create task:", error)
        return
      }

      if (createMore()) {
        setTitle("")
        setNotes("")
        setTimeout(() => titleRef?.focus(), 10)
      } else {
        props.onClose()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const projectDisplay = createMemo(() => {
    const lid = listId()
    if (lid) {
      const project = projects().find((p) => p.id === lid)
      if (project) return project.title
      const area = areas().find((a) => a.id === lid)
      if (area) return area.title
      return "List"
    }
    return "List"
  })

  const projectsWithoutArea = createMemo(() => projects().filter((p) => !p.areaId))

  const areasWithProjects = createMemo(() =>
    areas().map((area) => ({
      ...area,
      projects: projects().filter((p) => p.areaId === area.id),
    })),
  )

  const handleSelectProject = (id: string) => {
    setListId(id)
    setProjectPickerOpen(false)
  }

  const handleSelectArea = (id: string) => {
    setListId(id)
    setProjectPickerOpen(false)
  }

  const handleSelectInbox = () => {
    setListId(null)
    setProjectPickerOpen(false)
  }

  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent showCloseButton position="top" class="sm:max-w-[900px] p-0 gap-0">
        <DialogHeader class="px-6 pt-6 pb-0">
          <TextField>
            <TextFieldInput
              ref={titleRef}
              variant="ghost"
              type="text"
              placeholder="Task title"
              value={title()}
              onInput={(e) => setTitle(e.currentTarget.value)}
              onKeyDown={handleKeyDown}
              class="text-[28px] font-bold text-foreground placeholder:text-muted-foreground"
            />
          </TextField>
        </DialogHeader>

        <div class="px-6 pb-4">
          <ProseEditor
            value={notes()}
            onChange={setNotes}
            placeholder="Add description..."
            isEditing={true}
            class="min-h-[100px] max-h-[300px] overflow-y-auto"
          />
        </div>

        {/* Properties bar */}
        <div class="px-6 pb-4 flex items-center gap-2">
          <Popover open={projectPickerOpen()} onOpenChange={setProjectPickerOpen}>
            <PopoverTrigger
              as={Button}
              variant="outline"
              size="sm"
              class={cn(
                "flex items-center gap-1.5 rounded-lg text-[13px] font-medium",
                listId()
                  ? "border-border text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <Show
                when={listId() && projects().find((p) => p.id === listId())}
                fallback={
                  <Show
                    when={listId() && areas().find((a) => a.id === listId())}
                    fallback={<FolderOpen class="size-3.5" />}
                  >
                    <BoxIcon class="size-3.5 text-things-green" />
                  </Show>
                }
              >
                <ProjectProgressIcon progress={0} size={14} class="text-things-blue" />
              </Show>
              <span>{projectDisplay()}</span>
            </PopoverTrigger>
            <PopoverContent class="w-[240px] p-0 rounded-xl bg-popover overflow-hidden">
              <div class="max-h-64 overflow-y-auto overscroll-contain py-2">
                <Button
                  variant="ghost"
                  onClick={handleSelectInbox}
                  class={cn(
                    "flex items-center gap-2 w-full h-[28px] px-3 text-[13px] font-bold justify-start",
                    "hover:bg-accent",
                  )}
                >
                  <InboxIcon class="w-3.5 h-3.5 text-muted-foreground" />
                  <span class="flex-1 text-left">Inbox</span>
                  <Show when={!listId()}>
                    <CheckIcon class="w-3.5 h-3.5 text-primary" />
                  </Show>
                </Button>

                <div class="my-1 border-t border-border" />

                <Show when={projectsWithoutArea().length > 0}>
                  <For each={projectsWithoutArea()}>
                    {(project) => (
                      <Button
                        variant="ghost"
                        onClick={() => handleSelectProject(project.id)}
                        class={cn(
                          "flex items-center gap-2 w-full h-[28px] px-3 text-[13px] font-semibold justify-start",
                          "hover:bg-accent",
                        )}
                      >
                        <ProjectProgressIcon progress={0} size={12} class="text-things-blue" />
                        <span class="flex-1 text-left truncate">{project.title}</span>
                        <Show when={listId() === project.id}>
                          <CheckIcon class="w-3.5 h-3.5 text-primary" />
                        </Show>
                      </Button>
                    )}
                  </For>
                </Show>

                <For each={areasWithProjects()}>
                  {(area, index) => (
                    <div>
                      <Show when={index() > 0 || projectsWithoutArea().length > 0}>
                        <div class="my-1 border-t border-border" />
                      </Show>

                      <Button
                        variant="ghost"
                        onClick={() => handleSelectArea(area.id)}
                        class={cn(
                          "flex items-center gap-2 w-full h-[28px] px-3 text-[13px] font-extrabold justify-start",
                          "hover:bg-accent",
                        )}
                      >
                        <BoxIcon class="w-3 h-3 text-things-green" />
                        <span class="flex-1 text-left truncate">{area.title}</span>
                        <Show when={listId() === area.id}>
                          <CheckIcon class="w-3.5 h-3.5 text-primary" />
                        </Show>
                      </Button>

                      <For each={area.projects}>
                        {(project) => (
                          <Button
                            variant="ghost"
                            onClick={() => handleSelectProject(project.id)}
                            class={cn(
                              "flex items-center gap-2 w-full h-[28px] px-3 pl-6 text-[13px] font-semibold justify-start",
                              "hover:bg-accent",
                            )}
                          >
                            <ProjectProgressIcon progress={0} size={12} class="text-things-blue" />
                            <span class="flex-1 text-left truncate">{project.title}</span>
                            <Show when={listId() === project.id}>
                              <CheckIcon class="w-3.5 h-3.5 text-primary" />
                            </Show>
                          </Button>
                        )}
                      </For>
                    </div>
                  )}
                </For>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Footer */}
        <DialogFooter class="px-6 py-4 border-t border-border flex-row items-center justify-between sm:justify-between">
          <div class="flex items-center gap-2">
            <Switch checked={createMore()} onChange={setCreateMore} />
            <Label class="text-muted-foreground cursor-pointer">Create more</Label>
          </div>

          <Button onClick={handleSubmit} disabled={!title().trim() || submitting()}>
            Create task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
