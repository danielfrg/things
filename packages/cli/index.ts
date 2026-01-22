#!/usr/bin/env bun

import { getConfig } from './config';
import { client } from './generated/client.gen';
import {
  deleteV1TasksById,
  deleteV1TasksByIdPermanent,
  getV1Areas,
  getV1Projects,
  getV1Tasks,
  getV1TasksById,
  postV1Tasks,
  postV1TasksByIdComplete,
  postV1TasksByIdRestore,
  putV1TasksById,
} from './generated/sdk.gen';
import type { Area, Project, Task } from './generated/types.gen';

function usage(exitCode = 0): never {
  process.stderr.write(`\nThings CLI\n\n`);
  process.stderr.write(`Usage:\n`);
  process.stderr.write(
    `  things tasks list [--status inbox|anytime|someday|scheduled|completed|trashed] [--json]\n`,
  );
  process.stderr.write(`  things tasks get <id> [--json]\n`);
  process.stderr.write(
    `  things tasks add --title "..." [--notes "..."] [--status inbox|anytime|someday|scheduled] [--project-id ID] [--area-id ID] [--scheduled YYYY-MM-DD] [--deadline YYYY-MM-DD] [--json]\n`,
  );
  process.stderr.write(
    `  things tasks update <id> [--title "..."] [--notes "..."] [--status ...] [--project-id ID] [--area-id ID] [--scheduled YYYY-MM-DD] [--deadline YYYY-MM-DD] [--json]\n`,
  );
  process.stderr.write(`  things tasks complete <id>\n`);
  process.stderr.write(`  things tasks reopen <id>\n`);
  process.stderr.write(`  things tasks trash <id>\n`);
  process.stderr.write(`  things tasks restore <id>\n`);
  process.stderr.write(`  things tasks rm <id>\n`);
  process.stderr.write(`\n`);
  process.stderr.write(`  things projects list [--json]\n`);
  process.stderr.write(`  things areas list [--json]\n`);
  process.stderr.write(`\n`);
  process.stderr.write(`Env:\n`);
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

function printJson(data: unknown) {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

type TaskStatus = Task['status'];

async function main() {
  const [resource, action, maybeId] = process.argv.slice(2);

  if (!resource || resource === '--help' || resource === '-h') usage(0);

  const jsonOut = getFlag('--json');
  const config = getConfig();

  // Configure the generated client
  client.setConfig({
    baseUrl: config.baseUrl,
    auth: () => config.apiKey,
  });

  try {
    if (resource === 'tasks') {
      if (action === 'list') {
        const { data: tasks, error } = await getV1Tasks();
        if (error) throw new Error(error.error);

        if (jsonOut) return printJson(tasks);

        const { data: projects } = await getV1Projects();
        const projectTitleById = new Map(
          (projects ?? []).map((p) => [p.id, p.title]),
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
        if (error) throw new Error(error.error);

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
        if (error) throw new Error(error.error);

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
        if (error) throw new Error(error.error);

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
        if (error) throw new Error(error.error);

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
        if (error) throw new Error(error.error);

        return jsonOut
          ? printJson(task)
          : process.stdout.write('Reopened task\n');
      }

      if (action === 'trash') {
        const id = maybeId;
        if (!id) usage(1);
        const { data, error } = await deleteV1TasksById({ path: { id } });
        if (error) throw new Error(error.error);

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
        if (error) throw new Error(error.error);

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
        if (error) throw new Error(error.error);

        return jsonOut
          ? printJson(data)
          : process.stdout.write('Deleted task\n');
      }

      usage();
    }

    if (resource === 'projects') {
      if (action === 'list') {
        const { data: projects, error } = await getV1Projects();
        if (error) throw new Error('Failed to fetch projects');

        if (jsonOut) return printJson(projects);

        const { data: areas } = await getV1Areas();
        const areaTitleById = new Map(
          (areas ?? []).map((a) => [a.id, a.title]),
        );

        for (const p of projects ?? []) {
          process.stdout.write(`${formatProjectLine(p, areaTitleById)}\n`);
        }
        return;
      }
      usage();
    }

    if (resource === 'areas') {
      if (action === 'list') {
        const { data: areas, error } = await getV1Areas();
        if (error) throw new Error('Failed to fetch areas');

        if (jsonOut) return printJson(areas);

        for (const a of areas ?? []) {
          process.stdout.write(`${formatAreaLine(a)}\n`);
        }
        return;
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
