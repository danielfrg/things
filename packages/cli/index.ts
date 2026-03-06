#!/usr/bin/env bun
import { createClient } from "@things/sdk"
import type { ThingsClient } from "@things/sdk"
import type { ViewTask, Task, Project, Area } from "@things/sdk"
import { login, logout, whoami } from "./src/auth"
import { getCredentials, getCredentialsPath } from "./src/config"

// ── Credentials ──────────────────────────────────────────────────────────────

async function getApiKey(): Promise<{
  apiKey: string | null
  baseUrl: string | null
}> {
  const envKey = process.env.THINGS_API_KEY
  const envUrl = process.env.THINGS_BASE_URL

  if (envKey) {
    return { apiKey: envKey, baseUrl: envUrl || null }
  }

  const creds = await getCredentials()
  if (creds) {
    return { apiKey: creds.apiKey, baseUrl: envUrl || creds.baseUrl }
  }

  return { apiKey: null, baseUrl: envUrl || null }
}

// ── Output formatting ────────────────────────────────────────────────────────

type TaskLike = ViewTask | Task

function pad(str: string, len: number) {
  return str.length >= len ? str : str + " ".repeat(len - str.length)
}

type PrintOptions = {
  json: boolean
  checkbox?: boolean
}

function printTasks(tasks: TaskLike[], options: PrintOptions) {
  if (options.json) {
    console.log(JSON.stringify(tasks, null, 2))
    return
  }
  if (tasks.length === 0) {
    console.log("No tasks.")
    return
  }

  const showCheck = options.checkbox ?? false

  // Determine which optional columns are needed
  const hasDate = tasks.some((t) => t.scheduledDate)
  const hasDeadline = tasks.some((t) => t.deadline)

  // Calculate column widths
  const titles = tasks.map((t) => t.title)
  const maxTitle = Math.max(...titles.map((t) => t.length), 11)
  const titleWidth = Math.min(maxTitle, 60)

  // Header
  const parts: string[] = []
  if (showCheck) parts.push(pad("Done", 4))
  parts.push(pad("Description", titleWidth))
  if (hasDate) parts.push(pad("Date", 12))
  if (hasDeadline) parts.push(pad("Deadline", 12))
  const header = parts.join("  ")
  console.log(header)
  console.log("-".repeat(header.length))

  // Rows
  for (const task of tasks) {
    const row: string[] = []
    if (showCheck) {
      const mark = task.completedAt ? "[x]" : "[ ]"
      row.push(pad(mark, 4))
    }
    row.push(pad(task.title.slice(0, titleWidth), titleWidth))
    if (hasDate) row.push(pad(task.scheduledDate || "", 12))
    if (hasDeadline) row.push(pad(task.deadline || "", 12))
    console.log(row.join("  "))
  }

  const label = tasks.length === 1 ? "task" : "tasks"
  console.log(`\n${tasks.length} ${label}.`)
}

function printSections(sections: Array<{ title: string; tasks: TaskLike[] }>, options: PrintOptions) {
  if (options.json) {
    console.log(JSON.stringify(sections, null, 2))
    return
  }

  const all = sections.flatMap((s) => s.tasks)
  if (all.length === 0) {
    console.log("No tasks.")
    return
  }

  for (const section of sections) {
    if (section.tasks.length === 0) continue
    console.log(`\n${section.title}`)
    console.log("-".repeat(section.title.length))
    printTasks(section.tasks, { json: false, checkbox: options.checkbox })
  }
}

