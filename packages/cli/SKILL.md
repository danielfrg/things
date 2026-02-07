---
name: things
description: |
  Things CLI to manages tasks

  Use for:
  - Viewing today's tasks, upcoming tasks, anytime tasks, or someday tasks
  - Creating, updating, completing, and deleting tasks
  - Managing projects (create, update, delete, list)
  - Task queries like 'what's on my list today', 'show upcoming tasks'

  The CLI returns plain text output suitable for terminal display.

version: 1.0.0
---

# Things CLI

Manage tasks and projects via the Things CLI.

## Tips

- Task and project IDs are shown in brackets [id] in list outputs
- Dates use YYYY-MM-DD format
- View commands (today, upcoming, anytime, someday) show tasks grouped by section
- Task statuses: inbox, anytime, someday, completed
- Project statuses: active, completed, trashed
- Use 'things skill > SKILL.md' to regenerate documentation

## Commands Reference

### Main Commands

```
things today     Show today's tasks
things upcoming  Show upcoming tasks
things anytime   Show anytime tasks
things someday   Show someday tasks
things tasks     Manage tasks
things projects  Manage projects
things skill     Output AI SKILL.md
```

### Tasks Commands

```
things tasks list            List all tasks
things tasks create <title>  Create a new task
things tasks update <id>     Update a task
things tasks delete <id>     Delete a task
things tasks complete <id>   Complete a task

Options for 'tasks create':
  positional: title     Task title
  --notes <text>        Task notes
  --scheduled <date>    Scheduled date (YYYY-MM-DD)
  --deadline <date>     Deadline (YYYY-MM-DD)
  --project <id>        Project ID

Options for 'tasks update':
  positional: id        Task ID
  --title <text>        New title
  --notes <text>        New notes
  --scheduled <date>    Scheduled date (YYYY-MM-DD)
  --deadline <date>     Deadline (YYYY-MM-DD)
  --status <status>     Task status (inbox, anytime, someday, completed)
```

### Projects Commands

```
things projects list            List all projects
things projects create <title>  Create a new project
things projects update <id>     Update a project
things projects delete <id>     Delete a project

Options for 'projects create':
  --notes <text>  Project notes
  --area <id>     Area ID

Options for 'projects update':
  --title <text>    New title
  --notes <text>    New notes
  --status <status> Project status (active, completed, trashed)
```

## Example Usage

```bash
# Log in (opens browser)
things login

# View today's tasks
things today

# Create a task
things tasks create 'Review PR #123' --scheduled 2024-01-15

# Create a task with notes and deadline
things tasks create 'Submit report' --notes 'Q4 summary' --deadline 2024-01-20

# List all tasks
things tasks list

# Complete a task
things tasks complete abc123

# Create a project
things projects create 'Website Redesign' --notes 'New landing page'

# Update a task
things tasks update abc123 --title 'Updated title' --status anytime

# Log out
things logout
```
