import type { Argv } from 'yargs';
import {
  deleteV1RepeatingRulesById,
  getV1RepeatingRules,
  getV1RepeatingRulesById,
  postV1RepeatingRules,
  postV1RepeatingRulesByIdPause,
  postV1RepeatingRulesByIdResume,
  putV1RepeatingRulesById,
} from '../generated/sdk.gen';
import type { RepeatingRule } from '../generated/types.gen';
import { initClient } from '../util/client';
import { formatRepeatingLine } from '../util/format';
import {
  formatError,
  print,
  printJson,
  validateApiResponse,
} from '../util/print';
import { cmd } from './cmd';

export const RepeatingCommand = cmd({
  command: 'repeating <action> [id]',
  describe: 'Manage repeating rules',
  builder: (yargs: Argv) =>
    yargs
      .positional('action', {
        type: 'string',
        describe: 'Action to perform',
        choices: ['list', 'get', 'add', 'update', 'pause', 'resume', 'rm'],
      })
      .positional('id', { type: 'string', describe: 'Rule ID' })
      .option('json', { type: 'boolean', describe: 'Output as JSON' })
      .option('title', { type: 'string', describe: 'Rule title' })
      .option('notes', { type: 'string', describe: 'Rule notes' })
      .option('rrule', {
        type: 'string',
        describe: 'RRULE string (e.g., FREQ=DAILY)',
      })
      .option('start', { type: 'string', describe: 'Start date (YYYY-MM-DD)' })
      .option('project-id', { type: 'string', describe: 'Project ID' })
      .option('area-id', { type: 'string', describe: 'Area ID' }),
  handler: async (args) => {
    initClient();
    const { action, id, json: jsonOut } = args;

    if (action === 'list') {
      const { data: rules, error } = await getV1RepeatingRules();
      if (error) throw new Error(formatError(error));
      validateApiResponse(rules, 'repeating rules');

      if (jsonOut) return printJson(rules);

      for (const r of rules as RepeatingRule[]) {
        print(formatRepeatingLine(r));
      }
      return;
    }

    if (action === 'get') {
      if (!id) throw new Error('Rule ID required');
      const { data: rule, error } = await getV1RepeatingRulesById({
        path: { id },
      });
      if (error) throw new Error(formatError(error));

      if (jsonOut) return printJson(rule);
      print(formatRepeatingLine(rule));
      if (rule.notes) print(`\n${rule.notes}`);
      return;
    }

    if (action === 'add') {
      if (!args.title) throw new Error('--title required');
      if (!args.rrule) throw new Error('--rrule required');
      if (!args.start) throw new Error('--start required');
      const { data: rule, error } = await postV1RepeatingRules({
        body: {
          title: args.title,
          rrule: args.rrule,
          nextOccurrence: args.start,
          notes: args.notes,
          projectId: args['project-id'],
          areaId: args['area-id'],
        },
      });
      if (error) throw new Error(formatError(error));

      return jsonOut ? printJson(rule) : print('Created repeating rule');
    }

    if (action === 'update') {
      if (!id) throw new Error('Rule ID required');
      const { data: rule, error } = await putV1RepeatingRulesById({
        path: { id },
        body: {
          title: args.title,
          rrule: args.rrule,
          nextOccurrence: args.start,
          notes: args.notes,
          projectId: args['project-id'],
          areaId: args['area-id'],
        },
      });
      if (error) throw new Error(formatError(error));

      return jsonOut ? printJson(rule) : print('Updated repeating rule');
    }

    if (action === 'pause') {
      if (!id) throw new Error('Rule ID required');
      const { data: rule, error } = await postV1RepeatingRulesByIdPause({
        path: { id },
      });
      if (error) throw new Error(formatError(error));

      return jsonOut ? printJson(rule) : print('Paused repeating rule');
    }

    if (action === 'resume') {
      if (!id) throw new Error('Rule ID required');
      const { data: rule, error } = await postV1RepeatingRulesByIdResume({
        path: { id },
      });
      if (error) throw new Error(formatError(error));

      return jsonOut ? printJson(rule) : print('Resumed repeating rule');
    }

    if (action === 'rm') {
      if (!id) throw new Error('Rule ID required');
      const { data, error } = await deleteV1RepeatingRulesById({
        path: { id },
      });
      if (error) throw new Error(formatError(error));

      return jsonOut ? printJson(data) : print('Deleted repeating rule');
    }

    throw new Error(`Unknown action: ${action}`);
  },
});
