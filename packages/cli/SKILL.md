---
name: things
description: |
  Things CLI to manage tasks from the command line.

  Use for:
  - Adding tasks with natural tokens (date, deadline, project)
  - Completing and deleting tasks
  - Viewing tasks by view (today, inbox, upcoming, anytime, someday, logbook, trash)
  - Listing all tasks and projects

  The CLI returns plain text by default. Use --json for raw JSON output.

version: 1.0.0
---

# Things CLI

Manage tasks and projects from the command line.

## Tips

- Default output is a clean table without IDs
- Use `--json` to get full JSON output including task IDs and all fields
- Task IDs (e.g. `tsk_abc123`) are needed for `done` and `delete` commands
- Use `things today --json` or `things list <name> --json` to find task IDs
- Dates use YYYY-MM-DD format
- Project and area names are matched case-insensitively
- `things today` shows a checkbox column indicating completion status

## Commands Reference

```
things add <desc> [tokens]   Create a task
things done <id>             Complete a task
things delete <id>           Delete a task
things list <name>           List tasks in a project or area

things today                 Show today's tasks
things inbox                 Show inbox tasks
things upcoming              Show upcoming tasks
things anytime               Show anytime tasks
things someday               Show someday tasks
things logbook               Show completed tasks
things trash                 Show trashed tasks
things projects              List projects

things login [url]           Authenticate with Things
things logout                Sign out
things whoami                Show current user
things skill                 Output AI SKILL.md
```

## Add Tokens

When using `things add`, append tokens after the description:

```
date:YYYY-MM-DD       Set scheduled date
deadline:YYYY-MM-DD   Set deadline
project:Name          Assign to project (by name)
notes:Text            Add notes
```

## Flags

```
--json                Output raw JSON (includes IDs and all fields)
--help, -h            Show help
--version, -v         Show version
```

## Example Usage

```bash
# Log in (opens browser)
things login http://localhost:3000

# Add tasks
things add Buy milk
things add Buy eggs date:2025-03-05
things add Submit report deadline:2025-03-10 project:Work
things add Read docs notes:Chapter3

# View tasks
things today
things upcoming
things list

# List tasks in a project or area
things list Work
things list Personal

# Get task IDs via JSON output
things today --json
things list Work --json

# Complete and delete
things done tsk_abc123
things delete tsk_abc123

# List projects
things projects
things projects --json

# Log out
things logout
```
