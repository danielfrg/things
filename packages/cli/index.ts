#!/usr/bin/env bun

declare const THINGS_CLI_VERSION: string | undefined;

import { getConfig } from './config';
import { client } from './generated/client.gen';
import {
  deleteV1AreasById,
  deleteV1HeadingsById,
  deleteV1ProjectsById,
  deleteV1RepeatingRulesById,
  deleteV1TagsById,
  deleteV1TasksById,
  deleteV1TasksByIdPermanent,
  deleteV1TasksByIdTagsByTagId,
  deleteV1TasksByTaskIdChecklistById,
  getV1Areas,
  getV1AreasById,
  getV1Headings,
  getV1HeadingsById,
  getV1Projects,
  getV1ProjectsById,
  getV1RepeatingRules,
  getV1RepeatingRulesById,
  getV1Tags,
  getV1TagsById,
  getV1Tasks,
  getV1TasksById,
  getV1TasksByIdTags,
  getV1TasksByTaskIdChecklist,
  postV1Areas,
  postV1Headings,
  postV1Projects,
  postV1RepeatingRules,
  postV1RepeatingRulesByIdPause,
  postV1RepeatingRulesByIdResume,
  postV1Tags,
  postV1Tasks,
  postV1TasksByIdComplete,
  postV1TasksByIdRestore,
  postV1TasksByIdTagsByTagId,
  postV1TasksByTaskIdChecklist,
  putV1AreasById,
  putV1HeadingsById,
  putV1ProjectsById,
  putV1RepeatingRulesById,
  putV1TagsById,
  putV1TasksById,
  putV1TasksByTaskIdChecklistById,
} from './generated/sdk.gen';
import type {
  Area,
  ChecklistItem,
  Heading,
  Project,
  RepeatingRule,
  Tag,
  Task,
} from './generated/types.gen';

function usage(exitCode = 0): never {
  const help = getHelpText();
  process.stderr.write(help);
  process.exit(exitCode);
}

function getHelpText(): string {
  return `
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
`;
}

function getSkillMarkdown(): string {
  const version =
    typeof THINGS_CLI_VERSION !== 'undefined' ? THINGS_CLI_VERSION : 'dev';
  return `---
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

version: ${version}
---

# Things CLI

Manage tasks, projects, areas, and tags via the Things CLI. Use this for any task management operations.

## Configuration

Before using, ensure these environment variables are set:

\`\`\`bash
export THINGS_API_BASE_URL=http://localhost:3000/api
export THINGS_API_KEY=tk_your_api_key_here
\`\`\`

## Commands

### Tasks - Core task management

\`\`\`bash
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
\`\`\`

**Task Status Values:**
- \`inbox\` - Unprocessed tasks
- \`anytime\` - Tasks without a specific date
- \`someday\` - Tasks for later consideration
- \`scheduled\` - Tasks with a scheduled date
- \`completed\` - Finished tasks
- \`trashed\` - Deleted tasks

### Task Tags - Categorize tasks

\`\`\`bash
# List tags on a task
things tasks tags <task-id> --json

# Add/remove tags
things tasks tag <task-id> <tag-id>
things tasks untag <task-id> <tag-id>
\`\`\`

### Checklists - Subtasks within tasks

\`\`\`bash
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
\`\`\`

### Projects - Group related tasks

\`\`\`bash
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
\`\`\`

### Areas - High-level organization

\`\`\`bash
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
\`\`\`

### Tags - Label and filter tasks

\`\`\`bash
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
\`\`\`

**Tag Colors:** red, orange, yellow, green, blue, purple, gray

### Headings - Sections within projects

\`\`\`bash
# List headings
things headings list --json

# Create a heading
things headings add --title "Phase 1" --project-id <id> --json
things headings add --title "Backlog" --project-id <id> --backlog --json

# Update a heading
things headings update <heading-id> --title "Phase 2" --json

# Delete a heading
things headings rm <heading-id>
\`\`\`

### Repeating Rules - Recurring tasks

\`\`\`bash
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
\`\`\`

## Common Workflows

### Add a task for today
\`\`\`bash
things tasks add --title "Review PR #123" --scheduled $(date +%Y-%m-%d) --json
\`\`\`

### Add a task with a deadline
\`\`\`bash
things tasks add --title "Submit report" --deadline 2024-01-20 --project-id <id> --json
\`\`\`

### Get today's scheduled tasks
\`\`\`bash
things tasks list --status scheduled --json | jq '[.[] | select(.scheduledDate == "'"$(date +%Y-%m-%d)"'")]'
\`\`\`

### Find tasks in a project
\`\`\`bash
PROJECT_ID=$(things projects list --json | jq -r '.[] | select(.title == "My Project") | .id')
things tasks list --json | jq --arg pid "$PROJECT_ID" '[.[] | select(.projectId == $pid)]'
\`\`\`

### Complete multiple tasks
\`\`\`bash
things tasks complete task-id-1
things tasks complete task-id-2
things tasks complete task-id-3
\`\`\`

### Create a project with tasks
\`\`\`bash
# Create project
PROJECT=$(things projects add --title "New Feature" --json)
PROJECT_ID=$(echo "$PROJECT" | jq -r '.id')

# Add tasks to project
things tasks add --title "Design" --project-id "$PROJECT_ID" --json
things tasks add --title "Implement" --project-id "$PROJECT_ID" --json
things tasks add --title "Test" --project-id "$PROJECT_ID" --json
\`\`\`

## Output Format

All \`--json\` output returns structured data. Example task:

\`\`\`json
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
\`\`\`

## Tips

- Always use \`--json\` when parsing output programmatically
- Use \`jq\` to filter and transform JSON output
- Task IDs are required for update/complete/delete operations
- Dates use YYYY-MM-DD format
- RRULE follows iCal specification (RFC 5545)
`;
}

