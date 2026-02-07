import { useNavigate, useSearchParams } from "@solidjs/router"
import { createSignal, onMount, Show } from "solid-js"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth"
import { useSDK } from "@/context/sdk"

export function CliAuth() {
  const auth = useAuth()
  const sdk = useSDK()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [status, setStatus] = createSignal<"loading" | "prompt" | "creating" | "success" | "error">("loading")
  const [error, setError] = createSignal("")

  const callback = params.callback as string
  const state = params.state as string
  const hostname = (params.hostname as string) || "Unknown"

  onMount(() => {
    if (!callback || !state) {
      setError("Invalid request: missing callback or state parameter")
      setStatus("error")
      return
    }

    if (!auth.isAuthenticated) {
      // Redirect to login with return URL
      const returnUrl = `/cli-auth?callback=${encodeURIComponent(callback)}&state=${encodeURIComponent(state)}&hostname=${encodeURIComponent(hostname)}`
      navigate(`/login?return=${encodeURIComponent(returnUrl)}`)
      return
    }

    setStatus("prompt")
  })

  const handleAuthorize = async () => {
    setStatus("creating")

    try {
      // Create API key for CLI
      const keyName = `CLI - ${hostname}`

      const { data, error: apiError } = await sdk.client.postApiAuthApiKeyCliToken({
        name: keyName,
        hostname,
      })

      if (apiError || !data) {
        setError("Failed to create API key")
        setStatus("error")
        return
      }

      // Redirect back to CLI with the key
      const redirectUrl = new URL(callback)
      redirectUrl.searchParams.set("state", state)
      redirectUrl.searchParams.set("key", data.key)
      redirectUrl.searchParams.set("email", auth.user?.email || "")

      window.location.href = redirectUrl.toString()
    } catch (e) {
      setError(String(e))
      setStatus("error")
    }
  }

  const handleDeny = () => {
    const redirectUrl = new URL(callback)
    redirectUrl.searchParams.set("state", state)
    redirectUrl.searchParams.set("error", "Authorization denied")
    window.location.href = redirectUrl.toString()
  }

  return (
    <div class="min-h-screen flex items-center justify-center bg-background p-4">
      <div class="w-full max-w-md">
        <Show when={status() === "loading"}>
          <div class="text-center">
            <p class="text-muted-foreground">Loading...</p>
          </div>
        </Show>

        <Show when={status() === "prompt"}>
          <div class="bg-card border border-border rounded-lg p-6 shadow-sm">
            <div class="text-center mb-6">
              <div class="w-16 h-16 bg-things-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  class="w-8 h-8 text-things-blue"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M7 8h10M7 12h6" />
                </svg>
              </div>
              <h1 class="text-xl font-semibold text-foreground">Authorize Things CLI</h1>
              <p class="text-sm text-muted-foreground mt-2">
                The Things CLI on <span class="font-medium text-foreground">{hostname}</span> is requesting access to
                your account.
              </p>
            </div>

            <div class="bg-muted/50 rounded-lg p-4 mb-6">
              <ul class="text-sm space-y-1">
                <li class="flex items-center gap-2 text-foreground">
                  This will allow the CLI to read and write everything in your Things account
                </li>
              </ul>
            </div>

            <div class="flex gap-3">
              <Button variant="outline" class="flex-1" onClick={handleDeny}>
                Deny
              </Button>
              <Button class="flex-1" onClick={handleAuthorize}>
                Authorize
              </Button>
            </div>

            <p class="text-xs text-muted-foreground text-center mt-4">Signed in as {auth.user?.email}</p>
          </div>
        </Show>

        <Show when={status() === "creating"}>
          <div class="text-center">
            <div class="animate-spin w-8 h-8 border-2 border-things-blue border-t-transparent rounded-full mx-auto mb-4" />
            <p class="text-muted-foreground">Creating API key...</p>
          </div>
        </Show>

        <Show when={status() === "error"}>
          <div class="bg-card border border-destructive/20 rounded-lg p-6 shadow-sm text-center">
            <div class="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                class="w-8 h-8 text-destructive"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M15 9l-6 6M9 9l6 6" />
              </svg>
            </div>
            <h2 class="text-lg font-semibold text-foreground mb-2">Authorization Failed</h2>
            <p class="text-sm text-muted-foreground mb-4">{error()}</p>
            <Button variant="outline" onClick={() => navigate("/inbox")}>
              Return to Things
            </Button>
          </div>
        </Show>
      </div>
    </div>
  )
}
