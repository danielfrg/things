import type { Argv } from 'yargs';
import {
  deleteV1TasksById,
  deleteV1TasksByIdPermanent,
  deleteV1TasksByIdTagsByTagId,
  getV1Projects,
  getV1Tasks,
  getV1TasksById,
  getV1TasksByIdTags,
  postV1Tasks,
  postV1TasksByIdComplete,
  postV1TasksByIdRestore,
  postV1TasksByIdTagsByTagId,
  putV1TasksById,
} from '../generated/sdk.gen';
import type { Project, Task } from '../generated/types.gen';
import { initClient } from '../util/client';
import {
  formatTagLine,
  formatTaskDetail,
  formatTaskLine,
} from '../util/format';
import {
  formatError,
  print,
  printJson,
  validateApiResponse,
} from '../util/print';
import { cmd } from './cmd';

type TaskStatus = Task['status'];

export const TasksCommand = cmd({
  command: 'tasks <action> [id] [secondId]',
  describe: 'Manage tasks',
  builder: (yargs: Argv) =>
    yargs
      .positional('action', {
        type: 'string',
        describe: 'Action to perform',
        choices: [
          'list',
          'get',
          'add',
          'update',
          'complete',
          'reopen',
          'trash',
          'restore',
          'rm',
          'tags',
          'tag',
          'untag',
        ],
      })
      .positional('id', {
        type: 'string',
        describe: 'Task ID',
      })
      .positional('secondId', {
        type: 'string',
        describe: 'Second ID (for tag operations)',
      })
      .option('json', { type: 'boolean', describe: 'Output as JSON' })
      .option('title', { type: 'string', describe: 'Task title' })
      .option('notes', { type: 'string', describe: 'Task notes' })
      .option('status', {
        type: 'string',
        describe: 'Task status',
        choices: ['inbox', 'anytime', 'someday', 'scheduled'],
      })
      .option('project-id', { type: 'string', describe: 'Project ID' })
      .option('area-id', { type: 'string', describe: 'Area ID' })
      .option('scheduled', {
        type: 'string',
        describe: 'Scheduled date (YYYY-MM-DD)',
      })
      .option('deadline', {
        type: 'string',
        describe: 'Deadline date (YYYY-MM-DD)',
      }),
  handler: async (args) => {
    initClient();
    const { action, id, secondId, json: jsonOut } = args;

    // LIST
    if (action === 'list') {
      const { data: tasks, error } = await getV1Tasks();
      if (error) throw new Error(formatError(error));
      validateApiResponse(tasks, 'tasks');

      if (jsonOut) return printJson(tasks);

      const { data: projects } = await getV1Projects();
      validateApiResponse(projects, 'projects');
      const projectMap = new Map(
        ((projects as Project[]) ?? []).map((p) => [p.id, p.title]),
      );

      for (const t of tasks ?? []) {
        print(formatTaskLine(t, projectMap));
      }
      return;
    }

    // GET
    if (action === 'get') {
      if (!id) throw new Error('Task ID required');
      const { data: task, error } = await getV1TasksById({ path: { id } });
      if (error) throw new Error(formatError(error));

      if (jsonOut) return printJson(task);
      print(formatTaskDetail(task));
      if (task.notes) print(`\n${task.notes}`);
      return;
    }

    // ADD
    if (action === 'add') {
      if (!args.title) throw new Error('--title required');
      const { data: task, error } = await postV1Tasks({
        body: {
          title: args.title,
          notes: args.notes,
          status: args.status as TaskStatus | undefined,
          projectId: args['project-id'],
          areaId: args['area-id'],
          scheduledDate: args.scheduled,
          deadline: args.deadline,
        },
      });
      if (error) throw new Error(formatError(error));

      return jsonOut ? printJson(task) : print('Created task');
    }

    // UPDATE
    if (action === 'update') {
      if (!id) throw new Error('Task ID required');
      const { data: task, error } = await putV1TasksById({
        path: { id },
        body: {
          title: args.title,
          notes: args.notes,
          status: args.status as TaskStatus | undefined,
          projectId: args['project-id'],
          areaId: args['area-id'],
          scheduledDate: args.scheduled,
          deadline: args.deadline,
        },
      });
      if (error) throw new Error(formatError(error));

      return jsonOut ? printJson(task) : print('Updated task');
    }

    // COMPLETE
    if (action === 'complete') {
      if (!id) throw new Error('Task ID required');
      const { data: task, error } = await postV1TasksByIdComplete({
        path: { id },
        body: { completed: true },
      });
      if (error) throw new Error(formatError(error));

      return jsonOut ? printJson(task) : print('Completed task');
    }

    // REOPEN
    if (action === 'reopen') {
      if (!id) throw new Error('Task ID required');
      const { data: task, error } = await postV1TasksByIdComplete({
        path: { id },
        body: { completed: false },
      });
      if (error) throw new Error(formatError(error));

      return jsonOut ? printJson(task) : print('Reopened task');
    }

    // TRASH
    if (action === 'trash') {
      if (!id) throw new Error('Task ID required');
      const { data, error } = await deleteV1TasksById({ path: { id } });
      if (error) throw new Error(formatError(error));

      return jsonOut ? printJson(data) : print('Trashed task');
    }

    // RESTORE
    if (action === 'restore') {
      if (!id) throw new Error('Task ID required');
      const { data: task, error } = await postV1TasksByIdRestore({
        path: { id },
      });
      if (error) throw new Error(formatError(error));

      return jsonOut ? printJson(task) : print('Restored task');
    }

    // RM (permanent delete)
    if (action === 'rm') {
      if (!id) throw new Error('Task ID required');
      const { data, error } = await deleteV1TasksByIdPermanent({
        path: { id },
      });
      if (error) throw new Error(formatError(error));

      return jsonOut ? printJson(data) : print('Deleted task');
    }

    // TAGS (list tags on task)
    if (action === 'tags') {
      if (!id) throw new Error('Task ID required');
      const { data: tags, error } = await getV1TasksByIdTags({ path: { id } });
      if (error) throw new Error(formatError(error));

      if (jsonOut) return printJson(tags);
      for (const t of tags ?? []) {
        print(formatTagLine(t));
      }
      return;
    }

    // TAG (add tag to task)
    if (action === 'tag') {
      if (!id || !secondId) throw new Error('Task ID and Tag ID required');
      const { data, error } = await postV1TasksByIdTagsByTagId({
        path: { id, tagId: secondId },
      });
      if (error) throw new Error(formatError(error));

      return jsonOut ? printJson(data) : print('Added tag to task');
    }

    // UNTAG (remove tag from task)
    if (action === 'untag') {
      if (!id || !secondId) throw new Error('Task ID and Tag ID required');
      const { data, error } = await deleteV1TasksByIdTagsByTagId({
        path: { id, tagId: secondId },
      });
      if (error) throw new Error(formatError(error));

      return jsonOut ? printJson(data) : print('Removed tag from task');
    }

    throw new Error(`Unknown action: ${action}`);
  },
});