function getFlag(name: string): boolean {
  return process.argv.includes(name);
}

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function requireArg(name: string): string {
  const v = getArg(name);
  if (!v) {
    process.stderr.write(`Missing ${name}\n`);
    usage(1);
  }
  return v;
}

// Formatters
function formatTaskLine(
  task: Task,
  projectTitleById: Map<string, string>,
): string {
  const parts = [task.title];
  if (task.scheduledDate) parts.push(task.scheduledDate);
  else if (task.deadline) parts.push(`due ${task.deadline}`);
  parts.push(
    task.projectId
      ? (projectTitleById.get(task.projectId) ?? 'Unknown')
      : 'No Project',
  );
  parts.push(`[${task.status}]`);
  return parts.join('  ·  ');
}

function formatTaskDetail(task: Task): string {
  const parts = [task.title, `[${task.status}]`];
  if (task.scheduledDate) parts.push(`Scheduled: ${task.scheduledDate}`);
  else if (task.deadline) parts.push(`Deadline: ${task.deadline}`);
  return parts.join('  ·  ');
}

function formatProjectLine(
  project: Project,
  areaTitleById: Map<string, string>,
): string {
  const area = project.areaId
    ? (areaTitleById.get(project.areaId) ?? 'Unknown')
    : 'No Area';
  return [project.title, area, `[${project.status}]`].join('  ·  ');
}

function formatAreaLine(area: Area): string {
  return area.title;
}

function formatTagLine(tag: Tag): string {
  return tag.color ? `${tag.title} (${tag.color})` : tag.title;
}

function formatHeadingLine(
  heading: Heading,
  projectTitleById: Map<string, string>,
): string {
  const project = projectTitleById.get(heading.projectId) ?? 'Unknown';
  const backlog = heading.isBacklog ? ' [backlog]' : '';
  return `${heading.title}  ·  ${project}${backlog}`;
}

function formatRepeatingLine(rule: RepeatingRule): string {
  const parts = [rule.title, rule.rrule, `next: ${rule.nextOccurrence}`];
  if (rule.status === 'paused') parts.push('[paused]');
  return parts.join('  ·  ');
}

function formatChecklistLine(item: ChecklistItem): string {
  const check = item.completed ? '[x]' : '[ ]';
  return `${check} ${item.title}`;
}

