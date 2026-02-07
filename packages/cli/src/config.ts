import { homedir } from "os"
import { join } from "path"

const CONFIG_DIR = join(homedir(), ".config", "things")
const CREDENTIALS_FILE = join(CONFIG_DIR, "credentials.json")

type Credentials = {
  apiKey: string
  baseUrl: string
  email: string
}

export async function getCredentials(): Promise<Credentials | null> {
  const file = Bun.file(CREDENTIALS_FILE)
  if (!(await file.exists())) return null

  try {
    const content = await file.json()
    if (content.apiKey && content.baseUrl) {
      return content as Credentials
    }
    return null
  } catch {
    return null
  }
}

export async function saveCredentials(credentials: Credentials): Promise<void> {
  await Bun.write(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2))
}

export async function deleteCredentials(): Promise<void> {
  const file = Bun.file(CREDENTIALS_FILE)
  if (await file.exists()) {
    const { unlink } = await import("fs/promises")
    await unlink(CREDENTIALS_FILE)
  }
}

export function getConfigDir(): string {
  return CONFIG_DIR
}

export function getCredentialsPath(): string {
  return CREDENTIALS_FILE
}