function printHierarchy(areas: Area[], projects: Project[], json: boolean) {
  const area = [...areas].sort((a, b) => a.position - b.position || a.title.localeCompare(b.title))
  const project = [...projects].sort((a, b) => a.position - b.position || a.title.localeCompare(b.title))

  const tree = area.map((item) => ({
    ...item,
    projects: project.filter((row) => row.areaId === item.id),
  }))
  const loose = project.filter((item) => !item.areaId)

  if (json) {
    console.log(
      JSON.stringify(
        {
          areas: tree.map((item) => ({
            id: item.id,
            title: item.title,
            projects: item.projects,
          })),
          unassigned: loose,
        },
        null,
        2,
      ),
    )
    return
  }

  if (project.length === 0) {
    console.log("No projects.")
    return
  }

  for (const item of tree) {
    console.log(item.title)
    if (item.projects.length === 0) {
      console.log("  (no projects)")
      console.log("")
      continue
    }
    for (const row of item.projects) {
      const tag = row.status === "active" ? "" : ` [${row.status}]`
      console.log(`  > ${row.title}${tag}`)
    }
    console.log("")
  }

  if (loose.length === 0) {
    console.log(`${project.length} ${project.length === 1 ? "project" : "projects"}.`)
    return
  }

  console.log("No Area")
  for (const item of loose) {
    const tag = item.status === "active" ? "" : ` [${item.status}]`
    console.log(`  > ${item.title}${tag}`)
  }
  console.log(`\n${project.length} ${project.length === 1 ? "project" : "projects"}.`)
}

// ── Token parsing for `add` ──────────────────────────────────────────────────

type ParsedAdd = {
  title: string
  date: string | undefined
  deadline: string | undefined
  project: string | undefined
  notes: string | undefined
}

type ParsedLogbook = {
  list: string | undefined
  days: number | undefined
  since: string | undefined
}

function parseAdd(words: string[]): ParsedAdd {
  const description: string[] = []
  let date: string | undefined
  let deadline: string | undefined
  let project: string | undefined
  let notes: string | undefined

  for (const word of words) {
    if (word.startsWith("date:")) {
      date = word.slice(5)
    } else if (word.startsWith("deadline:")) {
      deadline = word.slice(9)
    } else if (word.startsWith("project:")) {
      project = word.slice(8)
    } else if (word.startsWith("notes:")) {
      notes = word.slice(6)
    } else {
      description.push(word)
    }
  }

  return {
    title: description.join(" "),
    date,
    deadline,
    project,
    notes,
  }
}

function parseFlag(
  words: string[],
  key: string,
): { value: string | undefined; used: number[]; error: string | undefined } {
  const exact = words.findIndex((word) => word === key)
  const inline = words.findIndex((word) => word.startsWith(`${key}=`))

  if (exact !== -1 && inline !== -1) {
    return { value: undefined, used: [], error: `Error: Duplicate ${key} flag.` }
  }

  if (inline !== -1) {
    const token = words[inline]
    const value = token.slice(key.length + 1).trim()
    if (!value) {
      return { value: undefined, used: [inline], error: `Error: ${key} requires a value.` }
    }
    return { value, used: [inline], error: undefined }
  }

  if (exact === -1) {
    return { value: undefined, used: [], error: undefined }
  }

  const value = words[exact + 1]
  if (!value || value.startsWith("--")) {
    return { value: undefined, used: [exact], error: `Error: ${key} requires a value.` }
  }

  return { value, used: [exact, exact + 1], error: undefined }
}

function parseLogbook(words: string[]): ParsedLogbook {
  const day = parseFlag(words, "--days")
  if (day.error) {
    console.error(day.error)
    process.exit(1)
  }

  const since = parseFlag(words, "--since")
  if (since.error) {
    console.error(since.error)
    process.exit(1)
  }

  const list = parseFlag(words, "--list")
  if (list.error) {
    console.error(list.error)
    process.exit(1)
  }

  if (day.value && since.value) {
    console.error("Error: Use either --days or --since, not both.")
    process.exit(1)
  }

  const dayCount = day.value
    ? (() => {
        const value = Number.parseInt(day.value, 10)
        if (!Number.isFinite(value) || value <= 0) {
          console.error("Error: --days must be a positive integer.")
          process.exit(1)
        }
        return value
      })()
    : undefined

  const sinceDate = since.value
    ? (() => {
        const value = new Date(`${since.value}T00:00:00`)
        if (Number.isNaN(value.getTime())) {
          console.error("Error: --since must be a date like YYYY-MM-DD.")
          process.exit(1)
        }
        return since.value
      })()
    : undefined

  const used = new Set([...day.used, ...since.used, ...list.used])
  const leftover = words.filter((_, index) => !used.has(index))
  const unknown = leftover.find((word) => word.startsWith("--"))
  if (unknown) {
    console.error(`Error: Unknown flag '${unknown}' for logbook.`)
    process.exit(1)
  }

  const positional = leftover.join(" ").trim() || undefined
  if (list.value && positional) {
    console.error("Error: Provide list only once (positional or --list).")
    process.exit(1)
  }

  return {
    list: list.value || positional,
    days: dayCount,
    since: sinceDate,
  }
}

