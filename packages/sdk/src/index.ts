export * from "./gen/types.gen"
export { parseLocalDate, formatLocalDate } from "./dates"

import { createClient as genCreateClient } from "./gen/client/client.gen"
import type { Config } from "./gen/client/types.gen"
import { ThingsClient } from "./gen/sdk.gen"
export { type Config as ClientConfig, ThingsClient }

export function createClient(config?: Config & { directory?: string }) {
  if (!config?.fetch) {
    const customFetch = (req: RequestInfo | URL) => {
      // @ts-expect-error - Setting timeout property on Request
      req.timeout = false
      return fetch(req)
    }
    config = {
      ...config,
      fetch: customFetch as typeof fetch,
    }
  }

  const client = genCreateClient(config)
  return new ThingsClient({ client })
}
