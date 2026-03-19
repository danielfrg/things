import { access, mkdir, readFile, unlink, writeFile } from "node:fs/promises"
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
  const exists = await access(CREDENTIALS_FILE)
    .then(() => true)
    .catch(() => false)

  if (!exists) return null

  try {
    const raw = await readFile(CREDENTIALS_FILE, "utf8")
    const content = JSON.parse(raw) as Credentials
    if (content.apiKey && content.baseUrl) {
      return content
    }
    return null
  } catch {
    return null
  }
}

export async function saveCredentials(credentials: Credentials): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true })
  await writeFile(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2))
}

export async function deleteCredentials(): Promise<void> {
  const exists = await access(CREDENTIALS_FILE)
    .then(() => true)
    .catch(() => false)

  if (exists) {
    await unlink(CREDENTIALS_FILE)
  }
}

export function getConfigDir(): string {
  return CONFIG_DIR
}

export function getCredentialsPath(): string {
  return CREDENTIALS_FILE
}
