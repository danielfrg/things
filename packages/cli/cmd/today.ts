import type { Argv } from 'yargs';
import { getV1Projects, getV1ViewsToday } from '../generated/sdk.gen';
import type { Project } from '../generated/types.gen';
import { debugConfig, initClient } from '../util/client';
import { formatTaskLine } from '../util/format';
import {
  formatError,
  print,
  printJson,
  validateApiResponse,
} from '../util/print';
import { cmd } from './cmd';

export const TodayCommand = cmd({
  command: 'today',
  describe: "Show today's tasks (scheduled today, overdue, deadlines)",
  builder: (yargs: Argv) =>
    yargs
      .option('json', {
        type: 'boolean',
        describe: 'Output as JSON',
      })
      .option('debug', {
        type: 'boolean',
        describe: 'Show debug info',
      }),
  handler: async (args) => {
    initClient();

    if (args.debug) {
      print(`Config: ${JSON.stringify(debugConfig(), null, 2)}`);
    }

    const { data, error } = await getV1ViewsToday();
    if (error) throw new Error(formatError(error));

    validateApiResponse(data, 'today view');

    if (args.json) return printJson(data);

    const { data: projects, error: projectsError } = await getV1Projects();
    if (projectsError) throw new Error(formatError(projectsError));

    const projectMap = new Map(
      ((projects as Project[]) ?? []).map((p) => [p.id, p.title]),
    );

    if (!data?.sections?.length) {
      print('No tasks for today.');
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
