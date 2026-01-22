#!/usr/bin/env bun

import { db } from '../db';
import {
  accounts,
  apiKeys,
  areas,
  checklistItems,
  headings,
  projects,
  repeatingRules,
  sessions,
  tags,
  taskOrderings,
  tasks,
  taskTags,
  users,
  verifications,
} from '../db/schema';

async function clean() {
  console.log('Cleaning database...');

  try {
    // Delete in order to respect foreign key constraints
    console.log('Deleting task tags...');
    await db.delete(taskTags);

    console.log('Deleting checklist items...');
    await db.delete(checklistItems);

    console.log('Deleting task orderings...');
    await db.delete(taskOrderings);

    console.log('Deleting repeating rules...');
    await db.delete(repeatingRules);

    console.log('Deleting tasks...');
    await db.delete(tasks);

    console.log('Deleting headings...');
    await db.delete(headings);

    console.log('Deleting projects...');
    await db.delete(projects);

    console.log('Deleting tags...');
    await db.delete(tags);

    console.log('Deleting areas...');
    await db.delete(areas);

    console.log('Deleting API keys...');
    await db.delete(apiKeys);

    console.log('Deleting sessions...');
    await db.delete(sessions);

    console.log('Deleting accounts...');
    await db.delete(accounts);

    console.log('Deleting verifications...');
    await db.delete(verifications);

    console.log('Deleting users...');
    await db.delete(users);

    console.log('\nDatabase cleaned successfully!');
    console.log('All tables are now empty.');
    console.log('\nRun `bun run db:seed` to populate with sample data.');
  } catch (error) {
    console.error('\nError cleaning database:', error);
    throw error;
  }
}

// Run clean
clean()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch(() => {
    console.error('\nFailed to clean database');
    process.exit(1);
  });
