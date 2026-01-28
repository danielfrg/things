---
name: things
description: |
  Things CLI manages tasks, projects, areas, and tags for personal productivity.

  USE THINGS FOR:
  - Adding tasks to inbox, today, or scheduled dates
  - Listing and querying tasks by status (inbox, anytime, someday, scheduled, completed, trashed)
  - Organizing tasks into projects and areas
  - Managing checklists within tasks
  - Applying tags to categorize tasks
  - Creating repeating/recurring task templates
  - "add a task", "what's on my list", "show today's tasks", "complete task"

  Always use --json flag when you need to parse output programmatically.
  Returns structured JSON for all list and get operations.

version: dev
---

# Things CLI

Manage tasks, projects, areas, and tags via the Things CLI. Use this for any task management operations.

## Configuration

Before using, ensure these environment variables are set:

```bash
export THINGS_API_BASE_URL=http://localhost:3000/api
export THINGS_API_KEY=tk_your_api_key_here
```

## Commands

### Tasks - Core task management

```bash
# List tasks (use --status to filter)
things tasks list --json
things tasks list --status inbox --json
things tasks list --status scheduled --json
things tasks list --status completed --json

# Get a specific task
things tasks get <task-id> --json

# Add a new task
things tasks add --title "Task title" --json
things tasks add --title "Task title" --notes "Details here" --json
things tasks add --title "Task title" --scheduled 2024-01-15 --json
things tasks add --title "Task title" --deadline 2024-01-20 --json
things tasks add --title "Task title" --status anytime --project-id <id> --json

# Update a task
things tasks update <task-id> --title "New title" --json
things tasks update <task-id> --notes "Updated notes" --json
things tasks update <task-id> --scheduled 2024-01-16 --json
things tasks update <task-id> --status someday --json

# Task lifecycle
things tasks complete <task-id>
things tasks reopen <task-id>
things tasks trash <task-id>
things tasks restore <task-id>
things tasks rm <task-id>
```

**Task Status Values:**
- `inbox` - Unprocessed tasks
- `anytime` - Tasks without a specific date
- `someday` - Tasks for later consideration
- `scheduled` - Tasks with a scheduled date
- `completed` - Finished tasks
- `trashed` - Deleted tasks

### Task Tags - Categorize tasks

```bash
# List tags on a task
things tasks tags <task-id> --json

# Add/remove tags
things tasks tag <task-id> <tag-id>
things tasks untag <task-id> <tag-id>
```

### Checklists - Subtasks within tasks

```bash
# List checklist items
things checklist list <task-id> --json

# Add checklist item
things checklist add <task-id> --title "Step 1" --json
things checklist add <task-id> --title "Step 2" --completed --json

# Update checklist item
things checklist update <task-id> <item-id> --title "Updated step" --json
things checklist update <task-id> <item-id> --completed --json
things checklist update <task-id> <item-id> --not-completed --json

# Remove checklist item
things checklist rm <task-id> <item-id>
```

### Projects - Group related tasks

```bash
# List all projects
things projects list --json

# Get a project
things projects get <project-id> --json

# Create a project
things projects add --title "Project Name" --json
things projects add --title "Project Name" --notes "Description" --area-id <id> --json

# Update a project
things projects update <project-id> --title "New Name" --json

# Delete a project
things projects rm <project-id>
```

### Areas - High-level organization

```bash
# List all areas
things areas list --json

# Get an area
things areas get <area-id> --json

# Create an area
things areas add --title "Work" --json

# Update an area
things areas update <area-id> --title "Personal" --json

# Delete an area
things areas rm <area-id>
```

### Tags - Label and filter tasks

```bash
# List all tags
things tags list --json

# Get a tag
things tags get <tag-id> --json

# Create a tag
things tags add --title "Urgent" --json
things tags add --title "Home" --color green --json

# Update a tag
things tags update <tag-id> --title "Priority" --color red --json

# Delete a tag
things tags rm <tag-id>
```

**Tag Colors:** red, orange, yellow, green, blue, purple, gray

### Headings - Sections within projects

```bash
# List headings
things headings list --json

# Create a heading
things headings add --title "Phase 1" --project-id <id> --json
things headings add --title "Backlog" --project-id <id> --backlog --json

# Update a heading
things headings update <heading-id> --title "Phase 2" --json

# Delete a heading
things headings rm <heading-id>
```

### Repeating Rules - Recurring tasks

```bash
# List repeating rules
things repeating list --json

# Create a repeating rule (uses iCal RRULE format)
things repeating add --title "Daily standup" --rrule "FREQ=DAILY" --start 2024-01-01 --json
things repeating add --title "Weekly review" --rrule "FREQ=WEEKLY;BYDAY=FR" --start 2024-01-05 --json
things repeating add --title "Monthly report" --rrule "FREQ=MONTHLY;BYMONTHDAY=1" --start 2024-01-01 --json

# Update a repeating rule
things repeating update <rule-id> --title "New title" --json
things repeating update <rule-id> --rrule "FREQ=WEEKLY" --json

# Pause/resume
things repeating pause <rule-id>
things repeating resume <rule-id>

# Delete
things repeating rm <rule-id>
```

## Common Workflows

### Add a task for today
```bash
things tasks add --title "Review PR #123" --scheduled $(date +%Y-%m-%d) --json
```

### Add a task with a deadline
```bash
things tasks add --title "Submit report" --deadline 2024-01-20 --project-id <id> --json
```

### Get today's scheduled tasks
```bash
things tasks list --status scheduled --json | jq '[.[] | select(.scheduledDate == "'"$(date +%Y-%m-%d)"'")]'
```

### Find tasks in a project
```bash
PROJECT_ID=$(things projects list --json | jq -r '.[] | select(.title == "My Project") | .id')
things tasks list --json | jq --arg pid "$PROJECT_ID" '[.[] | select(.projectId == $pid)]'
```

### Complete multiple tasks
```bash
things tasks complete task-id-1
things tasks complete task-id-2
things tasks complete task-id-3
```

### Create a project with tasks
```bash
# Create project
PROJECT=$(things projects add --title "New Feature" --json)
PROJECT_ID=$(echo "$PROJECT" | jq -r '.id')

# Add tasks to project
things tasks add --title "Design" --project-id "$PROJECT_ID" --json
things tasks add --title "Implement" --project-id "$PROJECT_ID" --json
things tasks add --title "Test" --project-id "$PROJECT_ID" --json
```

## Output Format

All `--json` output returns structured data. Example task:

```json
{
  "id": "abc123",
  "title": "Review PR",
  "notes": "Check for edge cases",
  "status": "scheduled",
  "scheduledDate": "2024-01-15",
  "deadline": null,
  "projectId": "proj456",
  "areaId": null,
  "position": 1
}
```

## Tips

- Always use `--json` when parsing output programmatically
- Use `jq` to filter and transform JSON output
- Task IDs are required for update/complete/delete operations
- Dates use YYYY-MM-DD format
- RRULE follows iCal specification (RFC 5545)
