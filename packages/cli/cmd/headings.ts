import type { Argv } from 'yargs';
import {
  deleteV1HeadingsById,
  getV1Headings,
  getV1HeadingsById,
  getV1Projects,
  postV1Headings,
  putV1HeadingsById,
} from '../generated/sdk.gen';
import type { Heading, Project } from '../generated/types.gen';
import { initClient } from '../util/client';
import { formatHeadingLine } from '../util/format';
import {
  formatError,
  print,
  printJson,
  validateApiResponse,
} from '../util/print';
import { cmd } from './cmd';

export const HeadingsCommand = cmd({
  command: 'headings <action> [id]',
  describe: 'Manage project headings',
  builder: (yargs: Argv) =>
    yargs
      .positional('action', {
        type: 'string',
        describe: 'Action to perform',
        choices: ['list', 'get', 'add', 'update', 'rm'],
      })
      .positional('id', { type: 'string', describe: 'Heading ID' })
      .option('json', { type: 'boolean', describe: 'Output as JSON' })
      .option('title', { type: 'string', describe: 'Heading title' })
      .option('project-id', {
        type: 'string',
        describe: 'Project ID (required for add)',
      })
      .option('backlog', {
        type: 'boolean',
        describe: 'Mark as backlog section',
      })
      .option('not-backlog', {
        type: 'boolean',
        describe: 'Unmark as backlog section',
      }),
  handler: async (args) => {
    initClient();
    const { action, id, json: jsonOut } = args;

    if (action === 'list') {
      const { data: headings, error } = await getV1Headings();
      if (error) throw new Error(formatError(error));
      validateApiResponse(headings, 'headings');

      if (jsonOut) return printJson(headings);

      const { data: projects } = await getV1Projects();
      validateApiResponse(projects, 'projects');
      const projectMap = new Map(
        ((projects as Project[]) ?? []).map((p) => [p.id, p.title]),
      );

      for (const h of headings as Heading[]) {
        print(formatHeadingLine(h, projectMap));
      }
      return;
    }

    if (action === 'get') {
      if (!id) throw new Error('Heading ID required');
      const { data: heading, error } = await getV1HeadingsById({
        path: { id },
      });
      if (error) throw new Error(formatError(error));

      if (jsonOut) return printJson(heading);
      const backlog = heading.isBacklog ? ' [backlog]' : '';
      print(`${heading.title}${backlog}`);
      return;
    }

    if (action === 'add') {
      if (!args.title) throw new Error('--title required');
      if (!args['project-id']) throw new Error('--project-id required');
      const { data: heading, error } = await postV1Headings({
        body: {
          title: args.title,
          projectId: args['project-id'],
          isBacklog: args.backlog,
        },
      });
      if (error) throw new Error(formatError(error));

      return jsonOut ? printJson(heading) : print('Created heading');
    }

    if (action === 'update') {
      if (!id) throw new Error('Heading ID required');
      const isBacklog = args.backlog
        ? true
        : args['not-backlog']
          ? false
          : undefined;
      const { data: heading, error } = await putV1HeadingsById({
        path: { id },
        body: {
          title: args.title,
          isBacklog,
        },
      });
      if (error) throw new Error(formatError(error));

      return jsonOut ? printJson(heading) : print('Updated heading');
    }

    if (action === 'rm') {
      if (!id) throw new Error('Heading ID required');
      const { data, error } = await deleteV1HeadingsById({ path: { id } });
      if (error) throw new Error(formatError(error));

      return jsonOut ? printJson(data) : print('Deleted heading');
    }

    throw new Error(`Unknown action: ${action}`);
  },
});