function filterByDate(tasks: ViewTask[], args: ParsedLogbook): ViewTask[] {
  const cutoff = args.days
    ? new Date(Date.now() - args.days * 24 * 60 * 60 * 1000)
    : args.since
      ? new Date(`${args.since}T00:00:00`)
      : null

  if (!cutoff) {
    return tasks
  }

  return tasks.filter((task) => {
    if (!task.completedAt) {
      return false
    }
    return new Date(task.completedAt).getTime() >= cutoff.getTime()
  })
}

// ── Project name resolution ──────────────────────────────────────────────────

async function resolveProject(client: ThingsClient, name: string): Promise<string> {
  const { data, error } = await client.getApiV1Projects()
  if (error || !data) {
    console.error("Error: Could not fetch projects.")
    process.exit(1)
  }
  const match = data.find((p) => p.title.toLowerCase() === name.toLowerCase())
  if (!match) {
    console.error(`Error: Project '${name}' not found.`)
    process.exit(1)
  }
  return match.id
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { apiKey, baseUrl } = await getApiKey()

  const client = apiKey
    ? createClient({
        baseUrl: baseUrl || undefined,
        headers: { Authorization: `Bearer ${apiKey}` },
      })
    : null

  function requireAuth() {
    if (!client) {
      console.error("Not authenticated. Run 'things login' first.")
      console.error("Or set THINGS_API_KEY environment variable.")
      process.exit(1)
    }
    return client
  }

  const args = process.argv.slice(2)
  const command = args[0]

  // Global flags
  const json = args.includes("--json")
  const filtered = args.filter((a) => a !== "--json")

  if (!command || command === "--help" || command === "-h") {
    printHelp()
    return
  }

  if (command === "--version" || command === "-v") {
    console.log("1.0.0")
    return
  }

  // ── Auth commands ────────────────────────────────────────────────────────

  if (command === "login") {
    const url = filtered[1] || baseUrl
    if (!url) {
      console.error("Provide a URL: things login http://localhost:3000")
      process.exit(1)
    }
    const result = await login(url)
    if (result.success) {
      console.log(`Logged in as ${result.email}`)
      console.log(`Credentials saved to ${getCredentialsPath()}`)
    } else {
      console.error(`Login failed: ${result.error}`)
      process.exit(1)
    }
    return
  }

  if (command === "logout") {
    if (!baseUrl) {
      console.error("No base URL configured. Set THINGS_BASE_URL.")
      process.exit(1)
    }
    const result = await logout(baseUrl)
    if (result.success) console.log("Logged out.")
    else {
      console.error(`Logout failed: ${result.error}`)
      process.exit(1)
    }
    return
  }

  if (command === "whoami") {
    if (!baseUrl) {
      console.error("No base URL configured. Set THINGS_BASE_URL.")
      process.exit(1)
    }
    const result = await whoami(baseUrl)
    if (result.email) console.log(result.email)
    else {
      console.error(result.error || "Not logged in.")
      process.exit(1)
    }
    return
  }

  // ── add ──────────────────────────────────────────────────────────────────

  if (command === "add") {
    const c = requireAuth()
    const tokens = filtered.slice(1)
    if (tokens.length === 0) {
      console.error("Usage: things add <description> [date:YYYY-MM-DD] [deadline:YYYY-MM-DD] [project:name]")
      process.exit(1)
    }
    const parsed = parseAdd(tokens)
    if (!parsed.title) {
      console.error("Error: Task description is required.")
      process.exit(1)
    }

    let listId: string | undefined
    if (parsed.project) {
      listId = await resolveProject(c, parsed.project)
    }

    const { data, error } = await c.postApiV1Tasks({
      createTask: {
        title: parsed.title,
        scheduledDate: parsed.date,
        deadline: parsed.deadline,
        notes: parsed.notes,
        listId,
      },
    })
    if (error) {
      console.error("Error:", error)
      process.exit(1)
    }
    if (json) {
      console.log(JSON.stringify(data, null, 2))
    } else {
      console.log(`Created task '${data!.title}'.`)
    }
    return
  }

  // ── done ─────────────────────────────────────────────────────────────────

  if (command === "done") {
    const c = requireAuth()
    const id = filtered[1]
    if (!id) {
      console.error("Usage: things done <id>")
      process.exit(1)
    }
    const { data, error } = await c.postApiV1TasksByIdComplete({
      id,
      completeTask: { completed: true },
    })
    if (error) {
      console.error("Error:", error)
      process.exit(1)
    }
    if (json) {
      console.log(JSON.stringify(data, null, 2))
    } else {
      console.log(`Completed task '${data!.title}'.`)
    }
    return
  }

  // ── delete ───────────────────────────────────────────────────────────────

  if (command === "delete") {
    const c = requireAuth()
    const id = filtered[1]
    if (!id) {
      console.error("Usage: things delete <id>")
      process.exit(1)
    }
    const { error } = await c.deleteApiV1TasksById({ id })
    if (error) {
      console.error("Error:", error)
      process.exit(1)
    }
    if (json) {
      console.log(JSON.stringify({ success: true, id }, null, 2))
    } else {
      console.log("Deleted task.")
    }
    return
  }

  // ── list ─────────────────────────────────────────────────────────────────

  if (command === "list") {
    const c = requireAuth()
    const name = filtered.slice(1).join(" ")
    if (!name) {
      console.error("Usage: things list <project or area name>")
      process.exit(1)
    }

    // Try projects first
    const { data: projects } = await c.getApiV1Projects()
    const project = (projects || []).find((p) => p.title.toLowerCase() === name.toLowerCase())
    if (project) {
      const { data, error } = await c.getApiV1ViewsProjectById({ id: project.id })
      if (error) {
        console.error("Error:", error)
        process.exit(1)
      }
      printSections(data?.sections || [], { json })
      return
    }

    // Then areas
    const { data: areas } = await c.getApiV1Areas()
    const area = (areas || []).find((a) => a.title.toLowerCase() === name.toLowerCase())
    if (area) {
      const { data, error } = await c.getApiV1ViewsAreaById({ id: area.id })
      if (error) {
        console.error("Error:", error)
        process.exit(1)
      }
      printSections(data?.sections || [], { json })
      return
    }

    console.error(`No project or area named '${name}'.`)
    process.exit(1)
  }

  // ── tree ─────────────────────────────────────────────────────────────────

  if (command === "tree") {
    const c = requireAuth()
    const { data: areas, error: areaError } = await c.getApiV1Areas()
    if (areaError) {
      console.error("Error:", areaError)
      process.exit(1)
    }
    const { data: projects, error: projectError } = await c.getApiV1Projects()
    if (projectError) {
      console.error("Error:", projectError)
      process.exit(1)
    }
    printHierarchy(areas || [], projects || [], json)
    return
  }

  // ── View commands ────────────────────────────────────────────────────────

  if (command === "inbox") {
    const c = requireAuth()
    const { data, error } = await c.getApiV1ViewsInbox()
    if (error) {
      console.error("Error:", error)
      process.exit(1)
    }
    printSections(data?.sections || [], { json })
    return
  }

  if (command === "today") {
    const c = requireAuth()
    const { data, error } = await c.getApiV1ViewsToday()
    if (error) {
      console.error("Error:", error)
      process.exit(1)
    }
    printSections(data?.sections || [], { json, checkbox: true })
    return
  }

  if (command === "upcoming") {
    const c = requireAuth()
    const { data, error } = await c.getApiV1ViewsUpcoming()
    if (error) {
      console.error("Error:", error)
      process.exit(1)
    }
    if (json) {
      console.log(JSON.stringify(data?.days || [], null, 2))
      return
    }
    const days = data?.days || []
    if (days.every((d) => d.tasks.length === 0)) {
      console.log("No tasks.")
      return
    }
    for (const day of days) {
      if (day.tasks.length === 0) continue
      console.log(`\n${day.label}`)
      console.log("-".repeat(day.label.length))
      printTasks(day.tasks, { json: false })
    }
    return
  }

  if (command === "anytime") {
    const c = requireAuth()
    const { data, error } = await c.getApiV1ViewsAnytime()
    if (error) {
      console.error("Error:", error)
      process.exit(1)
    }
    printSections(data?.sections || [], { json })
    return
  }

  if (command === "someday") {
    const c = requireAuth()
    const { data, error } = await c.getApiV1ViewsSomeday()
    if (error) {
      console.error("Error:", error)
      process.exit(1)
    }
    printSections(data?.sections || [], { json })
    return
  }

  if (command === "logbook") {
    const c = requireAuth()
    const params = parseLogbook(filtered.slice(1))
    const { data, error } = await c.getApiV1ViewsLogbook()
    if (error) {
      console.error("Error:", error)
      process.exit(1)
    }

    const all = (data?.sections || []).flatMap((section) => section.tasks)
    const byDate = filterByDate(all, params)

    if (!params.list) {
      printSections([{ title: "Logbook", tasks: byDate }], { json })
      return
    }

    const [projectResult, areaResult] = await Promise.all([c.getApiV1Projects(), c.getApiV1Areas()])
    if (projectResult.error) {
      console.error("Error:", projectResult.error)
      process.exit(1)
    }
    if (areaResult.error) {
      console.error("Error:", areaResult.error)
      process.exit(1)
    }

    const projects = projectResult.data || []
    const areas = areaResult.data || []
    const key = params.list.toLowerCase()
    const project = projects.find((item) => item.title.toLowerCase() === key)

    if (project) {
      const tasks = byDate.filter((item) => item.listId === project.id)
      printSections([{ title: `Logbook: ${project.title}`, tasks }], { json })
      return
    }

    const area = areas.find((item) => item.title.toLowerCase() === key)
    if (!area) {
      console.error(`No project or area named '${params.list}'.`)
      process.exit(1)
    }

    const ids = new Set([area.id, ...projects.filter((item) => item.areaId === area.id).map((item) => item.id)])
    const tasks = byDate.filter((item) => (item.listId ? ids.has(item.listId) : false))
    printSections([{ title: `Logbook: ${area.title}`, tasks }], { json })
    return
  }

  if (command === "trash") {
    const c = requireAuth()
    const { data, error } = await c.getApiV1ViewsTrash()
    if (error) {
      console.error("Error:", error)
      process.exit(1)
    }
    printSections(data?.sections || [], { json })
    return
  }

  // ── skill ────────────────────────────────────────────────────────────────

  if (command === "skill") {
    const path = new URL("./SKILL.md", import.meta.url)
    const file = Bun.file(path)
    const content = await file.text()
    console.log(content)
    return
  }

  // ── Unknown command ──────────────────────────────────────────────────────

  console.error(`Unknown command: ${command}`)
  console.error("Run 'things --help' for usage.")
  process.exit(1)
}

