import { spawn } from "node:child_process"
import { createServer, type Server } from "node:http"
import { hostname } from "os"
import { deleteCredentials, getCredentials, saveCredentials } from "./config"

const DEFAULT_PORT = 9876
const CALLBACK_TIMEOUT = 120000 // 2 minutes

type LoginResult = {
  success: boolean
  email?: string
  error?: string
}

function generateState(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("")
}

export async function login(baseUrl: string): Promise<LoginResult> {
  const state = generateState()
  const port = DEFAULT_PORT
  const callbackUrl = `http://127.0.0.1:${port}/callback`
  const host = hostname()

  return new Promise((resolve) => {
    let resolved = false
    let server: Server | null = null

    const reply = (res: import("node:http").ServerResponse, code: number, body: string) => {
      res.writeHead(code, { "Content-Type": "text/html" })
      res.end(body)
    }

    const cleanup = () => {
      if (server) {
        server.close()
        server = null
      }
    }

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true
        cleanup()
        resolve({
          success: false,
          error: "Login timed out. Please try again.",
        })
      }
    }, CALLBACK_TIMEOUT)

    server = createServer(async (req, res) => {
      const origin = `http://${req.headers.host || `127.0.0.1:${port}`}`
      const url = new URL(req.url || "/", origin)

      if (url.pathname !== "/callback") {
        res.writeHead(404)
        res.end("Not found")
        return
      }

      const returnedState = url.searchParams.get("state")
      const apiKey = url.searchParams.get("key")
      const email = url.searchParams.get("email")
      const error = url.searchParams.get("error")

      if (error) {
        resolved = true
        clearTimeout(timeout)
        cleanup()
        resolve({ success: false, error })
        reply(res, 200, errorHtml(error))
        return
      }

      if (returnedState !== state) {
        resolved = true
        clearTimeout(timeout)
        cleanup()
        resolve({ success: false, error: "Invalid state parameter" })
        reply(res, 400, errorHtml("Invalid state parameter"))
        return
      }

      if (!apiKey || !email) {
        resolved = true
        clearTimeout(timeout)
        cleanup()
        resolve({ success: false, error: "Missing credentials" })
        reply(res, 400, errorHtml("Missing credentials"))
        return
      }

      await saveCredentials({ apiKey, baseUrl, email })

      resolved = true
      clearTimeout(timeout)
      cleanup()
      resolve({ success: true, email })

      reply(res, 200, successHtml(email))
    })

    server.listen(port, "127.0.0.1")

    // /cli-auth is a frontend route that redirects to auth flow
    const authUrl = `${baseUrl}/cli-auth?callback=${encodeURIComponent(callbackUrl)}&state=${state}&hostname=${encodeURIComponent(host)}`

    console.log("Opening browser to authenticate...")
    console.log(`If the browser doesn't open, visit: ${authUrl}`)

    openBrowser(authUrl)
  })
}

export async function logout(baseUrl: string): Promise<{ success: boolean; error?: string }> {
  const creds = await getCredentials()
  if (!creds) {
    return { success: true }
  }

  // Revoke the API key on the server
  try {
    const response = await fetch(`${baseUrl}/api/auth/cli-logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${creds.apiKey}`,
      },
    })

    if (!response.ok && response.status !== 401) {
      // 401 is fine - key may already be revoked
      const text = await response.text()
      console.warn(`Warning: Could not revoke API key on server: ${text}`)
    }
  } catch {
    console.warn(`Warning: Could not connect to server to revoke API key`)
  }

  await deleteCredentials()
  return { success: true }
}

export async function whoami(baseUrl: string): Promise<{ email?: string; error?: string }> {
  const creds = await getCredentials()
  if (!creds) {
    return { error: "Not logged in" }
  }

  // Verify the key is still valid
  try {
    const response = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${creds.apiKey}`,
      },
    })

    if (!response.ok) {
      return { error: "Session expired. Please login again." }
    }

    const data = (await response.json()) as { email?: string }
    return { email: data.email || creds.email }
  } catch {
    return { email: creds.email }
  }
}

function openBrowser(url: string) {
  const platform = process.platform
  const processRef =
    platform === "darwin"
      ? spawn("open", [url], { detached: true, stdio: "ignore" })
      : platform === "win32"
        ? spawn("cmd", ["/c", "start", "", url], {
            detached: true,
            stdio: "ignore",
          })
        : spawn("xdg-open", [url], { detached: true, stdio: "ignore" })

  processRef.unref()
}

function successHtml(email: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Things CLI - Success</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            background: 'hsl(0 0% 98%)',
            card: 'hsl(0 0% 100%)',
            border: 'hsl(0 0% 90%)',
            foreground: 'hsl(0 0% 9%)',
            'muted-foreground': 'hsl(0 0% 45%)',
          }
        }
      }
    }
  </script>
</head>
<body class="bg-background text-foreground antialiased">
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="bg-card border border-border rounded-lg p-6 shadow-sm text-center">
        <div class="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 class="text-xl font-semibold mb-2">Authorization Successful</h1>
        <p class="text-sm text-muted-foreground mb-1">Logged in as</p>
        <p class="text-sm font-medium mb-6">${escapeHtml(email)}</p>
        <p class="text-xs text-muted-foreground">You can close this window and return to your terminal</p>
      </div>
    </div>
  </div>
</body>
</html>`
}

function errorHtml(error: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Things CLI - Error</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            background: 'hsl(0 0% 98%)',
            card: 'hsl(0 0% 100%)',
            border: 'hsl(0 0% 90%)',
            foreground: 'hsl(0 0% 9%)',
            'muted-foreground': 'hsl(0 0% 45%)',
            destructive: 'hsl(0 84% 60%)',
          }
        }
      }
    }
  </script>
</head>
<body class="bg-background text-foreground antialiased">
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="bg-card border border-destructive/20 rounded-lg p-6 shadow-sm text-center">
        <div class="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6M9 9l6 6" />
          </svg>
        </div>
        <h1 class="text-xl font-semibold mb-2">Authorization Failed</h1>
        <p class="text-sm text-muted-foreground mb-6">${escapeHtml(error)}</p>
        <p class="text-xs text-muted-foreground">Please return to your terminal and try again</p>
      </div>
    </div>
  </div>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
