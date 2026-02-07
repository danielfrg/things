import { createAuthClient } from "better-auth/client"

// In production, the API is served from the same origin as the frontend
// In development, we may use VITE_API_URL to point to a different server
const baseURL = import.meta.env.VITE_API_URL || (typeof window !== "undefined" ? window.location.origin : "")

export const authClient = createAuthClient({
  baseURL,
})
