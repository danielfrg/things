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
  process.stderr.write(`\nThings CLI\n\n`);
  process.stderr.write(`Usage:\n`);

  // Tasks
  process.stderr.write(`\n  Tasks:\n`);
  process.stderr.write(
    `    things tasks list [--status inbox|anytime|someday|scheduled|completed|trashed] [--json]\n`,
  );
  process.stderr.write(`    things tasks get <id> [--json]\n`);
  process.stderr.write(
    `    things tasks add --title "..." [--notes "..."] [--status inbox|anytime|someday|scheduled] [--project-id ID] [--area-id ID] [--scheduled YYYY-MM-DD] [--deadline YYYY-MM-DD] [--json]\n`,
  );
  process.stderr.write(
    `    things tasks update <id> [--title "..."] [--notes "..."] [--status ...] [--project-id ID] [--area-id ID] [--scheduled YYYY-MM-DD] [--deadline YYYY-MM-DD] [--json]\n`,
  );
  process.stderr.write(`    things tasks complete <id>\n`);
  process.stderr.write(`    things tasks reopen <id>\n`);
  process.stderr.write(`    things tasks trash <id>\n`);
  process.stderr.write(`    things tasks restore <id>\n`);
  process.stderr.write(`    things tasks rm <id>\n`);

  // Task Tags
  process.stderr.write(`\n  Task Tags:\n`);
  process.stderr.write(`    things tasks tags <task-id> [--json]\n`);
  process.stderr.write(`    things tasks tag <task-id> <tag-id>\n`);
  process.stderr.write(`    things tasks untag <task-id> <tag-id>\n`);

  // Checklist Items
  process.stderr.write(`\n  Checklist Items:\n`);
  process.stderr.write(`    things checklist list <task-id> [--json]\n`);
  process.stderr.write(
    `    things checklist add <task-id> --title "..." [--completed] [--json]\n`,
  );
  process.stderr.write(
    `    things checklist update <task-id> <item-id> [--title "..."] [--completed|--not-completed] [--json]\n`,
  );
  process.stderr.write(`    things checklist rm <task-id> <item-id>\n`);

  // Projects
  process.stderr.write(`\n  Projects:\n`);
  process.stderr.write(`    things projects list [--json]\n`);
  process.stderr.write(`    things projects get <id> [--json]\n`);
  process.stderr.write(
    `    things projects add --title "..." [--notes "..."] [--area-id ID] [--json]\n`,
  );
  process.stderr.write(
    `    things projects update <id> [--title "..."] [--notes "..."] [--area-id ID] [--json]\n`,
  );
  process.stderr.write(`    things projects rm <id>\n`);

  // Areas
  process.stderr.write(`\n  Areas:\n`);
  process.stderr.write(`    things areas list [--json]\n`);
  process.stderr.write(`    things areas get <id> [--json]\n`);
  process.stderr.write(`    things areas add --title "..." [--json]\n`);
  process.stderr.write(
    `    things areas update <id> [--title "..."] [--json]\n`,
  );
  process.stderr.write(`    things areas rm <id>\n`);

  // Tags
  process.stderr.write(`\n  Tags:\n`);
  process.stderr.write(`    things tags list [--json]\n`);
  process.stderr.write(`    things tags get <id> [--json]\n`);
  process.stderr.write(
    `    things tags add --title "..." [--color red|orange|yellow|green|blue|purple|gray] [--json]\n`,
  );
  process.stderr.write(
    `    things tags update <id> [--title "..."] [--color ...] [--json]\n`,
  );
  process.stderr.write(`    things tags rm <id>\n`);

  // Headings
  process.stderr.write(`\n  Headings:\n`);
  process.stderr.write(`    things headings list [--json]\n`);
  process.stderr.write(`    things headings get <id> [--json]\n`);
  process.stderr.write(
    `    things headings add --title "..." --project-id ID [--backlog] [--json]\n`,
  );
  process.stderr.write(
    `    things headings update <id> [--title "..."] [--backlog|--not-backlog] [--json]\n`,
  );
  process.stderr.write(`    things headings rm <id>\n`);

  // Repeating Rules
  process.stderr.write(`\n  Repeating Rules:\n`);
  process.stderr.write(`    things repeating list [--json]\n`);
  process.stderr.write(`    things repeating get <id> [--json]\n`);
  process.stderr.write(
    `    things repeating add --title "..." --rrule "FREQ=DAILY" --start YYYY-MM-DD [--notes "..."] [--project-id ID] [--area-id ID] [--json]\n`,
  );
  process.stderr.write(
    `    things repeating update <id> [--title "..."] [--rrule "..."] [--start YYYY-MM-DD] [--notes "..."] [--json]\n`,
  );
  process.stderr.write(`    things repeating pause <id>\n`);
  process.stderr.write(`    things repeating resume <id>\n`);
  process.stderr.write(`    things repeating rm <id>\n`);

  process.stderr.write(`\nEnv:\n`);
  process.stderr.write(`  THINGS_API_BASE_URL=http://localhost:3000/api\n`);
  process.stderr.write(`  THINGS_API_KEY=tk_...\n\n`);
  process.exit(exitCode);
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
