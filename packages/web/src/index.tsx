import { Navigate, Route, Router } from "@solidjs/router"
import type { ParentProps } from "solid-js"
import { Show } from "solid-js"
import { render } from "solid-js/web"
import App from "./app"
import { AuthProvider, useAuth } from "./context/auth"
import { EventProvider } from "./context/event"
import { SDKProvider } from "./context/sdk"
import { TaskRepositoryProvider } from "./context/task-repository"
import { Anytime } from "./pages/anytime"
import { Area } from "./pages/area"
import { CliAuth } from "./pages/cli-auth"
import { Help } from "./pages/help"
import { Inbox } from "./pages/inbox"
import { Logbook } from "./pages/logbook"
import { Login } from "./pages/login"
import { Project } from "./pages/project"
import { Settings } from "./pages/settings"
import { Someday } from "./pages/someday"
import { Today } from "./pages/today"
import { Trash } from "./pages/trash"
import { Upcoming } from "./pages/upcoming"

import "./styles/index.css"

// In production, the API is served from the same origin as the frontend
// In development, we may use VITE_API_URL to point to a different server
const BASE_URL = import.meta.env.VITE_API_URL || (typeof window !== "undefined" ? window.location.origin : "")

// Protected route wrapper - persists across navigation
function ProtectedApp(props: ParentProps) {
  const auth = useAuth()

  return (
    <Show
      when={!auth.loading}
      fallback={
        <div class="h-screen flex items-center justify-center">
          <span class="text-muted-foreground">Loading...</span>
        </div>
      }
    >
      <Show when={auth.isAuthenticated} fallback={<Navigate href="/login" />}>
        <SDKProvider baseUrl={BASE_URL}>
          <EventProvider>
            <TaskRepositoryProvider>
              <App>{props.children}</App>
            </TaskRepositoryProvider>
          </EventProvider>
        </SDKProvider>
      </Show>
    </Show>
  )
}

// Public login page wrapper
function PublicLogin() {
  const auth = useAuth()

  return (
    <Show
      when={!auth.loading}
      fallback={
        <div class="h-screen flex items-center justify-center">
          <span class="text-muted-foreground">Loading...</span>
        </div>
      }
    >
      <Show when={!auth.isAuthenticated} fallback={<Navigate href="/today" />}>
        <Login />
      </Show>
    </Show>
  )
}

// CLI auth wrapper - needs SDK but handles its own auth redirect
function CliAuthWrapper() {
  const auth = useAuth()

  return (
    <Show
      when={!auth.loading}
      fallback={
        <div class="h-screen flex items-center justify-center">
          <span class="text-muted-foreground">Loading...</span>
        </div>
      }
    >
      <SDKProvider baseUrl={BASE_URL}>
        <CliAuth />
      </SDKProvider>
    </Show>
  )
}

const root = document.getElementById("root")

render(
  () => (
    <AuthProvider baseUrl={BASE_URL}>
      <Router>
        <Route path="/login" component={PublicLogin} />
        <Route path="/cli-auth" component={CliAuthWrapper} />
        <Route path="/" component={ProtectedApp}>
          <Route path="/" component={() => <Navigate href="/today" />} />
          <Route path="/inbox" component={Inbox} />
          <Route path="/today" component={Today} />
          <Route path="/upcoming" component={Upcoming} />
          <Route path="/anytime" component={Anytime} />
          <Route path="/someday" component={Someday} />
          <Route path="/logbook" component={Logbook} />
          <Route path="/trash" component={Trash} />
          <Route path="/settings" component={Settings} />
          <Route path="/docs" component={Help} />
          <Route path="/project/:projectId" component={Project} />
          <Route path="/area/:areaId" component={Area} />
        </Route>
      </Router>
    </AuthProvider>
  ),
  root!,
)