// ── Help ─────────────────────────────────────────────────────────────────────

function printHelp() {
  console.log(`things - task management from the command line

Usage:
  things <command> [options]

Commands:
  add <desc> [tokens]   Create a task
  done <id>             Complete a task
  delete <id>           Delete a task
  list <name>           List tasks in a project or area
  tree                  Show areas and nested projects

  today                 Show today's tasks
  inbox                 Show inbox tasks
  upcoming              Show upcoming tasks
  anytime               Show anytime tasks
  someday               Show someday tasks
  logbook [list]        Show completed tasks (filterable)
  trash                 Show trashed tasks

  login [url]           Authenticate with Things
  logout                Sign out
  whoami                Show current user

Flags:
  --json                Output raw JSON (includes IDs and all fields)
  --help, -h            Show this help
  --version, -v         Show version

Logbook filters:
  --days N              Show tasks completed in the last N days
  --since YYYY-MM-DD    Show tasks completed on/after date
  --list Name           Filter to a project or area

Add tokens:
  date:YYYY-MM-DD       Set scheduled date
  deadline:YYYY-MM-DD   Set deadline
  project:Name          Assign to project (by name)
  notes:Text            Add notes

Examples:
  things add Buy milk
  things add Buy eggs date:2025-03-05
  things add Submit report deadline:2025-03-10 project:Work
  things today
  things done tsk_abc123
  things list Work
  things logbook --days 7
  things logbook Work --days 7
  things tree
  things tree --json`)
}

main()
