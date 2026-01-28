import type { Argv } from 'yargs';
import { getV1Projects, getV1ViewsAnytime } from '../generated/sdk.gen';
import type { Project } from '../generated/types.gen';
import { initClient } from '../util/client';
import { formatTaskLine } from '../util/format';
import { formatError, print, printJson } from '../util/print';
import { cmd } from './cmd';

export const AnytimeCommand = cmd({
  command: 'anytime',
  describe: 'Show anytime tasks',
  builder: (yargs: Argv) =>
    yargs.option('json', {
      type: 'boolean',
      describe: 'Output as JSON',
    }),
  handler: async (args) => {
    initClient();
    const { data, error } = await getV1ViewsAnytime();
    if (error) throw new Error(formatError(error));

    if (args.json) return printJson(data);

    const { data: projects } = await getV1Projects();
    const projectMap = new Map(
      ((projects as Project[]) ?? []).map((p) => [p.id, p.title]),
    );

    if (!data?.sections?.length) {
      print('No anytime tasks.');
      return;
    }

    for (const section of data.sections) {
      if (section.title) print(`\n${section.title}`);
      for (const task of section.tasks) {
        print(`  ${formatTaskLine(task as any, projectMap)}`);
      }
    }
  },
});