function printJson(data: unknown) {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

function formatError(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    if ('error' in error && typeof error.error === 'string') {
      return error.error;
    }
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
    return JSON.stringify(error);
  }
  return String(error);
}

function validateApiResponse(data: unknown, resourceName: string): void {
  if (typeof data === 'string') {
    if (data.includes('<!DOCTYPE html>') || data.includes('<html')) {
      throw new Error(
        [
          `Received HTML instead of JSON from API. This usually means:`,
          `  1. THINGS_API_BASE_URL is incorrect (should end with /api)`,
          `  2. API key is invalid or expired`,
          ``,
          `Current config:`,
          `  THINGS_API_BASE_URL=${process.env.THINGS_API_BASE_URL ?? 'http://localhost:3000/api'}`,
          `  THINGS_API_KEY=${process.env.THINGS_API_KEY ? `${process.env.THINGS_API_KEY.substring(0, 10)}...` : 'not set'}`,
        ].join('\n'),
      );
    }
  }
  if (data === undefined || data === null) {
    throw new Error(`API returned no data for ${resourceName}`);
  }
  if (!Array.isArray(data)) {
    throw new Error(
      `Expected ${resourceName} to be an array, got ${typeof data}`,
    );
  }
}

type TaskStatus = Task['status'];
type RepeatingRuleStatus = RepeatingRule['status'];

