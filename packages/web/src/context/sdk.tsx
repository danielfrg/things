import { createClient } from "@things/sdk"
import { useAuth } from "./auth"
import { createSimpleContext } from "./context"

export const { use: useSDK, provider: SDKProvider } = createSimpleContext({
  name: "SDK",
  init: (props: { baseUrl: string }) => {
    const auth = useAuth()

    // Create client that uses session cookies for authentication
    const client = createClient({
      baseUrl: props.baseUrl,
      credentials: "include", // This sends cookies with requests
    })

    return {
      get client() {
        return client
      },
      get baseUrl() {
        return props.baseUrl
      },
      // Expose isReady to check if user is authenticated
      // This replaces the old apiKey check
      get isReady() {
        return auth.isAuthenticated
      },
    }
  },
})
