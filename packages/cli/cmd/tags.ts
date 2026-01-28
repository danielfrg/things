import type { Argv } from 'yargs';
import {
  deleteV1TagsById,
  getV1Tags,
  getV1TagsById,
  postV1Tags,
  putV1TagsById,
} from '../generated/sdk.gen';
import type { Tag } from '../generated/types.gen';
import { initClient } from '../util/client';
import { formatTagLine } from '../util/format';
import {
  formatError,
  print,
  printJson,
  validateApiResponse,
} from '../util/print';
import { cmd } from './cmd';

export const TagsCommand = cmd({
  command: 'tags <action> [id]',
  describe: 'Manage tags',
  builder: (yargs: Argv) =>
    yargs
      .positional('action', {
        type: 'string',
        describe: 'Action to perform',
        choices: ['list', 'get', 'add', 'update', 'rm'],
      })
      .positional('id', { type: 'string', describe: 'Tag ID' })
      .option('json', { type: 'boolean', describe: 'Output as JSON' })
      .option('title', { type: 'string', describe: 'Tag title' })
      .option('color', {
        type: 'string',
        describe: 'Tag color',
        choices: ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'gray'],
      }),
  handler: async (args) => {
    initClient();
    const { action, id, json: jsonOut } = args;

    if (action === 'list') {
      const { data: tags, error } = await getV1Tags();
      if (error) throw new Error(formatError(error));
      validateApiResponse(tags, 'tags');

      if (jsonOut) return printJson(tags);

      for (const t of tags as Tag[]) {
        print(formatTagLine(t));
      }
      return;
    }

    if (action === 'get') {
      if (!id) throw new Error('Tag ID required');
      const { data: tag, error } = await getV1TagsById({ path: { id } });
      if (error) throw new Error(formatError(error));

      if (jsonOut) return printJson(tag);
      print(formatTagLine(tag));
      return;
    }

    if (action === 'add') {
      if (!args.title) throw new Error('--title required');
      const { data: tag, error } = await postV1Tags({
        body: {
          title: args.title,
          color: args.color,
        },
      });
      if (error) throw new Error(formatError(error));

      return jsonOut ? printJson(tag) : print('Created tag');
    }

    if (action === 'update') {
      if (!id) throw new Error('Tag ID required');
      const { data: tag, error } = await putV1TagsById({
        path: { id },
        body: {
          title: args.title,
          color: args.color,
        },
      });
      if (error) throw new Error(formatError(error));

      return jsonOut ? printJson(tag) : print('Updated tag');
    }

    if (action === 'rm') {
      if (!id) throw new Error('Tag ID required');
      const { data, error } = await deleteV1TagsById({ path: { id } });
      if (error) throw new Error(formatError(error));

      return jsonOut ? printJson(data) : print('Deleted tag');
    }

    throw new Error(`Unknown action: ${action}`);
  },
});
