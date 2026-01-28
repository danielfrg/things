import type { Argv } from 'yargs';
import { getV1ViewsLogbook } from '../generated/sdk.gen';
import { initClient } from '../util/client';
import { formatTaskLine } from '../util/format';
import { formatError, print, printJson } from '../util/print';
import { cmd } from './cmd';

export const LogbookCommand = cmd({
  command: 'logbook',
  describe: 'Show completed tasks',
  builder: (yargs: Argv) =>
    yargs.option('json', {
      type: 'boolean',
      describe: 'Output as JSON',
    }),
  handler: async (args) => {
    initClient();
    const { data, error } = await getV1ViewsLogbook();
    if (error) throw new Error(formatError(error));

    if (args.json) return printJson(data);

    const tasks = data?.sections?.[0]?.tasks ?? [];
    if (!tasks.length) {
      print('No completed tasks.');
      return;
    }

    const emptyMap = new Map<string, string>();
    for (const task of tasks) {
      print(formatTaskLine(task as any, emptyMap));
    }
  },
});
