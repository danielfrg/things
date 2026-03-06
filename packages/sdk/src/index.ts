export * from "./gen/types.gen.js"
export { parseLocalDate, formatLocalDate } from "./dates.js"

import { createClient as genCreateClient } from "./gen/client/client.gen.js"
import type { Config } from "./gen/client/types.gen.js"
import { ThingsClient } from "./gen/sdk.gen.js"
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
