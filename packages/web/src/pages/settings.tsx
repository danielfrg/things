import { A, useNavigate } from "@solidjs/router"
import { createEffect, createResource, createSignal, For, Show } from "solid-js"
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  KeyIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  PencilIcon,
  PlusIcon,
  Settings2Icon,
  SunIcon,
  Trash2Icon,
} from "@/components/icons"
import { SidebarTrigger } from "@/components/layout/sidebar"
import { SyncStatus } from "@/components/sync-status"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/context/auth"
import { useSDK } from "@/context/sdk"
import { useSidebarData } from "@/context/sidebar"
import { authClient } from "@/lib/auth"
import { cn } from "@/lib/utils"

declare const __APP_VERSION__: string

type Theme = "light" | "dark" | "system"

const themeOptions = [
  { value: "light" as Theme, label: "Light", icon: SunIcon },
  { value: "dark" as Theme, label: "Dark", icon: MoonIcon },
  { value: "system" as Theme, label: "System", icon: MonitorIcon },
]

function SectionHeader(props: { title: string; description?: string }) {
  return (
    <div class="mb-4">
      <h2 class="text-base font-medium text-foreground">{props.title}</h2>
      <Show when={props.description}>
        <p class="text-sm text-muted-foreground mt-1">{props.description}</p>
      </Show>
    </div>
  )
}

function Card(props: { children: any; class?: string }) {
  return (
    <div class={cn("rounded-lg border border-border bg-card text-card-foreground overflow-hidden", props.class)}>
      {props.children}
    </div>
  )
}

