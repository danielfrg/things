import type { Argv } from 'yargs';
import {
  deleteV1ProjectsById,
  getV1Areas,
  getV1Projects,
  getV1ProjectsById,
  postV1Projects,
  putV1ProjectsById,
} from '../generated/sdk.gen';
import type { Area, Project } from '../generated/types.gen';
import { initClient } from '../util/client';
import { formatProjectLine } from '../util/format';
import {
  formatError,
  print,
  printJson,
  validateApiResponse,
} from '../util/print';
import { cmd } from './cmd';

export const ProjectsCommand = cmd({
  command: 'projects <action> [id]',
  describe: 'Manage projects',
  builder: (yargs: Argv) =>
    yargs
      .positional('action', {
        type: 'string',
        describe: 'Action to perform',
        choices: ['list', 'get', 'add', 'update', 'rm'],
      })
      .positional('id', { type: 'string', describe: 'Project ID' })
      .option('json', { type: 'boolean', describe: 'Output as JSON' })
      .option('title', { type: 'string', describe: 'Project title' })
      .option('notes', { type: 'string', describe: 'Project notes' })
      .option('area-id', { type: 'string', describe: 'Area ID' }),
  handler: async (args) => {
    initClient();
    const { action, id, json: jsonOut } = args;

    if (action === 'list') {
      const { data: projects, error } = await getV1Projects();
      if (error) throw new Error(formatError(error));
      validateApiResponse(projects, 'projects');

      if (jsonOut) return printJson(projects);

      const { data: areas } = await getV1Areas();
      validateApiResponse(areas, 'areas');
      const areaMap = new Map(
        ((areas as Area[]) ?? []).map((a) => [a.id, a.title]),
      );

      for (const p of projects as Project[]) {
        print(formatProjectLine(p, areaMap));
      }
      return;
    }

    if (action === 'get') {
      if (!id) throw new Error('Project ID required');
      const { data: project, error } = await getV1ProjectsById({
        path: { id },
      });
      if (error) throw new Error(formatError(error));

      if (jsonOut) return printJson(project);
      print(`${project.title}  ·  [${project.status}]`);
      if (project.notes) print(`\n${project.notes}`);
      return;
    }

    if (action === 'add') {
      if (!args.title) throw new Error('--title required');
      const { data: project, error } = await postV1Projects({
        body: {
          title: args.title,
          notes: args.notes,
          areaId: args['area-id'],
        },
      });
      if (error) throw new Error(formatError(error));

      return jsonOut ? printJson(project) : print('Created project');
    }

    if (action === 'update') {
      if (!id) throw new Error('Project ID required');
      const { data: project, error } = await putV1ProjectsById({
        path: { id },
        body: {
          title: args.title,
          notes: args.notes,
          areaId: args['area-id'],
        },
      });
      if (error) throw new Error(formatError(error));

      return jsonOut ? printJson(project) : print('Updated project');
    }

    if (action === 'rm') {
      if (!id) throw new Error('Project ID required');
      const { data, error } = await deleteV1ProjectsById({ path: { id } });
      if (error) throw new Error(formatError(error));

      return jsonOut ? printJson(data) : print('Deleted project');
    }

    throw new Error(`Unknown action: ${action}`);
  },
});
