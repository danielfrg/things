#!/usr/bin/env bun
import { createClient } from "@things/sdk"
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { login, logout, whoami } from "./src/auth"
import { getCredentials, getCredentialsPath } from "./src/config"

// Get API key from env var or config file
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
    // Env var overrides stored baseUrl (useful for development)
    return { apiKey: creds.apiKey, baseUrl: envUrl || creds.baseUrl }
  }

  return { apiKey: null, baseUrl: envUrl || null }
}

// Helper to format output
function formatTask(task: any) {
  if (!task) return "[No task data]"
  const parts = [
    task.id ? `[${task.id}]` : "[no-id]",
    task.title || "(no title)",
    task.status ? `(${task.status})` : "",
    task.scheduledDate ? `Scheduled: ${task.scheduledDate}` : "",
    task.deadline ? `Deadline: ${task.deadline}` : "",
  ]
  return parts.filter(Boolean).join(" ")
}

function formatProject(project: any) {
  if (!project) return "[No project data]"
  return `[${project.id || "no-id"}] ${project.title || "(no title)"} (${project.status || "unknown"})`
}

async function main() {
  const { apiKey, baseUrl } = await getApiKey()

  // Create client (may be null if not authenticated)
  // SDK paths include /api prefix, so baseUrl should be the root server URL
  const client = apiKey
    ? createClient({
        baseUrl: baseUrl || undefined,
        headers: { Authorization: `Bearer ${apiKey}` },
      })
    : null

  // Helper to ensure client exists
  function requireAuth() {
    if (!client) {
      console.error("Error: Not authenticated. Run 'things login' first.")
      console.error(`Or set THINGS_API_KEY environment variable.`)
      process.exit(1)
    }
    return client
  }

  yargs(hideBin(process.argv))
    .scriptName("things")
    .command(
      "login [url]",
      "Authenticate with Things",
      (yargs) => {
        return yargs.positional("url", {
          type: "string",
          describe: "Base URL of the Things server (e.g., http://localhost:3000)",
        })
      },
      async (args) => {
        const loginUrl = args.url || baseUrl
        if (!loginUrl) {
          console.error("Error: No base URL provided.")
          console.error("Either set THINGS_BASE_URL environment variable or provide URL as argument:")
          console.error("  things login http://localhost:3000")
          process.exit(1)
        }
        const result = await login(loginUrl)
        if (result.success) {
          console.log(`\n✓ Logged in as ${result.email}`)
          console.log(`  Credentials saved to ${getCredentialsPath()}`)
        } else {
          console.error(`\n✗ Login failed: ${result.error}`)
          process.exit(1)
        }
      },
    )
    .command(
      "logout",
      "Sign out and remove saved credentials",
      () => {},
      async () => {
        if (!baseUrl) {
          console.error("Error: No base URL configured")
          console.error("Set THINGS_BASE_URL environment variable")
          process.exit(1)
        }
        const result = await logout(baseUrl)
        if (result.success) {
          console.log("✓ Logged out successfully")
        } else {
          console.error(`✗ Logout failed: ${result.error}`)
          process.exit(1)
        }
      },
    )
    .command(
      "whoami",
      "Show current authenticated user",
      () => {},
      async () => {
        if (!baseUrl) {
          console.error("Error: No base URL configured")
          console.error("Set THINGS_BASE_URL environment variable")
          process.exit(1)
        }
        const result = await whoami(baseUrl)
        if (result.email) {
          console.log(result.email)
        } else {
          console.error(result.error || "Not logged in")
          process.exit(1)
        }
      },
    )
    .command(
      "today",
      "Show today's tasks",
      () => {},
      async () => {
        const c = requireAuth()
        const { data, error } = await c.getApiV1ViewsToday()
        if (error) {
          console.error("Error:", error)
          process.exit(1)
        }
        console.log("Today")
        console.log("─".repeat(50))
        if (!data) {
          console.log("No data returned")
          return
        }
        if (!data.sections || data.sections.length === 0) {
          console.log("No sections found")
          return
        }
        for (const section of data.sections) {
          if (section.tasks?.length) {
            console.log(`\n${section.title}:`)
            for (const task of section.tasks) {
              console.log(`  ${formatTask(task)}`)
            }
          }
        }
      },
    )
    .command(
      "upcoming",
      "Show upcoming tasks",
      () => {},
      async () => {
        const c = requireAuth()
        const { data, error } = await c.getApiV1ViewsUpcoming()
        if (error) {
          console.error("Error:", error)
          process.exit(1)
        }
        console.log("Upcoming")
        console.log("─".repeat(50))
        for (const day of data?.days || []) {
          if (day.tasks?.length) {
            console.log(`\n${day.label}:`)
            for (const task of day.tasks) {
              console.log(`  ${formatTask(task)}`)
            }
          }
        }
      },
    )
    .command(
      "anytime",
      "Show anytime tasks",
      () => {},
      async () => {
        const c = requireAuth()
        const { data, error } = await c.getApiV1ViewsAnytime()
        if (error) {
          console.error("Error:", error)
          process.exit(1)
        }
        console.log("Anytime")
        console.log("─".repeat(50))
        for (const section of data?.sections || []) {
          if (section.tasks?.length) {
            console.log(`\n${section.title}:`)
            for (const task of section.tasks) {
              console.log(`  ${formatTask(task)}`)
            }
          }
        }
      },
    )
    .command(
      "someday",
      "Show someday tasks",
      () => {},
      async () => {
        const c = requireAuth()
        const { data, error } = await c.getApiV1ViewsSomeday()
        if (error) {
          console.error("Error:", error)
          process.exit(1)
        }
        console.log("Someday")
        console.log("─".repeat(50))
        for (const section of data?.sections || []) {
          if (section.tasks?.length) {
            console.log(`\n${section.title}:`)
            for (const task of section.tasks) {
              console.log(`  ${formatTask(task)}`)
            }
          }
        }
      },
    )
    .command(
      "tasks",
      "Manage tasks",
      (yargs) => {
        return yargs
          .command(
            "list",
            "List all tasks",
            () => {},
            async () => {
              const c = requireAuth()
              const { data, error } = await c.getApiV1Tasks()
              if (error) {
                console.error("Error:", error)
                process.exit(1)
              }
              console.log("Tasks")
              console.log("─".repeat(50))
              if (!data || data.length === 0) {
                console.log("No tasks found")
                return
              }
              for (const task of data) {
                console.log(formatTask(task))
              }
            },
          )
          .command(
            "create <title>",
            "Create a new task",
            (yargs) => {
              return yargs
                .positional("title", { type: "string", demandOption: true })
                .option("notes", { type: "string", describe: "Task notes" })
                .option("scheduled", {
                  type: "string",
                  describe: "Scheduled date (YYYY-MM-DD)",
                })
                .option("deadline", {
                  type: "string",
                  describe: "Deadline (YYYY-MM-DD)",
                })
                .option("project", { type: "string", describe: "Project ID" })
            },
            async (args) => {
              const c = requireAuth()
              const { data, error } = await c.postApiV1Tasks({
                createTask: {
                  title: args.title!,
                  notes: args.notes || undefined,
                  scheduledDate: args.scheduled || undefined,
                  deadline: args.deadline || undefined,
                  listId: args.project || undefined,
                },
              })
              if (error) {
                console.error("Error:", error)
                process.exit(1)
              }
              console.log("Task created:", formatTask(data))
            },
          )
          .command(
            "update <id>",
            "Update a task",
            (yargs) => {
              return yargs
                .positional("id", { type: "string", demandOption: true })
                .option("title", { type: "string", describe: "New title" })
                .option("notes", { type: "string", describe: "New notes" })
                .option("scheduled", {
                  type: "string",
                  describe: "Scheduled date (YYYY-MM-DD)",
                })
                .option("deadline", {
                  type: "string",
                  describe: "Deadline (YYYY-MM-DD)",
                })
                .option("status", {
                  type: "string",
                  choices: ["inbox", "anytime", "someday", "completed"],
                  describe: "Task status",
                })
            },
            async (args) => {
              const c = requireAuth()
              const { data, error } = await c.putApiV1TasksById({
                id: args.id!,
                updateTask: {
                  title: args.title,
                  notes: args.notes,
                  scheduledDate: args.scheduled,
                  deadline: args.deadline,
                  status: args.status as any,
                },
              })
              if (error) {
                console.error("Error:", error)
                process.exit(1)
              }
              console.log("Task updated:", formatTask(data))
            },
          )
          .command(
            "delete <id>",
            "Delete a task",
            (yargs) => {
              return yargs.positional("id", {
                type: "string",
                demandOption: true,
              })
            },
            async (args) => {
              const c = requireAuth()
              const { error } = await c.deleteApiV1TasksById({
                id: args.id!,
              })
              if (error) {
                console.error("Error:", error)
                process.exit(1)
              }
              console.log("Task deleted")
            },
          )
          .command(
            "complete <id>",
            "Complete a task",
            (yargs) => {
              return yargs.positional("id", {
                type: "string",
                demandOption: true,
              })
            },
            async (args) => {
              const c = requireAuth()
              const { data, error } = await c.postApiV1TasksByIdComplete({
                id: args.id!,
                completeTask: {
                  completed: true,
                },
              })
              if (error) {
                console.error("Error:", error)
                process.exit(1)
              }
              console.log("Task completed:", formatTask(data))
            },
          )
          .demandCommand()
      },
      () => {},
    )
    .command(
      "projects",
      "Manage projects",
      (yargs) => {
        return yargs
          .command(
            "list",
            "List all projects",
            () => {},
            async () => {
              const c = requireAuth()
              const { data, error } = await c.getApiV1Projects()
              if (error) {
                console.error("Error:", error)
                process.exit(1)
              }
              console.log("Projects")
              console.log("─".repeat(50))
              for (const project of data || []) {
                console.log(formatProject(project))
              }
            },
          )
          .command(
            "create <title>",
            "Create a new project",
            (yargs) => {
              return yargs
                .positional("title", { type: "string", demandOption: true })
                .option("notes", { type: "string", describe: "Project notes" })
                .option("area", { type: "string", describe: "Area ID" })
            },
            async (args) => {
              const c = requireAuth()
              const { data, error } = await c.postApiV1Projects({
                createProject: {
                  title: args.title!,
                  notes: args.notes || undefined,
                  areaId: args.area || undefined,
                },
              })
              if (error) {
                console.error("Error:", error)
                process.exit(1)
              }
              console.log("Project created:", formatProject(data))
            },
          )
          .command(
            "update <id>",
            "Update a project",
            (yargs) => {
              return yargs
                .positional("id", { type: "string", demandOption: true })
                .option("title", { type: "string", describe: "New title" })
                .option("notes", { type: "string", describe: "New notes" })
                .option("status", {
                  type: "string",
                  choices: ["active", "completed", "trashed"],
                  describe: "Project status",
                })
            },
            async (args) => {
              const c = requireAuth()
              const { data, error } = await c.putApiV1ProjectsById({
                id: args.id!,
                updateProject: {
                  title: args.title,
                  notes: args.notes,
                  status: args.status as any,
                },
              })
              if (error) {
                console.error("Error:", error)
                process.exit(1)
              }
              console.log("Project updated:", formatProject(data))
            },
          )
          .command(
            "delete <id>",
            "Delete a project",
            (yargs) => {
              return yargs.positional("id", {
                type: "string",
                demandOption: true,
              })
            },
            async (args) => {
              const c = requireAuth()
              const { error } = await c.deleteApiV1ProjectsById({
                id: args.id!,
              })
              if (error) {
                console.error("Error:", error)
                process.exit(1)
              }
              console.log("Project deleted")
            },
          )
          .demandCommand()
      },
      () => {},
    )
    .command(
      "skill",
      "Output CLI documentation for SKILL.md",
      () => {},
      async () => {
        const path = new URL("./SKILL.md", import.meta.url)
        const file = Bun.file(path)
        const content = await file.text()
        console.log(content)
      },
    )
    .demandCommand()
    .help()
    .alias("help", "h")
    .version("1.0.0")
    .alias("version", "v")
    .parse()
}

main()
