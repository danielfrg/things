---
name: things-cli
description: Manage tasks, projects, areas, and tags in Things
version: dev
---

## What I do

- Create, read, update, and delete tasks with full metadata (status, dates, notes)
- Organize tasks into projects and areas
- Manage checklists within tasks
- Apply and remove tags from tasks
- Create and manage repeating/recurring tasks
- Output data in JSON format for programmatic use

## When to use me

Use this CLI when you need to:
- Add tasks to your todo list programmatically
- Query existing tasks, projects, or areas
- Bulk update or organize tasks
- Integrate task management into scripts or workflows
- Schedule tasks for specific dates or deadlines

## Configuration

Set these environment variables before use:
- `THINGS_API_BASE_URL` - API endpoint (default: http://localhost:3000/api)
- `THINGS_API_KEY` - Your API key (format: tk_...)

## Command Reference

```
Things CLI

Usage:

  Tasks:
    things tasks list [--status inbox|anytime|someday|scheduled|completed|trashed] [--json]
    things tasks get <id> [--json]
    things tasks add --title "..." [--notes "..."] [--status inbox|anytime|someday|scheduled] [--project-id ID] [--area-id ID] [--scheduled YYYY-MM-DD] [--deadline YYYY-MM-DD] [--json]
    things tasks update <id> [--title "..."] [--notes "..."] [--status ...] [--project-id ID] [--area-id ID] [--scheduled YYYY-MM-DD] [--deadline YYYY-MM-DD] [--json]
    things tasks complete <id>
    things tasks reopen <id>
    things tasks trash <id>
    things tasks restore <id>
    things tasks rm <id>

  Task Tags:
    things tasks tags <task-id> [--json]
    things tasks tag <task-id> <tag-id>
    things tasks untag <task-id> <tag-id>

  Checklist Items:
    things checklist list <task-id> [--json]
    things checklist add <task-id> --title "..." [--completed] [--json]
    things checklist update <task-id> <item-id> [--title "..."] [--completed|--not-completed] [--json]
    things checklist rm <task-id> <item-id>

  Projects:
    things projects list [--json]
    things projects get <id> [--json]
    things projects add --title "..." [--notes "..."] [--area-id ID] [--json]
    things projects update <id> [--title "..."] [--notes "..."] [--area-id ID] [--json]
    things projects rm <id>

  Areas:
    things areas list [--json]
    things areas get <id> [--json]
    things areas add --title "..." [--json]
    things areas update <id> [--title "..."] [--json]
    things areas rm <id>

  Tags:
    things tags list [--json]
    things tags get <id> [--json]
    things tags add --title "..." [--color red|orange|yellow|green|blue|purple|gray] [--json]
    things tags update <id> [--title "..."] [--color ...] [--json]
    things tags rm <id>

  Headings:
    things headings list [--json]
    things headings get <id> [--json]
    things headings add --title "..." --project-id ID [--backlog] [--json]
    things headings update <id> [--title "..."] [--backlog|--not-backlog] [--json]
    things headings rm <id>

  Repeating Rules:
    things repeating list [--json]
    things repeating get <id> [--json]
    things repeating add --title "..." --rrule "FREQ=DAILY" --start YYYY-MM-DD [--notes "..."] [--project-id ID] [--area-id ID] [--json]
    things repeating update <id> [--title "..."] [--rrule "..."] [--start YYYY-MM-DD] [--notes "..."] [--json]
    things repeating pause <id>
    things repeating resume <id>
    things repeating rm <id>

Env:
  THINGS_API_BASE_URL=http://localhost:3000/api
  THINGS_API_KEY=tk_...
```

## Examples

### Add a task for today
```bash
things tasks add --title "Review PR" --scheduled $(date +%Y-%m-%d) --json
```

### List all inbox tasks
```bash
things tasks list --status inbox --json
```

### Complete a task
```bash
things tasks complete <task-id>
```

### Create a project in an area
```bash
things projects add --title "Q1 Goals" --area-id <area-id> --json
```

### Add a checklist item to a task
```bash
things checklist add <task-id> --title "Step 1" --json
```