function AccountSection() {
  const auth = useAuth()
  const sdk = useSDK()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = createSignal(false)
  const [theme, setTheme] = createSignal<Theme>((localStorage.getItem("theme") as Theme) || "system")

  // Email editing state
  const [editingEmail, setEditingEmail] = createSignal(false)
  const [emailValue, setEmailValue] = createSignal("")
  const [emailStatus, setEmailStatus] = createSignal<{
    type: "idle" | "saving" | "success" | "error"
    message?: string
  }>({ type: "idle" })

  // Password editing state
  const [editingPassword, setEditingPassword] = createSignal(false)
  const [currentValue, setCurrentValue] = createSignal("")
  const [passwordValue, setPasswordValue] = createSignal("")
  const [passwordStatus, setPasswordStatus] = createSignal<{
    type: "idle" | "saving" | "success" | "error"
    message?: string
  }>({ type: "idle" })

  // Apply theme
  createEffect(() => {
    const t = theme()
    const root = document.documentElement

    if (t === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      root.classList.toggle("dark", isDark)
    } else {
      root.classList.toggle("dark", t === "dark")
    }
    localStorage.setItem("theme", t)
  })

  const handleLogout = async () => {
    setLoggingOut(true)
    await auth.signOut()
    navigate("/login")
  }

  const handleSaveEmail = async () => {
    const newEmail = emailValue().trim()
    if (!newEmail || newEmail === auth.user?.email) {
      setEditingEmail(false)
      return
    }

    setEmailStatus({ type: "saving" })

    try {
      const response = await fetch(`${sdk.baseUrl}/api/auth/account/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: newEmail }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setEmailStatus({
          type: "error",
          message: typeof data.error === "string" ? data.error : "Failed to update email",
        })
        setTimeout(() => setEmailStatus({ type: "idle" }), 3000)
        return
      }

      setEmailStatus({ type: "success" })
      setEditingEmail(false)
      setTimeout(() => setEmailStatus({ type: "idle" }), 2000)
      await auth.refresh()
      setEmailValue("")
    } catch (error) {
      console.error("Email update error:", error)
      setEmailStatus({
        type: "error",
        message: "Failed to update email",
      })
      setTimeout(() => setEmailStatus({ type: "idle" }), 3000)
    }
  }

  const handleSavePassword = async () => {
    const currentPassword = currentValue().trim()
    const newPassword = passwordValue().trim()
    if (!newPassword) {
      setEditingPassword(false)
      setCurrentValue("")
      setPasswordValue("")
      return
    }

    if (!currentPassword) {
      setPasswordStatus({
        type: "error",
        message: "Enter current password",
      })
      setTimeout(() => setPasswordStatus({ type: "idle" }), 3000)
      return
    }

    if (newPassword.length < 8) {
      setPasswordStatus({
        type: "error",
        message: "Min 8 characters",
      })
      setTimeout(() => setPasswordStatus({ type: "idle" }), 3000)
      return
    }

    setPasswordStatus({ type: "saving" })

    try {
      const result = await authClient.changePassword({
        newPassword,
        currentPassword,
        revokeOtherSessions: false,
      })

      if (result.error) {
        setPasswordStatus({
          type: "error",
          message: result.error.message || "Failed to update password",
        })
        setTimeout(() => setPasswordStatus({ type: "idle" }), 3000)
        return
      }

      setPasswordStatus({ type: "success" })
      setCurrentValue("")
      setPasswordValue("")
      setEditingPassword(false)
      setTimeout(() => setPasswordStatus({ type: "idle" }), 2000)
    } catch (error) {
      console.error("Password update error:", error)
      setPasswordStatus({
        type: "error",
        message: "Failed to update password",
      })
      setTimeout(() => setPasswordStatus({ type: "idle" }), 3000)
    }
  }

  const currentTheme = () => themeOptions.find((o) => o.value === theme())

  return (
    <section class="mb-12">
      <SectionHeader title="Account" />
      <Card>
        {/* Email Row */}
        <div class="px-4 py-4 border-b border-border">
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-sm font-medium text-foreground shrink-0">Email</span>
              <Show when={emailStatus().type === "success"}>
                <span class="text-xs text-green-600 shrink-0">Saved</span>
              </Show>
              <Show when={emailStatus().type === "error"}>
                <span class="text-xs text-destructive truncate">{emailStatus().message}</span>
              </Show>
            </div>

            <div class="flex items-center gap-3">
              <span class="text-sm text-muted-foreground truncate max-w-[320px]">{auth.user?.email}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEmailValue(auth.user?.email || "")
                  setEditingEmail((v) => !v)
                }}
                class="h-7 w-7 p-0"
                title="Edit email"
              >
                <PencilIcon class="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          </div>

          <Show when={editingEmail()}>
            <div class="mt-3 pt-3 border-t border-border">
              <div class="flex items-center gap-2">
                <input
                  type="email"
                  value={emailValue()}
                  onInput={(e) => setEmailValue(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEmail()
                    if (e.key === "Escape") {
                      setEditingEmail(false)
                      setEmailValue("")
                    }
                  }}
                  disabled={emailStatus().type === "saving"}
                  placeholder="New email"
                  class="h-9 flex-1 px-3 text-sm bg-transparent border border-input rounded-md outline-none focus:border-ring"
                  autofocus
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingEmail(false)
                    setEmailValue("")
                  }}
                  disabled={emailStatus().type === "saving"}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveEmail} disabled={emailStatus().type === "saving"}>
                  Save
                </Button>
              </div>
            </div>
          </Show>
        </div>

        {/* Password Row */}
        <div class="px-4 py-4 border-b border-border">
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-sm font-medium text-foreground shrink-0">Password</span>
              <Show when={passwordStatus().type === "success"}>
                <span class="text-xs text-green-600 shrink-0">Saved</span>
              </Show>
              <Show when={passwordStatus().type === "error"}>
                <span class="text-xs text-destructive truncate">{passwordStatus().message}</span>
              </Show>
            </div>

            <div class="flex items-center gap-3">
              <span class="text-sm text-muted-foreground">••••••••</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingPassword((v) => !v)}
                class="h-7 w-7 p-0"
                title="Change password"
              >
                <PencilIcon class="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          </div>

          <Show when={editingPassword()}>
            <div class="mt-3 pt-3 border-t border-border">
              <div class="grid grid-cols-2 gap-2">
                <input
                  type="password"
                  value={currentValue()}
                  onInput={(e) => setCurrentValue(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSavePassword()
                    if (e.key === "Escape") {
                      setEditingPassword(false)
                      setCurrentValue("")
                      setPasswordValue("")
                    }
                  }}
                  disabled={passwordStatus().type === "saving"}
                  placeholder="Current password"
                  class="h-9 w-full px-3 text-sm bg-transparent border border-input rounded-md outline-none focus:border-ring"
                  autofocus
                />
                <input
                  type="password"
                  value={passwordValue()}
                  onInput={(e) => setPasswordValue(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSavePassword()
                    if (e.key === "Escape") {
                      setEditingPassword(false)
                      setCurrentValue("")
                      setPasswordValue("")
                    }
                  }}
                  disabled={passwordStatus().type === "saving"}
                  placeholder="New password"
                  class="h-9 w-full px-3 text-sm bg-transparent border border-input rounded-md outline-none focus:border-ring"
                />
              </div>

              <div class="mt-3 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingPassword(false)
                    setCurrentValue("")
                    setPasswordValue("")
                  }}
                  disabled={passwordStatus().type === "saving"}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSavePassword} disabled={passwordStatus().type === "saving"}>
                  Save
                </Button>
              </div>
            </div>
          </Show>
        </div>

        {/* Theme Row */}
        <div class="flex items-center justify-between px-4 py-4 border-b border-border">
          <span class="text-sm font-medium text-foreground">Theme</span>
          <DropdownMenu>
            <DropdownMenuTrigger class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Show when={currentTheme()}>
                {(current) => {
                  const Icon = current().icon
                  return (
                    <>
                      <Icon class="h-4 w-4" />
                      {current().label}
                      <ChevronDownIcon class="h-4 w-4" />
                    </>
                  )
                }}
              </Show>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <For each={themeOptions}>
                {(option) => {
                  const Icon = option.icon
                  return (
                    <DropdownMenuItem onSelect={() => setTheme(option.value)}>
                      <Icon class="h-4 w-4" />
                      {option.label}
                      <Show when={theme() === option.value}>
                        <CheckIcon class="h-4 w-4 ml-auto" />
                      </Show>
                    </DropdownMenuItem>
                  )
                }}
              </For>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Sign Out Row */}
        <div class="flex items-center justify-between px-4 py-4">
          <span class="text-sm font-medium text-foreground">Session</span>
          <Button variant="outline" size="sm" onClick={handleLogout} disabled={loggingOut()}>
            <LogOutIcon class="h-3.5 w-3.5" />
            {loggingOut() ? "Signing out..." : "Sign out"}
          </Button>
        </div>
      </Card>
    </section>
  )
}

function TagsSection() {
  const sidebar = useSidebarData()
  const sdk = useSDK()
  const [newTagTitle, setNewTagTitle] = createSignal("")
  const [deleteTagId, setDeleteTagId] = createSignal<string | null>(null)

  const tagToDelete = () => sidebar.sortedTags.find((t) => t.id === deleteTagId())

  const handleCreateTag = async () => {
    const title = newTagTitle().trim()
    if (!title) return

    await sdk.client.postApiV1Tags({
      createTag: {
        title,
        position: sidebar.sortedTags.length + 1,
      },
    })
    setNewTagTitle("")
  }

  const handleTagTitleChange = async (id: string, title: string) => {
    const trimmed = title.trim()
    if (!trimmed) return

    await sdk.client.putApiV1TagsById({
      id,
      updateTag: {
        title: trimmed,
      },
    })
  }

  const handleDeleteTag = async () => {
    const id = deleteTagId()
    if (!id) return

    await sdk.client.deleteApiV1TagsById({ id })
    setDeleteTagId(null)
  }

  return (
    <>
      <section class="mb-12">
        <SectionHeader title="Tags" />
        <Card>
          {/* Create tag input */}
          <div class="flex items-center gap-2 px-4 py-3 border-b border-border">
            <PlusIcon class="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={newTagTitle()}
              onInput={(e) => setNewTagTitle(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateTag()
              }}
              placeholder="New tag..."
              class="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            <Show when={newTagTitle().trim()}>
              <Button variant="ghost" size="sm" onClick={handleCreateTag}>
                Add
              </Button>
            </Show>
          </div>

          {/* Tags list */}
          <Show
            when={sidebar.sortedTags.length > 0}
            fallback={
              <div class="px-5 py-5">
                <p class="text-sm text-muted-foreground">No tags yet. Create your first tag above.</p>
              </div>
            }
          >
            <For each={sidebar.sortedTags}>
              {(tag, index) => (
                <div
                  class={cn(
                    "flex items-center gap-3 px-4 py-3 group",
                    index() < sidebar.sortedTags.length - 1 && "border-b border-border",
                  )}
                >
                  {/* Tag title (editable) */}
                  <input
                    type="text"
                    value={tag.title}
                    onBlur={(e) => handleTagTitleChange(tag.id, e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur()
                    }}
                    class="flex-1 bg-transparent text-sm text-foreground outline-none"
                  />

                  {/* Delete button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTagId(tag.id)}
                    class="opacity-0 group-hover:opacity-100 transition-opacity p-1.5"
                    title="Delete tag"
                  >
                    <Trash2Icon class="w-4 h-4" />
                  </Button>
                </div>
              )}
            </For>
          </Show>
        </Card>
      </section>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTagId()} onOpenChange={(open) => !open && setDeleteTagId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{tagToDelete()?.title}"? This tag will be removed from all tasks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeleteTag}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function ApiKeysSection() {
  const sdk = useSDK()
  const [showCreateDialog, setShowCreateDialog] = createSignal(false)
  const [newKeyName, setNewKeyName] = createSignal("")
  const [newKeyScope, setNewKeyScope] = createSignal<"read" | "read-write">("read-write")
  const [createdKey, setCreatedKey] = createSignal<{
    key: string
    keyPrefix: string
    name: string
  } | null>(null)
  const [deleteKeyId, setDeleteKeyId] = createSignal<string | null>(null)
  const [copied, setCopied] = createSignal(false)

  const [apiKeys, { refetch }] = createResource(async () => {
    const { data, error } = await sdk.client.getApiAuthApiKey()
    if (error) {
      console.error("Failed to load API keys:", error)
      return []
    }
    return data || []
  })

  const keyToDelete = () => apiKeys()?.find((k: any) => k.id === deleteKeyId())

  const handleCreateKey = async () => {
    const name = newKeyName().trim()
    if (!name) return

    const { data, error } = await sdk.client.postApiAuthApiKey({
      name,
      scope: newKeyScope(),
    })

    if (error || !data) {
      console.error("Failed to create API key:", error)
      return
    }

    setCreatedKey(data)
    setShowCreateDialog(false)
    setNewKeyName("")
    setNewKeyScope("read-write")
    refetch()
  }

  const handleDeleteKey = async () => {
    const id = deleteKeyId()
    if (!id) return

    await sdk.client.deleteApiAuthApiKeyById({ id })
    setDeleteKeyId(null)
    refetch()
  }

  const handleCopyKey = () => {
    const key = createdKey()?.key
    if (!key) return

    navigator.clipboard.writeText(key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <section class="mb-12">
        <SectionHeader title="API Keys" description="Create and manage API keys for programmatic access" />

        {/* Show created key modal */}
        <Show when={createdKey()}>
          <Card class="mb-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <div class="px-4 py-4">
              <div class="flex items-start gap-3">
                <KeyIcon class="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div class="flex-1 min-w-0">
                  <h3 class="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                    API Key Created: {createdKey()?.name}
                  </h3>
                  <p class="text-xs text-blue-700 dark:text-blue-300 mb-3">
                    Copy this key now. You won't be able to see it again!
                  </p>
                  <div class="flex items-center gap-2">
                    <code class="flex-1 px-3 py-2 text-xs font-mono bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-800 rounded truncate">
                      {createdKey()?.key}
                    </code>
                    <Button size="sm" onClick={handleCopyKey}>
                      <CopyIcon class="w-3.5 h-3.5" />
                      {copied() ? "Copied!" : "Copy"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCreatedKey(null)}>
                      Done
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </Show>

        <Card>
          {/* Create button */}
          <div class="flex items-center justify-between px-4 py-4 border-b border-border">
            <div>
              <h3 class="text-sm font-medium text-foreground">API Keys</h3>
            </div>
            <Button size="sm" onClick={() => setShowCreateDialog(true)}>
              <PlusIcon class="w-3.5 h-3.5" />
              Create Key
            </Button>
          </div>

          {/* Keys list */}
          <Show
            when={apiKeys() && apiKeys()!.length > 0}
            fallback={
              <div class="px-4 py-5">
                <p class="text-sm text-muted-foreground">No API keys yet. Create your first key to get started.</p>
              </div>
            }
          >
            <For each={apiKeys()}>
              {(key, index) => (
                <div
                  class={cn(
                    "flex items-center justify-between px-4 py-3",
                    index() < apiKeys()!.length - 1 && "border-b border-border",
                  )}
                >
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-medium text-foreground">{key.name}</span>
                      <span
                        class={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          key.scope === "read"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                            : "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
                        )}
                      >
                        {key.scope === "read" ? "Read" : "Read + Write"}
                      </span>
                    </div>
                    <div class="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>Key: {key.keyPrefix}...</span>
                      <Show when={key.lastUsedAt}>
                        <span>Last used: {new Date(key.lastUsedAt!).toLocaleDateString()}</span>
                      </Show>
                      <Show when={!key.lastUsedAt}>
                        <span>Never used</span>
                      </Show>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteKeyId(key.id)}
                    class="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2Icon class="w-4 h-4" />
                  </Button>
                </div>
              )}
            </For>
          </Show>
        </Card>
      </section>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteKeyId()} onOpenChange={(open) => !open && setDeleteKeyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{keyToDelete()?.name}"? Any applications using this key will immediately
              lose access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeleteKey}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Key Dialog */}
      <AlertDialog
        open={showCreateDialog()}
        onOpenChange={(open) => {
          setShowCreateDialog(open)
          if (!open) {
            setNewKeyName("")
            setNewKeyScope("read-write")
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Create a new API key for programmatic access to your Things data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div class="space-y-4 py-4">
            <div>
              <label for="api-key-name" class="text-sm font-medium text-foreground block mb-2">
                Key Name
              </label>
              <input
                id="api-key-name"
                type="text"
                value={newKeyName()}
                onInput={(e) => setNewKeyName(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newKeyName().trim()) handleCreateKey()
                }}
                placeholder="e.g. 'CLI', 'Mobile App', 'Automation'"
                class="w-full h-9 px-3 text-sm bg-transparent border border-input rounded-md outline-none focus:border-ring"
                autofocus
              />
            </div>
            <div>
              <label for="api-key-scope" class="text-sm font-medium text-foreground block mb-2">
                Permissions
              </label>
              <select
                id="api-key-scope"
                value={newKeyScope()}
                onChange={(e) => setNewKeyScope(e.currentTarget.value as "read" | "read-write")}
                class="w-full h-9 px-3 text-sm bg-transparent border border-input rounded-md outline-none focus:border-ring"
              >
                <option value="read">Read Only</option>
                <option value="read-write">Read + Write</option>
              </select>
              <p class="text-xs text-muted-foreground mt-2">
                Read-only keys can only fetch data. Read + Write keys can create, update, and delete.
              </p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateKey} disabled={!newKeyName().trim()}>
              Create Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function Settings() {
  return (
    <div class="flex flex-col h-full bg-background overflow-hidden relative">
      {/* Mobile floating sync status */}
      <div class="md:hidden fixed top-3 right-3 z-30">
        <SyncStatus />
      </div>

      <div class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div class="max-w-[800px] mx-auto px-6 py-8">
          {/* Page Title */}
          <div class="flex items-center gap-3 mb-8">
            <Settings2Icon class="w-6 h-6 text-muted-foreground" />
            <h1 class="text-2xl font-semibold text-foreground">Settings</h1>
          </div>

          <AccountSection />
          <ApiKeysSection />
          <TagsSection />

          {/* Help link */}
          <div class="text-center mb-4">
            <A href="/docs" class="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Help & Shortcuts
            </A>
          </div>

          {/* Version */}
          <p class="text-xs text-muted-foreground text-center">
            Version: {typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev"}
          </p>
        </div>
      </div>

      {/* Bottom toolbar */}
      <div class="flex-shrink-0 border-t border-sidebar-border bg-background h-[52px] flex items-center relative">
        {/* Mobile: centered sidebar trigger */}
        <div class="flex md:hidden items-center justify-center w-full px-4">
          <SidebarTrigger />
        </div>
        {/* Desktop: floating sync status */}
        <div class="hidden md:block absolute right-6">
          <SyncStatus />
        </div>
      </div>
    </div>
  )
}
