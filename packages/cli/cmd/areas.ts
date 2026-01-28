import type { Argv } from 'yargs';
import {
  deleteV1AreasById,
  getV1Areas,
  getV1AreasById,
  postV1Areas,
  putV1AreasById,
} from '../generated/sdk.gen';
import type { Area } from '../generated/types.gen';
import { initClient } from '../util/client';
import { formatAreaLine } from '../util/format';
import {
  formatError,
  print,
  printJson,
  validateApiResponse,
} from '../util/print';
import { cmd } from './cmd';

export const AreasCommand = cmd({
  command: 'areas <action> [id]',
  describe: 'Manage areas',
  builder: (yargs: Argv) =>
    yargs
      .positional('action', {
        type: 'string',
        describe: 'Action to perform',
        choices: ['list', 'get', 'add', 'update', 'rm'],
      })
      .positional('id', { type: 'string', describe: 'Area ID' })
      .option('json', { type: 'boolean', describe: 'Output as JSON' })
      .option('title', { type: 'string', describe: 'Area title' }),
  handler: async (args) => {
    initClient();
    const { action, id, json: jsonOut } = args;

    if (action === 'list') {
      const { data: areas, error } = await getV1Areas();
      if (error) throw new Error(formatError(error));
      validateApiResponse(areas, 'areas');

      if (jsonOut) return printJson(areas);

      for (const a of areas as Area[]) {
        print(formatAreaLine(a));
      }
      return;
    }

    if (action === 'get') {
      if (!id) throw new Error('Area ID required');
      const { data: area, error } = await getV1AreasById({ path: { id } });
      if (error) throw new Error(formatError(error));

      if (jsonOut) return printJson(area);
      print(area.title);
      return;
    }

    if (action === 'add') {
      if (!args.title) throw new Error('--title required');
      const { data: area, error } = await postV1Areas({
        body: { title: args.title },
      });
      if (error) throw new Error(formatError(error));

      return jsonOut ? printJson(area) : print('Created area');
    }

    if (action === 'update') {
      if (!id) throw new Error('Area ID required');
      const { data: area, error } = await putV1AreasById({
        path: { id },
        body: { title: args.title },
      });
      if (error) throw new Error(formatError(error));

      return jsonOut ? printJson(area) : print('Updated area');
    }

    if (action === 'rm') {
      if (!id) throw new Error('Area ID required');
      const { data, error } = await deleteV1AreasById({ path: { id } });
      if (error) throw new Error(formatError(error));

      return jsonOut ? printJson(data) : print('Deleted area');
    }

    throw new Error(`Unknown action: ${action}`);
  },
});