async function main() {
  const [resource, action, maybeId, maybeSecondId] = process.argv.slice(2);

  if (!resource || resource === '--help' || resource === '-h') usage(0);

  if (resource === '--version' || resource === '-v') {
    const version =
      typeof THINGS_CLI_VERSION !== 'undefined' ? THINGS_CLI_VERSION : 'dev';
    process.stdout.write(`${version}\n`);
    process.exit(0);
  }

  if (resource === '--skill') {
    process.stdout.write(getSkillMarkdown());
    process.exit(0);
  }

  const jsonOut = getFlag('--json');
  const config = getConfig();

  // Configure the generated client
  client.setConfig({
    baseUrl: config.baseUrl,
    auth: () => config.apiKey,
  });

  try {
    // =========================================================================
    // TASKS
    // =========================================================================
    if (resource === 'tasks') {
      if (action === 'list') {
        const { data: tasks, error } = await getV1Tasks();
        if (error) throw new Error(formatError(error));
        validateApiResponse(tasks, 'tasks');

        if (jsonOut) return printJson(tasks);

        const { data: projects } = await getV1Projects();
        validateApiResponse(projects, 'projects');
        const projectTitleById = new Map(
          (projects as Project[]).map((p) => [p.id, p.title]),
        );

        for (const t of tasks ?? []) {
          process.stdout.write(`${formatTaskLine(t, projectTitleById)}\n`);
        }
        return;
      }

      if (action === 'get') {
        const id = maybeId;
        if (!id) usage(1);
        const { data: task, error } = await getV1TasksById({ path: { id } });
        if (error) throw new Error(formatError(error));

        if (jsonOut) return printJson(task);
        process.stdout.write(`${formatTaskDetail(task)}\n`);
        if (task.notes) process.stdout.write(`\n${task.notes}\n`);
        return;
      }

      if (action === 'add') {
        const title = requireArg('--title');
        const { data: task, error } = await postV1Tasks({
          body: {
            title,
            notes: getArg('--notes'),
            status: getArg('--status') as TaskStatus | undefined,
            projectId: getArg('--project-id'),
            areaId: getArg('--area-id'),
            scheduledDate: getArg('--scheduled'),
            deadline: getArg('--deadline'),
          },
        });
        if (error) throw new Error(formatError(error));

        return jsonOut
          ? printJson(task)
          : process.stdout.write('Created task\n');
      }

      if (action === 'update') {
        const id = maybeId;
        if (!id) usage(1);

        const { data: task, error } = await putV1TasksById({
          path: { id },
          body: {
            title: getArg('--title'),
            notes: getArg('--notes'),
            status: getArg('--status') as TaskStatus | undefined,
            projectId: getArg('--project-id'),
            areaId: getArg('--area-id'),
            scheduledDate: getArg('--scheduled'),
            deadline: getArg('--deadline'),
          },
        });
        if (error) throw new Error(formatError(error));

        return jsonOut
          ? printJson(task)
          : process.stdout.write('Updated task\n');
      }

      if (action === 'complete') {
        const id = maybeId;
        if (!id) usage(1);
        const { data: task, error } = await postV1TasksByIdComplete({
          path: { id },
          body: { completed: true },
        });
        if (error) throw new Error(formatError(error));

        return jsonOut
          ? printJson(task)
          : process.stdout.write('Completed task\n');
      }

      if (action === 'reopen') {
        const id = maybeId;
        if (!id) usage(1);
        const { data: task, error } = await postV1TasksByIdComplete({
          path: { id },
          body: { completed: false },
        });
        if (error) throw new Error(formatError(error));

        return jsonOut
          ? printJson(task)
          : process.stdout.write('Reopened task\n');
      }

      if (action === 'trash') {
        const id = maybeId;
        if (!id) usage(1);
        const { data, error } = await deleteV1TasksById({ path: { id } });
        if (error) throw new Error(formatError(error));

        return jsonOut
          ? printJson(data)
          : process.stdout.write('Trashed task\n');
      }

      if (action === 'restore') {
        const id = maybeId;
        if (!id) usage(1);
        const { data: task, error } = await postV1TasksByIdRestore({
          path: { id },
        });
        if (error) throw new Error(formatError(error));

        return jsonOut
          ? printJson(task)
          : process.stdout.write('Restored task\n');
      }

      if (action === 'rm') {
        const id = maybeId;
        if (!id) usage(1);
        const { data, error } = await deleteV1TasksByIdPermanent({
          path: { id },
        });
        if (error) throw new Error(formatError(error));

        return jsonOut
          ? printJson(data)
          : process.stdout.write('Deleted task\n');
      }

      // Task tags subcommands
      if (action === 'tags') {
        const taskId = maybeId;
        if (!taskId) usage(1);
        const { data: tags, error } = await getV1TasksByIdTags({
          path: { id: taskId },
        });
        if (error) throw new Error(formatError(error));

        if (jsonOut) return printJson(tags);
        for (const t of tags ?? []) {
          process.stdout.write(`${formatTagLine(t)}\n`);
        }
        return;
      }

      if (action === 'tag') {
        const taskId = maybeId;
        const tagId = maybeSecondId;
        if (!taskId || !tagId) usage(1);
        const { data, error } = await postV1TasksByIdTagsByTagId({
          path: { id: taskId, tagId },
        });
        if (error) throw new Error(formatError(error));

        return jsonOut
          ? printJson(data)
          : process.stdout.write('Added tag to task\n');
      }

      if (action === 'untag') {
        const taskId = maybeId;
        const tagId = maybeSecondId;
        if (!taskId || !tagId) usage(1);
        const { data, error } = await deleteV1TasksByIdTagsByTagId({
          path: { id: taskId, tagId },
        });
        if (error) throw new Error(formatError(error));

        return jsonOut
          ? printJson(data)
          : process.stdout.write('Removed tag from task\n');
      }

      usage();
    }

    // =========================================================================
    // CHECKLIST ITEMS
    // =========================================================================
    if (resource === 'checklist') {
      if (action === 'list') {
        const taskId = maybeId;
        if (!taskId) usage(1);
        const { data: items, error } = await getV1TasksByTaskIdChecklist({
          path: { taskId },
        });
        if (error) throw new Error(formatError(error));

        if (jsonOut) return printJson(items);
        for (const item of items ?? []) {
          process.stdout.write(`${formatChecklistLine(item)}\n`);
        }
        return;
      }

      if (action === 'add') {
        const taskId = maybeId;
        if (!taskId) usage(1);
        const title = requireArg('--title');
        const { data: item, error } = await postV1TasksByTaskIdChecklist({
          path: { taskId },
          body: {
            title,
            completed: getFlag('--completed'),
          },
        });
        if (error) throw new Error(formatError(error));

        return jsonOut
          ? printJson(item)
          : process.stdout.write('Created checklist item\n');
      }

      if (action === 'update') {
        const taskId = maybeId;
        const itemId = maybeSecondId;
        if (!taskId || !itemId) usage(1);

        const completed = getFlag('--completed')
          ? true
          : getFlag('--not-completed')
            ? false
            : undefined;

        const { data: item, error } = await putV1TasksByTaskIdChecklistById({
          path: { taskId, id: itemId },
          body: {
            title: getArg('--title'),
            completed,
          },
        });
        if (error) throw new Error(formatError(error));

        return jsonOut
          ? printJson(item)
          : process.stdout.write('Updated checklist item\n');
      }

      if (action === 'rm') {
        const taskId = maybeId;
        const itemId = maybeSecondId;
        if (!taskId || !itemId) usage(1);
        const { data, error } = await deleteV1TasksByTaskIdChecklistById({
          path: { taskId, id: itemId },
        });
        if (error) throw new Error(formatError(error));

        return jsonOut
          ? printJson(data)
          : process.stdout.write('Deleted checklist item\n');
      }

      usage();
    }

    // =========================================================================
    // PROJECTS
    // =========================================================================
    if (resource === 'projects') {
      if (action === 'list') {
        const { data: projects, error } = await getV1Projects();
        if (error) throw new Error(formatError(error));
        validateApiResponse(projects, 'projects');

        if (jsonOut) return printJson(projects);

        const { data: areas } = await getV1Areas();
        validateApiResponse(areas, 'areas');
        const areaTitleById = new Map(
          (areas as Area[]).map((a) => [a.id, a.title]),
        );

        for (const p of projects as Project[]) {
          process.stdout.write(`${formatProjectLine(p, areaTitleById)}\n`);
        }
        return;
      }

      if (action === 'get') {
        const id = maybeId;
        if (!id) usage(1);
        const { data: project, error } = await getV1ProjectsById({
          path: { id },
        });
        if (error) throw new Error(formatError(error));

        if (jsonOut) return printJson(project);
        process.stdout.write(`${project.title}  ·  [${project.status}]\n`);
        if (project.notes) process.stdout.write(`\n${project.notes}\n`);
        return;
      }

      if (action === 'add') {
        const title = requireArg('--title');
        const { data: project, error } = await postV1Projects({
          body: {
            title,
            notes: getArg('--notes'),
            areaId: getArg('--area-id'),
          },
        });
        if (error) throw new Error(formatError(error));

        return jsonOut
          ? printJson(project)
          : process.stdout.write('Created project\n');
      }

      if (action === 'update') {
        const id = maybeId;
        if (!id) usage(1);
        const { data: project, error } = await putV1ProjectsById({
          path: { id },
          body: {
            title: getArg('--title'),
            notes: getArg('--notes'),
            areaId: getArg('--area-id'),
          },
        });
        if (error) throw new Error(formatError(error));

        return jsonOut
          ? printJson(project)
          : process.stdout.write('Updated project\n');
      }

      if (action === 'rm') {
        const id = maybeId;
        if (!id) usage(1);
        const { data, error } = await deleteV1ProjectsById({ path: { id } });
        if (error) throw new Error(formatError(error));

        return jsonOut
          ? printJson(data)
          : process.stdout.write('Deleted project\n');
      }

      usage();
    }

    // =========================================================================
    // AREAS
    // =========================================================================
    if (resource === 'areas') {
      if (action === 'list') {
        const { data: areas, error } = await getV1Areas();
        if (error) throw new Error(formatError(error));
        validateApiResponse(areas, 'areas');

        if (jsonOut) return printJson(areas);

        for (const a of areas as Area[]) {
          process.stdout.write(`${formatAreaLine(a)}\n`);
        }
        return;
      }

      if (action === 'get') {
        const id = maybeId;
        if (!id) usage(1);
        const { data: area, error } = await getV1AreasById({ path: { id } });
        if (error) throw new Error(formatError(error));

        if (jsonOut) return printJson(area);
        process.stdout.write(`${area.title}\n`);
        return;
      }

      if (action === 'add') {
        const title = requireArg('--title');
        const { data: area, error } = await postV1Areas({
          body: { title },
        });
        if (error) throw new Error(formatError(error));

        return jsonOut
          ? printJson(area)
          : process.stdout.write('Created area\n');
      }

      if (action === 'update') {
        const id = maybeId;
        if (!id) usage(1);
        const { data: area, error } = await putV1AreasById({
          path: { id },
          body: { title: getArg('--title') },
        });
        if (error) throw new Error(formatError(error));

        return jsonOut
          ? printJson(area)
          : process.stdout.write('Updated area\n');
      }

      if (action === 'rm') {
        const id = maybeId;
        if (!id) usage(1);
        const { data, error } = await deleteV1AreasById({ path: { id } });
        if (error) throw new Error(formatError(error));

        return jsonOut
          ? printJson(data)
          : process.stdout.write('Deleted area\n');
      }

      usage();
    }

    // =========================================================================
    // TAGS
    // =========================================================================
    if (resource === 'tags') {
      if (action === 'list') {
        const { data: tags, error } = await getV1Tags();
        if (error) throw new Error(formatError(error));
        validateApiResponse(tags, 'tags');

        if (jsonOut) return printJson(tags);

        for (const t of tags as Tag[]) {
          process.stdout.write(`${formatTagLine(t)}\n`);
        }
        return;
      }

      if (action === 'get') {
        const id = maybeId;
        if (!id) usage(1);
        const { data: tag, error } = await getV1TagsById({ path: { id } });
        if (error) throw new Error(formatError(error));

        if (jsonOut) return printJson(tag);
        process.stdout.write(`${formatTagLine(tag)}\n`);
        return;
      }

      if (action === 'add') {
        const title = requireArg('--title');
        const { data: tag, error } = await postV1Tags({
          body: {
            title,
            color: getArg('--color'),
          },
        });
        if (error) throw new Error(formatError(error));

        return jsonOut ? printJson(tag) : process.stdout.write('Created tag\n');
      }

      if (action === 'update') {
        const id = maybeId;
        if (!id) usage(1);
        const { data: tag, error } = await putV1TagsById({
          path: { id },
          body: {
            title: getArg('--title'),
            color: getArg('--color'),
          },
        });
        if (error) throw new Error(formatError(error));

        return jsonOut ? printJson(tag) : process.stdout.write('Updated tag\n');
      }

      if (action === 'rm') {
        const id = maybeId;
        if (!id) usage(1);
        const { data, error } = await deleteV1TagsById({ path: { id } });
        if (error) throw new Error(formatError(error));

        return jsonOut
          ? printJson(data)
          : process.stdout.write('Deleted tag\n');
      }

      usage();
    }

    // =========================================================================
    // HEADINGS
    // =========================================================================
    if (resource === 'headings') {
      if (action === 'list') {
        const { data: headings, error } = await getV1Headings();
        if (error) throw new Error(formatError(error));
        validateApiResponse(headings, 'headings');

        if (jsonOut) return printJson(headings);

        const { data: projects } = await getV1Projects();
        validateApiResponse(projects, 'projects');
        const projectTitleById = new Map(
          (projects as Project[]).map((p) => [p.id, p.title]),
        );

        for (const h of headings as Heading[]) {
          process.stdout.write(`${formatHeadingLine(h, projectTitleById)}\n`);
        }
        return;
      }

      if (action === 'get') {
        const id = maybeId;
        if (!id) usage(1);
        const { data: heading, error } = await getV1HeadingsById({
          path: { id },
        });
        if (error) throw new Error(formatError(error));

        if (jsonOut) return printJson(heading);
        const backlog = heading.isBacklog ? ' [backlog]' : '';
        process.stdout.write(`${heading.title}${backlog}\n`);
        return;
      }

      if (action === 'add') {
        const title = requireArg('--title');
        const projectId = requireArg('--project-id');
        const { data: heading, error } = await postV1Headings({
          body: {
            title,
            projectId,
            isBacklog: getFlag('--backlog'),
          },
        });
        if (error) throw new Error(formatError(error));

        return jsonOut
          ? printJson(heading)
          : process.stdout.write('Created heading\n');
      }

      if (action === 'update') {
        const id = maybeId;
        if (!id) usage(1);

        const isBacklog = getFlag('--backlog')
          ? true
          : getFlag('--not-backlog')
            ? false
            : undefined;

        const { data: heading, error } = await putV1HeadingsById({
          path: { id },
          body: {
            title: getArg('--title'),
            isBacklog,
          },
        });
        if (error) throw new Error(formatError(error));

        return jsonOut
          ? printJson(heading)
          : process.stdout.write('Updated heading\n');
      }

      if (action === 'rm') {
        const id = maybeId;
        if (!id) usage(1);
        const { data, error } = await deleteV1HeadingsById({ path: { id } });
        if (error) throw new Error(formatError(error));

        return jsonOut
          ? printJson(data)
          : process.stdout.write('Deleted heading\n');
      }

      usage();
    }

    // =========================================================================
    // REPEATING RULES
    // =========================================================================
    if (resource === 'repeating') {
      if (action === 'list') {
        const { data: rules, error } = await getV1RepeatingRules();
        if (error) throw new Error(formatError(error));
        validateApiResponse(rules, 'repeating rules');

        if (jsonOut) return printJson(rules);

        for (const r of rules as RepeatingRule[]) {
          process.stdout.write(`${formatRepeatingLine(r)}\n`);
        }
        return;
      }

      if (action === 'get') {
        const id = maybeId;
        if (!id) usage(1);
        const { data: rule, error } = await getV1RepeatingRulesById({
          path: { id },
        });
        if (error) throw new Error(formatError(error));

        if (jsonOut) return printJson(rule);
        process.stdout.write(`${formatRepeatingLine(rule)}\n`);
        if (rule.notes) process.stdout.write(`\n${rule.notes}\n`);
        return;
      }

      if (action === 'add') {
        const title = requireArg('--title');
        const rrule = requireArg('--rrule');
        const nextOccurrence = requireArg('--start');
        const { data: rule, error } = await postV1RepeatingRules({
          body: {
            title,
            rrule,
            nextOccurrence,
            notes: getArg('--notes'),
            status: getArg('--status') as RepeatingRuleStatus | undefined,
            projectId: getArg('--project-id'),
            areaId: getArg('--area-id'),
          },
        });
        if (error) throw new Error(formatError(error));

        return jsonOut
          ? printJson(rule)
          : process.stdout.write('Created repeating rule\n');
      }

      if (action === 'update') {
        const id = maybeId;
        if (!id) usage(1);
        const { data: rule, error } = await putV1RepeatingRulesById({
          path: { id },
          body: {
            title: getArg('--title'),
            rrule: getArg('--rrule'),
            nextOccurrence: getArg('--start'),
            notes: getArg('--notes'),
            projectId: getArg('--project-id'),
            areaId: getArg('--area-id'),
          },
        });
        if (error) throw new Error(formatError(error));

        return jsonOut
          ? printJson(rule)
          : process.stdout.write('Updated repeating rule\n');
      }

      if (action === 'pause') {
        const id = maybeId;
        if (!id) usage(1);
        const { data: rule, error } = await postV1RepeatingRulesByIdPause({
          path: { id },
        });
        if (error) throw new Error(formatError(error));

        return jsonOut
          ? printJson(rule)
          : process.stdout.write('Paused repeating rule\n');
      }

      if (action === 'resume') {
        const id = maybeId;
        if (!id) usage(1);
        const { data: rule, error } = await postV1RepeatingRulesByIdResume({
          path: { id },
        });
        if (error) throw new Error(formatError(error));

        return jsonOut
          ? printJson(rule)
          : process.stdout.write('Resumed repeating rule\n');
      }

      if (action === 'rm') {
        const id = maybeId;
        if (!id) usage(1);
        const { data, error } = await deleteV1RepeatingRulesById({
          path: { id },
        });
        if (error) throw new Error(formatError(error));

        return jsonOut
          ? printJson(data)
          : process.stdout.write('Deleted repeating rule\n');
      }

      usage();
    }

    usage();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Error: ${message}\n`);
    process.exit(1);
  }
}

await main();
