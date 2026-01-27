#!/usr/bin/env bun

import { scryptAsync } from '@noble/hashes/scrypt.js';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import {
  accounts,
  apiKeys,
  areas,
  checklistItems,
  generateId,
  headings,
  projects,
  repeatingRules,
  tags,
  tasks,
  taskTags,
  users,
} from '../db/schema';

// Helper to hash API keys (simple hash for dev)
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Hash password using scrypt (same as better-auth)
async function hashPassword(password: string): Promise<string> {
  const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const key = await scryptAsync(password.normalize('NFKC'), salt, {
    N: 16384,
    r: 16,
    p: 1,
    dkLen: 64,
    maxmem: 128 * 16384 * 16 * 2,
  });
  const keyHex = Array.from(key)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${salt}:${keyHex}`;
}

// Generate a random API key
function generateApiKey(): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'tk_';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const SEED_EMAIL = 'seed@example.com';
const SEED_PASSWORD = 'password123';

async function seed() {
  console.log('Seeding database...');

  // Check if seed user already exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, SEED_EMAIL))
    .get();

  let userId: string;

  if (existingUser) {
    console.log('Seed user already exists, clearing existing data...');
    userId = existingUser.id;

    // Clear existing data for this user (in reverse order of dependencies)
    await db.delete(taskTags).where(eq(taskTags.userId, userId));
    await db.delete(checklistItems).where(eq(checklistItems.userId, userId));
    await db.delete(tasks).where(eq(tasks.userId, userId));
    await db.delete(repeatingRules).where(eq(repeatingRules.userId, userId));
    await db.delete(headings).where(eq(headings.userId, userId));
    await db.delete(projects).where(eq(projects.userId, userId));
    await db.delete(areas).where(eq(areas.userId, userId));
    await db.delete(tags).where(eq(tags.userId, userId));
    await db.delete(apiKeys).where(eq(apiKeys.userId, userId));

    // Ensure credential account exists with correct password
    const hashedPassword = await hashPassword(SEED_PASSWORD);
    const existingAccount = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, userId))
      .get();

    if (existingAccount) {
      await db
        .update(accounts)
        .set({ password: hashedPassword })
        .where(eq(accounts.userId, userId));
    } else {
      await db.insert(accounts).values({
        id: generateId(),
        userId,
        accountId: userId,
        providerId: 'credential',
        password: hashedPassword,
      });
    }

    console.log('Existing data cleared');
  } else {
    // Create a seed user
    console.log('Creating seed user...');
    userId = generateId();
    await db.insert(users).values({
      id: userId,
      name: 'Seed User',
      email: SEED_EMAIL,
      emailVerified: true,
    });

    // Create credential account with hashed password
    const hashedPassword = await hashPassword(SEED_PASSWORD);
    await db.insert(accounts).values({
      id: generateId(),
      userId,
      accountId: userId,
      providerId: 'credential',
      password: hashedPassword,
    });

    console.log('Seed user created');
  }

  console.log(`\n   Email: ${SEED_EMAIL}`);
  console.log(`   Password: ${SEED_PASSWORD}`);

  // Create initial API key
  console.log('\nCreating default API key...');
  const key = generateApiKey();
  const keyHash = await hashKey(key);
  await db.insert(apiKeys).values({
    id: generateId(),
    userId,
    name: 'Default Admin Key',
    keyHash,
    keyPrefix: key.substring(0, 7),
    scope: 'read-write',
  });
  console.log(`API Key created: ${key}`);
  console.log('   Save this key! It will not be shown again.');

  // Create areas
  console.log('\nCreating areas...');
  const workAreaId = generateId();
  const personalAreaId = generateId();
  const learningAreaId = generateId();

  await db.insert(areas).values([
    { id: workAreaId, userId, title: 'Work', position: 1 },
    { id: personalAreaId, userId, title: 'Personal', position: 2 },
    { id: learningAreaId, userId, title: 'Learning', position: 3 },
  ]);
  console.log('Areas created');

  // Create projects
  console.log('\nCreating projects...');
  const webAppProjectId = generateId();
  const mobileAppProjectId = generateId();
  const fitnessProjectId = generateId();
  const homeProjectId = generateId();
  const shoppingProjectId = generateId();
  const programmingCourseId = generateId();
  const freelanceProjectId = generateId();
  const bookWritingProjectId = generateId();

  await db.insert(projects).values([
    {
      id: webAppProjectId,
      userId,
      title: 'Website Redesign',
      notes: 'Redesign company website with modern UI',
      areaId: workAreaId,
      position: 1,
    },
    {
      id: mobileAppProjectId,
      userId,
      title: 'Mobile App Launch',
      notes: 'Launch new mobile app for iOS and Android',
      areaId: workAreaId,
      position: 2,
    },
    {
      id: fitnessProjectId,
      userId,
      title: 'Fitness Goals',
      notes: 'Track workouts and nutrition',
      areaId: personalAreaId,
      position: 3,
    },
    {
      id: homeProjectId,
      userId,
      title: 'Home Improvement',
      notes: 'Kitchen renovation and garden work',
      areaId: personalAreaId,
      position: 4,
    },
    {
      id: shoppingProjectId,
      userId,
      title: 'Shopping List',
      areaId: personalAreaId,
      position: 5,
    },
    {
      id: programmingCourseId,
      userId,
      title: 'Advanced TypeScript Course',
      notes: 'Complete online TypeScript course',
      areaId: learningAreaId,
      position: 6,
    },
    {
      id: freelanceProjectId,
      userId,
      title: 'Freelance Client Work',
      notes: 'Various client projects and consulting',
      position: 7,
    },
    {
      id: bookWritingProjectId,
      userId,
      title: 'Write Technical Book',
      notes: 'Book about modern web development',
      position: 8,
    },
  ]);
  console.log('Projects created');

  // Create backlog headings for each project
  console.log('\nCreating backlog headings...');
  await db.insert(headings).values([
    {
      id: generateId(),
      userId,
      projectId: webAppProjectId,
      title: 'Backlog',
      position: 9999,
      isBacklog: true,
    },
    {
      id: generateId(),
      userId,
      projectId: mobileAppProjectId,
      title: 'Backlog',
      position: 9999,
      isBacklog: true,
    },
    {
      id: generateId(),
      userId,
      projectId: fitnessProjectId,
      title: 'Backlog',
      position: 9999,
      isBacklog: true,
    },
    {
      id: generateId(),
      userId,
      projectId: homeProjectId,
      title: 'Backlog',
      position: 9999,
      isBacklog: true,
    },
    {
      id: generateId(),
      userId,
      projectId: shoppingProjectId,
      title: 'Backlog',
      position: 9999,
      isBacklog: true,
    },
    {
      id: generateId(),
      userId,
      projectId: programmingCourseId,
      title: 'Backlog',
      position: 9999,
      isBacklog: true,
    },
    {
      id: generateId(),
      userId,
      projectId: freelanceProjectId,
      title: 'Backlog',
      position: 9999,
      isBacklog: true,
    },
    {
      id: generateId(),
      userId,
      projectId: bookWritingProjectId,
      title: 'Backlog',
      position: 9999,
      isBacklog: true,
    },
  ]);
  console.log('Backlog headings created');

  // Create tags
  console.log('\nCreating tags...');
  const urgentTagId = generateId();
  const homeTagId = generateId();
  const meetingTagId = generateId();
  const planningTagId = generateId();
  const researchTagId = generateId();

  await db.insert(tags).values([
    { id: urgentTagId, userId, title: 'Urgent', color: '#FF3B30', position: 1 },
    { id: homeTagId, userId, title: 'Home', color: '#34C759', position: 2 },
    {
      id: meetingTagId,
      userId,
      title: 'Meeting',
      color: '#007AFF',
      position: 3,
    },
    {
      id: planningTagId,
      userId,
      title: 'Planning',
      color: '#FF9500',
      position: 4,
    },
    {
      id: researchTagId,
      userId,
      title: 'Research',
      color: '#5856D6',
      position: 5,
    },
  ]);
  console.log('Tags created');

  // Helper to get date strings (using local date, not UTC)
  const today = new Date();
  const getDateStr = (daysOffset: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() + daysOffset);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getDateStr(0);
  const tomorrowStr = getDateStr(1);
  const in2DaysStr = getDateStr(2);
  const in3DaysStr = getDateStr(3);
  const in5DaysStr = getDateStr(5);
  const in7DaysStr = getDateStr(7);
  const in10DaysStr = getDateStr(10);

  // Create repeating templates
  console.log('\nCreating repeating templates...');
  await db.insert(repeatingRules).values([
    {
      id: generateId(),
      userId,
      rrule: 'FREQ=DAILY',
      nextOccurrence: todayStr,
      status: 'active',
      title: 'Daily journal',
      notes: '5 minutes - write down highlights and plan tomorrow.',
      projectId: null,
      headingId: null,
      areaId: personalAreaId,
      checklistTemplate: JSON.stringify([
        { title: '1 win' },
        { title: '1 lesson' },
        { title: 'Top 3 for tomorrow' },
      ]),
      tagsTemplate: JSON.stringify([planningTagId]),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
    {
      id: generateId(),
      userId,
      rrule: 'FREQ=WEEKLY;BYDAY=FR',
      nextOccurrence: todayStr,
      status: 'active',
      title: 'Weekly review',
      notes: 'Review goals, clean inbox, plan next week.',
      projectId: null,
      headingId: null,
      areaId: workAreaId,
      checklistTemplate: JSON.stringify([
        { title: 'Clear inbox' },
        { title: 'Review active projects' },
        { title: 'Plan next week' },
      ]),
      tagsTemplate: JSON.stringify([planningTagId, researchTagId]),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
    {
      id: generateId(),
      userId,
      rrule: 'FREQ=MONTHLY;BYMONTHDAY=1',
      nextOccurrence: in7DaysStr,
      status: 'active',
      title: 'Pay rent',
      notes: 'Transfer rent and file receipt.',
      projectId: null,
      headingId: null,
      areaId: personalAreaId,
      checklistTemplate: JSON.stringify([{ title: 'Make transfer' }]),
      tagsTemplate: JSON.stringify([urgentTagId]),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
  ]);
  console.log('Repeating templates created');

  console.log(`\nCreating tasks for today (${todayStr})...`);

  let position = 1;

  // Helper to create task and return its ID
  const createTask = async (data: {
    title: string;
    status:
      | 'inbox'
      | 'anytime'
      | 'someday'
      | 'scheduled'
      | 'completed'
      | 'trashed';
    scheduledDate?: string;
    projectId?: string;
    areaId?: string;
    notes?: string;
  }) => {
    const id = generateId();
    await db.insert(tasks).values({
      id,
      userId,
      title: data.title,
      status: data.status,
      scheduledDate: data.scheduledDate ?? null,
      projectId: data.projectId ?? null,
      areaId: data.areaId ?? null,
      notes: data.notes ?? null,
      position: position++,
    });
    return id;
  };

  // Helper to add checklist item
  const addChecklistItem = async (taskId: string, title: string) => {
    await db.insert(checklistItems).values({
      id: generateId(),
      userId,
      taskId,
      title,
      position: position++,
    });
  };

  // Helper to add tag to task
  const addTagToTask = async (taskId: string, tagId: string) => {
    await db.insert(taskTags).values({
      id: generateId(),
      userId,
      taskId,
      tagId,
    });
  };

  // Inbox tasks
  await createTask({ title: 'Review project proposals', status: 'inbox' });
  await createTask({
    title: 'Follow up with client feedback',
    status: 'inbox',
  });
  const urgentInboxTask = await createTask({
    title: 'Respond to urgent email',
    status: 'inbox',
  });
  await addTagToTask(urgentInboxTask, urgentTagId);
  await createTask({ title: 'Book travel for conference', status: 'inbox' });
  await createTask({ title: 'Research new tools for team', status: 'inbox' });
  await createTask({ title: 'Update LinkedIn profile', status: 'inbox' });
  await createTask({ title: 'Review quarterly goals', status: 'inbox' });

  // TODAY - Website Redesign project
  const todayStandupTask = await createTask({
    title: 'Team standup meeting',
    status: 'scheduled',
    scheduledDate: todayStr,
    projectId: webAppProjectId,
  });
  await addTagToTask(todayStandupTask, meetingTagId);

  const todayReviewTask = await createTask({
    title: 'Review design mockups',
    status: 'scheduled',
    scheduledDate: todayStr,
    projectId: webAppProjectId,
  });
  await addChecklistItem(todayReviewTask, 'Homepage design');
  await addChecklistItem(todayReviewTask, 'Navigation structure');
  await addChecklistItem(todayReviewTask, 'Color scheme');

  await createTask({
    title: 'Update project timeline',
    status: 'scheduled',
    scheduledDate: todayStr,
    projectId: webAppProjectId,
  });

  // TODAY - Mobile App project
  await createTask({
    title: 'Test app on iOS devices',
    status: 'scheduled',
    scheduledDate: todayStr,
    projectId: mobileAppProjectId,
  });
  const todayBugFixTask = await createTask({
    title: 'Fix login screen bug',
    status: 'scheduled',
    scheduledDate: todayStr,
    projectId: mobileAppProjectId,
  });
  await addTagToTask(todayBugFixTask, urgentTagId);

  // TODAY - Fitness project
  await createTask({
    title: 'Morning workout',
    status: 'scheduled',
    scheduledDate: todayStr,
    projectId: fitnessProjectId,
  });
  await createTask({
    title: 'Meal prep for the week',
    status: 'scheduled',
    scheduledDate: todayStr,
    projectId: fitnessProjectId,
  });

  // TODAY - Home project
  const todayHomeTask = await createTask({
    title: 'Get quotes from contractors',
    status: 'scheduled',
    scheduledDate: todayStr,
    projectId: homeProjectId,
  });
  await addTagToTask(todayHomeTask, homeTagId);

  // TODAY - Freelance project (no area)
  await createTask({
    title: 'Client call at 2pm',
    status: 'scheduled',
    scheduledDate: todayStr,
    projectId: freelanceProjectId,
  });
  await createTask({
    title: 'Send project proposal',
    status: 'scheduled',
    scheduledDate: todayStr,
    projectId: freelanceProjectId,
  });

  // TODAY - Book writing project (no area)
  await createTask({
    title: 'Write chapter 3 draft',
    status: 'scheduled',
    scheduledDate: todayStr,
    projectId: bookWritingProjectId,
  });

  // TODAY - Tasks without any project
  const todayCallTask = await createTask({
    title: 'Call dentist to schedule appointment',
    status: 'scheduled',
    scheduledDate: todayStr,
  });
  await addTagToTask(todayCallTask, urgentTagId);

  await createTask({
    title: 'Reply to important emails',
    status: 'scheduled',
    scheduledDate: todayStr,
  });
  await createTask({
    title: 'Review monthly budget',
    status: 'scheduled',
    scheduledDate: todayStr,
  });
  await createTask({
    title: 'Water the plants',
    status: 'scheduled',
    scheduledDate: todayStr,
  });

  // TOMORROW - Website Redesign
  const tomorrowClientMeeting = await createTask({
    title: 'Client presentation meeting',
    status: 'scheduled',
    scheduledDate: tomorrowStr,
    projectId: webAppProjectId,
  });
  await addTagToTask(tomorrowClientMeeting, meetingTagId);
  await addTagToTask(tomorrowClientMeeting, urgentTagId);
  await addChecklistItem(tomorrowClientMeeting, 'Prepare presentation slides');
  await addChecklistItem(tomorrowClientMeeting, 'Print handouts');
  await addChecklistItem(tomorrowClientMeeting, 'Test projector setup');

  await createTask({
    title: 'Implement responsive navigation',
    status: 'scheduled',
    scheduledDate: tomorrowStr,
    projectId: webAppProjectId,
  });
  await createTask({
    title: 'Write CSS for mobile breakpoints',
    status: 'scheduled',
    scheduledDate: tomorrowStr,
    projectId: webAppProjectId,
  });

  // TOMORROW - Mobile App
  await createTask({
    title: 'Code review with team',
    status: 'scheduled',
    scheduledDate: tomorrowStr,
    projectId: mobileAppProjectId,
  });
  await createTask({
    title: 'Update app store screenshots',
    status: 'scheduled',
    scheduledDate: tomorrowStr,
    projectId: mobileAppProjectId,
  });

  // TOMORROW - Fitness
  await createTask({
    title: 'Yoga class at 6 PM',
    status: 'scheduled',
    scheduledDate: tomorrowStr,
    projectId: fitnessProjectId,
  });

  // TOMORROW - Learning
  await createTask({
    title: 'Watch TypeScript generics tutorial',
    status: 'scheduled',
    scheduledDate: tomorrowStr,
    projectId: programmingCourseId,
  });

  // TOMORROW - Home
  await createTask({
    title: 'Shop for kitchen tiles',
    status: 'scheduled',
    scheduledDate: tomorrowStr,
    projectId: homeProjectId,
  });

  // Day +2 - Website Redesign
  const researchTask = await createTask({
    title: 'Research accessibility standards',
    status: 'scheduled',
    scheduledDate: in2DaysStr,
    projectId: webAppProjectId,
  });
  await addTagToTask(researchTask, researchTagId);

  await createTask({
    title: 'Optimize image assets',
    status: 'scheduled',
    scheduledDate: in2DaysStr,
    projectId: webAppProjectId,
  });

  // Day +2 - Mobile App
  await createTask({
    title: 'Submit beta build to TestFlight',
    status: 'scheduled',
    scheduledDate: in2DaysStr,
    projectId: mobileAppProjectId,
  });

  // Day +3 - Website Redesign
  const sprintPlanning = await createTask({
    title: 'Sprint planning meeting',
    status: 'scheduled',
    scheduledDate: in3DaysStr,
    projectId: webAppProjectId,
  });
  await addTagToTask(sprintPlanning, meetingTagId);
  await addTagToTask(sprintPlanning, planningTagId);

  await createTask({
    title: 'Set up staging environment',
    status: 'scheduled',
    scheduledDate: in3DaysStr,
    projectId: webAppProjectId,
  });

  // Day +3 - Mobile App
  await createTask({
    title: 'Implement push notifications',
    status: 'scheduled',
    scheduledDate: in3DaysStr,
    projectId: mobileAppProjectId,
  });

  // Day +5 - Various projects
  await createTask({
    title: 'Website launch preparation',
    status: 'scheduled',
    scheduledDate: in5DaysStr,
    projectId: webAppProjectId,
  });
  await createTask({
    title: 'Review app analytics setup',
    status: 'scheduled',
    scheduledDate: in5DaysStr,
    projectId: mobileAppProjectId,
  });
  await createTask({
    title: 'Track weekly fitness progress',
    status: 'scheduled',
    scheduledDate: in5DaysStr,
    projectId: fitnessProjectId,
  });
  await createTask({
    title: 'Invoice client for completed work',
    status: 'scheduled',
    scheduledDate: in5DaysStr,
    projectId: freelanceProjectId,
  });

  // Day +7 - Next week tasks
  await createTask({
    title: 'Weekly team retrospective',
    status: 'scheduled',
    scheduledDate: in7DaysStr,
    projectId: webAppProjectId,
  });
  await createTask({
    title: 'Plan next sprint goals',
    status: 'scheduled',
    scheduledDate: in7DaysStr,
    projectId: mobileAppProjectId,
  });

  // Day +10 - Further out
  await createTask({
    title: 'Complete TypeScript course final project',
    status: 'scheduled',
    scheduledDate: in10DaysStr,
    projectId: programmingCourseId,
  });
  await createTask({
    title: 'Schedule kitchen renovation start date',
    status: 'scheduled',
    scheduledDate: in10DaysStr,
    projectId: homeProjectId,
  });

  // Anytime tasks - Website Redesign
  const wireframesTask = await createTask({
    title: 'Create wireframes for contact page',
    status: 'anytime',
    projectId: webAppProjectId,
  });
  await addChecklistItem(wireframesTask, 'Sketch initial layout');
  await addChecklistItem(wireframesTask, 'Add form fields');
  await addChecklistItem(wireframesTask, 'Design success message');

  await createTask({
    title: 'Write copy for hero section',
    status: 'anytime',
    projectId: webAppProjectId,
  });
  await createTask({
    title: 'Choose web fonts',
    status: 'anytime',
    projectId: webAppProjectId,
  });

  // Anytime tasks - Mobile App
  await createTask({
    title: 'Design app icon variations',
    status: 'anytime',
    projectId: mobileAppProjectId,
  });
  await createTask({
    title: 'Write app store description',
    status: 'anytime',
    projectId: mobileAppProjectId,
  });

  // Anytime tasks - Shopping
  const shoppingTask1 = await createTask({
    title: 'Buy groceries',
    status: 'anytime',
    projectId: shoppingProjectId,
  });
  await addTagToTask(shoppingTask1, homeTagId);
  await addChecklistItem(shoppingTask1, 'Fruits and vegetables');
  await addChecklistItem(shoppingTask1, 'Dairy products');
  await addChecklistItem(shoppingTask1, 'Bread and pasta');

  await createTask({
    title: 'Pick up dry cleaning',
    status: 'anytime',
    projectId: shoppingProjectId,
  });
  await createTask({
    title: 'Return library books',
    status: 'anytime',
    projectId: shoppingProjectId,
  });

  // Anytime tasks - Learning
  await createTask({
    title: 'Read course materials on async/await',
    status: 'anytime',
    projectId: programmingCourseId,
  });
  await createTask({
    title: 'Practice coding exercises',
    status: 'anytime',
    projectId: programmingCourseId,
  });

  // Anytime tasks - Freelance project (no area)
  await createTask({
    title: 'Update portfolio website',
    status: 'anytime',
    projectId: freelanceProjectId,
  });
  await createTask({
    title: 'Research new potential clients',
    status: 'anytime',
    projectId: freelanceProjectId,
  });

  // Anytime tasks - Book writing (no area)
  await createTask({
    title: 'Outline chapter 4',
    status: 'anytime',
    projectId: bookWritingProjectId,
  });
  await createTask({
    title: 'Review editor feedback',
    status: 'anytime',
    projectId: bookWritingProjectId,
  });

  // Anytime tasks - No project
  await createTask({ title: 'Organize digital photos', status: 'anytime' });
  await createTask({ title: 'Clean out garage', status: 'anytime' });

  // Someday tasks - Standalone (no project)
  await createTask({
    title: 'Read "Deep Work" by Cal Newport',
    status: 'someday',
  });
  await createTask({
    title: 'Learn Rust programming language',
    status: 'someday',
  });
  await createTask({ title: 'Plan summer vacation', status: 'someday' });
  await createTask({
    title: 'Research investment strategies',
    status: 'someday',
  });
  await createTask({ title: 'Start a personal blog', status: 'someday' });
  await createTask({ title: 'Learn to play guitar', status: 'someday' });

  // Someday tasks - Website Redesign (Work area)
  await createTask({
    title: 'Explore headless CMS options',
    status: 'someday',
    projectId: webAppProjectId,
  });
  await createTask({
    title: 'Research A/B testing tools',
    status: 'someday',
    projectId: webAppProjectId,
  });

  // Someday tasks - Mobile App (Work area)
  await createTask({
    title: 'Add dark mode support',
    status: 'someday',
    projectId: mobileAppProjectId,
  });
  await createTask({
    title: 'Implement widget for home screen',
    status: 'someday',
    projectId: mobileAppProjectId,
  });

  // Someday tasks - Fitness (Personal area)
  await createTask({
    title: 'Try rock climbing',
    status: 'someday',
    projectId: fitnessProjectId,
  });
  await createTask({
    title: 'Sign up for marathon training',
    status: 'someday',
    projectId: fitnessProjectId,
  });

  // Someday tasks - Home Improvement (Personal area)
  await createTask({
    title: 'Build a home office',
    status: 'someday',
    projectId: homeProjectId,
  });
  await createTask({
    title: 'Install smart home system',
    status: 'someday',
    projectId: homeProjectId,
  });

  // Someday tasks - Learning area
  await createTask({
    title: 'Take machine learning course',
    status: 'someday',
    projectId: programmingCourseId,
  });
  await createTask({
    title: 'Learn GraphQL in depth',
    status: 'someday',
    projectId: programmingCourseId,
  });

  // Someday tasks - Freelance (no area)
  await createTask({
    title: 'Create online course on web dev',
    status: 'someday',
    projectId: freelanceProjectId,
  });
  await createTask({
    title: 'Start YouTube channel',
    status: 'someday',
    projectId: freelanceProjectId,
  });

  // Someday tasks - Book writing (no area)
  await createTask({
    title: 'Write second book on DevOps',
    status: 'someday',
    projectId: bookWritingProjectId,
  });
  await createTask({
    title: 'Pitch book to publishers',
    status: 'someday',
    projectId: bookWritingProjectId,
  });

  console.log('Tasks created');

  console.log('\n========================================');
  console.log('Seed completed successfully!');
  console.log('========================================');
  console.log('\nLogin credentials:');
  console.log(`   Email:    ${SEED_EMAIL}`);
  console.log(`   Password: ${SEED_PASSWORD}`);
  console.log('\nSummary:');
  console.log('   - 1 seed user');
  console.log('   - 3 areas (Work, Personal, Learning)');
  console.log('   - 8 projects (6 in areas, 2 without areas)');
  console.log('   - 5 tags');
  console.log('   - 80+ tasks across multiple dates');
  console.log('   - 1 API key (read-write access)');
  console.log('\nYou can now start the dev server with: bun run dev');
}

// Run seed
seed()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nError seeding database:', error);
    process.exit(1);
  });
