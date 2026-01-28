import type { Argv } from 'yargs';
import { getV1Projects, getV1ViewsUpcoming } from '../generated/sdk.gen';
import type { Project } from '../generated/types.gen';
import { initClient } from '../util/client';
import { formatTaskLine } from '../util/format';
import { formatError, print, printJson } from '../util/print';
import { cmd } from './cmd';

export const UpcomingCommand = cmd({
  command: 'upcoming',
  describe: 'Show upcoming tasks (next 7 days + later)',
  builder: (yargs: Argv) =>
    yargs.option('json', {
      type: 'boolean',
      describe: 'Output as JSON',
    }),
  handler: async (args) => {
    initClient();
    const { data, error } = await getV1ViewsUpcoming();
    if (error) throw new Error(formatError(error));

    if (args.json) return printJson(data);

    const { data: projects } = await getV1Projects();
    const projectMap = new Map(
      ((projects as Project[]) ?? []).map((p) => [p.id, p.title]),
    );

    if (!data?.days?.length) {
      print('No upcoming tasks.');
      return;
    }

    for (const day of data.days) {
      print(`\n${day.label}${day.date ? ` (${day.date})` : ''}`);
      for (const task of day.tasks) {
        print(`  ${formatTaskLine(task as any, projectMap)}`);
      }
      for (const template of day.templates) {
        print(`  [repeating] ${template.title}`);
      }
    }
  },
});
