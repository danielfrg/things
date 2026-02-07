import { onMount } from "solid-js"
import { createStore } from "solid-js/store"
import { authClient } from "@/lib/auth"
import { createSimpleContext } from "./context"

type User = {
  id: string
  email: string
  name: string
}

type AuthStore = {
  user: User | null
  loading: boolean
  error: string | undefined
}

type AuthContext = {
  readonly user: User | null
  readonly loading: boolean
  readonly error: string | undefined
  readonly isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<boolean>
  signUp: (email: string, password: string, name: string) => Promise<boolean>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

export const { use: useAuth, provider: AuthProvider } = createSimpleContext({
  name: "Auth",
  gate: false, // Don't gate on ready - we need to show login if not authenticated
  init: (_props: { baseUrl: string }): AuthContext => {
    const [store, setStore] = createStore<AuthStore>({
      user: null,
      loading: true,
      error: undefined,
    })

    // Check session on mount
    onMount(async () => {
      try {
        const session = await authClient.getSession({
          query: { disableCookieCache: true },
        })
        if (session.data?.user) {
          setStore("user", {
            id: session.data.user.id,
            email: session.data.user.email,
            name: session.data.user.name,
          })
        }
      } catch (e) {
        console.error("[Auth] session check error:", e)
      }
      setStore("loading", false)
    })

    const refresh = async () => {
      try {
        const session = await authClient.getSession({
          query: { disableCookieCache: true },
        })
        if (session.data?.user) {
          setStore("user", {
            id: session.data.user.id,
            email: session.data.user.email,
            name: session.data.user.name,
          })
          return
        }
        setStore("user", null)
      } catch (e) {
        console.error("[Auth] refresh error:", e)
      }
    }

    const signIn = async (email: string, password: string) => {
      setStore("loading", true)
      setStore("error", undefined)

      try {
        const result = await authClient.signIn.email({
          email,
          password,
        })

        if (result.error) {
          setStore("error", result.error.message || "Sign in failed")
          setStore("loading", false)
          return false
        }

        if (result.data?.user) {
          setStore("user", {
            id: result.data.user.id,
            email: result.data.user.email,
            name: result.data.user.name,
          })
        }

        setStore("loading", false)
        return true
      } catch (e) {
        console.error("[Auth] sign in error:", e)
        setStore("error", String(e))
        setStore("loading", false)
        return false
      }
    }

    const signUp = async (email: string, password: string, name: string) => {
      setStore("loading", true)
      setStore("error", undefined)

      try {
        const result = await authClient.signUp.email({
          email,
          password,
          name,
        })

        if (result.error) {
          setStore("error", result.error.message || "Sign up failed")
          setStore("loading", false)
          return false
        }

        if (result.data?.user) {
          setStore("user", {
            id: result.data.user.id,
            email: result.data.user.email,
            name: result.data.user.name,
          })
        }

        setStore("loading", false)
        return true
      } catch (e) {
        console.error("[Auth] sign up error:", e)
        setStore("error", String(e))
        setStore("loading", false)
        return false
      }
    }

    const signOut = async () => {
      try {
        await authClient.signOut()
        setStore("user", null)
      } catch (e) {
        console.error("[Auth] sign out error:", e)
      }
    }

    return {
      get user() {
        return store.user
      },
      get loading() {
        return store.loading
      },
      get error() {
        return store.error
      },
      get isAuthenticated() {
        // Only check for user - session cookie handles auth
        return !!store.user
      },
      signIn,
      signUp,
      signOut,
      refresh,
    }
  },
})
