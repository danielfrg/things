import type { Argv } from 'yargs';
import {
  deleteV1TasksByTaskIdChecklistById,
  getV1TasksByTaskIdChecklist,
  postV1TasksByTaskIdChecklist,
  putV1TasksByTaskIdChecklistById,
} from '../generated/sdk.gen';
import { initClient } from '../util/client';
import { formatChecklistLine } from '../util/format';
import { formatError, print, printJson } from '../util/print';
import { cmd } from './cmd';

export const ChecklistCommand = cmd({
  command: 'checklist <action> <taskId> [itemId]',
  describe: 'Manage checklist items',
  builder: (yargs: Argv) =>
    yargs
      .positional('action', {
        type: 'string',
        describe: 'Action to perform',
        choices: ['list', 'add', 'update', 'rm'],
      })
      .positional('taskId', {
        type: 'string',
        describe: 'Task ID',
        demandOption: true,
      })
      .positional('itemId', { type: 'string', describe: 'Checklist item ID' })
      .option('json', { type: 'boolean', describe: 'Output as JSON' })
      .option('title', { type: 'string', describe: 'Item title' })
      .option('completed', { type: 'boolean', describe: 'Mark as completed' })
      .option('not-completed', {
        type: 'boolean',
        describe: 'Mark as not completed',
      }),
  handler: async (args) => {
    initClient();
    const { action, taskId, itemId, json: jsonOut } = args;

    if (action === 'list') {
      const { data: items, error } = await getV1TasksByTaskIdChecklist({
        path: { taskId: taskId! },
      });
      if (error) throw new Error(formatError(error));

      if (jsonOut) return printJson(items);

      for (const item of items ?? []) {
        print(formatChecklistLine(item));
      }
      return;
    }

    if (action === 'add') {
      if (!args.title) throw new Error('--title required');
      const { data: item, error } = await postV1TasksByTaskIdChecklist({
        path: { taskId: taskId! },
        body: {
          title: args.title,
          completed: args.completed,
        },
      });
      if (error) throw new Error(formatError(error));

      return jsonOut ? printJson(item) : print('Created checklist item');
    }

    if (action === 'update') {
      if (!itemId) throw new Error('Item ID required');
      const completed = args.completed
        ? true
        : args['not-completed']
          ? false
          : undefined;
      const { data: item, error } = await putV1TasksByTaskIdChecklistById({
        path: { taskId: taskId!, id: itemId },
        body: {
          title: args.title,
          completed,
        },
      });
      if (error) throw new Error(formatError(error));

      return jsonOut ? printJson(item) : print('Updated checklist item');
    }

    if (action === 'rm') {
      if (!itemId) throw new Error('Item ID required');
      const { data, error } = await deleteV1TasksByTaskIdChecklistById({
        path: { taskId: taskId!, id: itemId },
      });
      if (error) throw new Error(formatError(error));

      return jsonOut ? printJson(data) : print('Deleted checklist item');
    }

    throw new Error(`Unknown action: ${action}`);
  },
});
