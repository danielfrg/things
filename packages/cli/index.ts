#!/usr/bin/env bun

declare const THINGS_CLI_VERSION: string | undefined;

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { AnytimeCommand } from './cmd/anytime';
import { AreasCommand } from './cmd/areas';
import { ChecklistCommand } from './cmd/checklist';
import { HeadingsCommand } from './cmd/headings';
import { InboxCommand } from './cmd/inbox';
import { LogbookCommand } from './cmd/logbook';
import { ProjectsCommand } from './cmd/projects';
import { RepeatingCommand } from './cmd/repeating';
import { SomedayCommand } from './cmd/someday';
import { TagsCommand } from './cmd/tags';
// CRUD commands
import { TasksCommand } from './cmd/tasks';
// View commands
import { TodayCommand } from './cmd/today';
import { UpcomingCommand } from './cmd/upcoming';

const VERSION =
  typeof THINGS_CLI_VERSION !== 'undefined' ? THINGS_CLI_VERSION : 'dev';

const cli = yargs(hideBin(process.argv))
  .scriptName('things')
  .wrap(100)
  .help('help')
  .alias('h', 'help')
  .version('version', 'Show version number', VERSION)
  .alias('v', 'version')
  .usage(
    'Things CLI - Task management from the command line\n\nUsage: things <command> [options]',
  )
  .completion('completion', 'Generate shell completion script')
  // View commands (NEW - natural shortcuts)
  .command(TodayCommand)
  .command(InboxCommand)
  .command(UpcomingCommand)
  .command(AnytimeCommand)
  .command(SomedayCommand)
  .command(LogbookCommand)
  // CRUD commands (existing functionality)
  .command(TasksCommand)
  .command(ProjectsCommand)
  .command(AreasCommand)
  .command(TagsCommand)
  .command(ChecklistCommand)
  .command(HeadingsCommand)
  .command(RepeatingCommand)
  .demandCommand(1, 'Please specify a command')
  .fail((msg, err) => {
    if (
      msg?.startsWith('Unknown argument') ||
      msg?.startsWith('Not enough non-option arguments')
    ) {
      cli.showHelp('log');
      process.exit(1);
    }
    if (err) {
      process.stderr.write(`Error: ${err.message}\n`);
      process.exit(1);
    }
    if (msg) {
      process.stderr.write(`Error: ${msg}\n`);
      process.exit(1);
    }
  })
  .strict();

try {
  await cli.parse();
} catch (e) {
  const message = e instanceof Error ? e.message : String(e);
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
}
