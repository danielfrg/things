import { and, asc, eq, isNull, lte } from 'drizzle-orm';
import * as rrulePkg from 'rrule';
import { db } from '@/db';

// Handle both ESM and CJS module formats
const RRule = (rrulePkg as any).RRule ?? (rrulePkg as any).default?.RRule;

import type {
  ChecklistItem,
  NewRepeatingRule,
  RepeatingRule,
  Tag,
  Task,
  TaskTag,
} from '@/db/schema';
import {
  checklistItems,
  generateId,
  repeatingRules,
  tags,
  tasks,
  taskTags,
} from '@/db/schema';

export type RepeatingRuleWithTags = RepeatingRule & {
  tags: Array<{ id: string; title: string; color: string | null }>;
};

export type CreateRepeatingRuleInput = {
  userId: string;
  rrule: string;
  startDate: string;
  title: string;
  notes?: string | null;
  projectId?: string | null;
  headingId?: string | null;
  areaId?: string | null;
  checklistItems?: Array<{ title: string }>;
  tagIds?: string[];
};

export type UpdateRepeatingRuleInput = {
  rrule?: string;
  nextOccurrence?: string;
  status?: 'active' | 'paused';
  title?: string;
  notes?: string | null;
  projectId?: string | null;
  headingId?: string | null;
  areaId?: string | null;
  checklistItems?: Array<{ title: string }>;
  checklistTemplate?: string | null;
  tagIds?: string[];
  tagsTemplate?: string | null;
};

export function computeNextOccurrence(
  rruleStr: string,
  afterDate: string,
): string | null {
  try {
    // Parse the afterDate as end of day UTC to ensure we get the NEXT day's occurrence
    const after = new Date(`${afterDate}T23:59:59Z`);

    // Parse the RRULE and set dtstart to start of the afterDate
    const dtstart = new Date(`${afterDate}T00:00:00Z`);
    const rule = RRule.fromString(rruleStr);
    const options = { ...rule.options, dtstart };
    const ruleWithStart = new RRule(options);

    // Get the next occurrence after the given date (exclusive)
    const next = ruleWithStart.after(after, false);
    if (!next) return null;

    // Format as YYYY-MM-DD using UTC to avoid timezone issues
    const year = next.getUTCFullYear();
    const month = String(next.getUTCMonth() + 1).padStart(2, '0');
    const day = String(next.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (err) {
    console.error('Failed to compute next occurrence:', err);
    return null;
  }
}

export function describeRRule(rruleStr: string): string {
  try {
    const rule = RRule.fromString(rruleStr);
    const text = rule.toText();
    return text
      ? text.charAt(0).toUpperCase() + text.slice(1)
      : 'Custom repeat';
  } catch {
    return 'Custom repeat';
  }
}

export async function listRepeatingRules(
  userId: string,
): Promise<RepeatingRuleWithTags[]> {
  const rules = await db.query.repeatingRules.findMany({
    where: and(
      eq(repeatingRules.userId, userId),
      isNull(repeatingRules.deletedAt),
    ),
    orderBy: asc(repeatingRules.createdAt),
  });

  return await Promise.all(
    rules.map(async (rule: RepeatingRule) => {
      const tagIds: string[] = rule.tagsTemplate
        ? JSON.parse(rule.tagsTemplate)
        : [];

      const ruleTags: Tag[] = tagIds.length
        ? await db.query.tags.findMany({
            where: and(eq(tags.userId, userId), isNull(tags.deletedAt)),
          })
        : [];

      const filteredTags = ruleTags
        .filter((t: Tag) => tagIds.includes(t.id))
        .map((t: Tag) => ({ id: t.id, title: t.title, color: t.color }));

      return { ...rule, tags: filteredTags };
    }),
  );
}

export async function getRepeatingRuleById(
  id: string,
  userId: string,
): Promise<RepeatingRuleWithTags | null> {
  const rule = await db.query.repeatingRules.findFirst({
    where: and(
      eq(repeatingRules.id, id),
      eq(repeatingRules.userId, userId),
      isNull(repeatingRules.deletedAt),
    ),
  });

  if (!rule) return null;

  const tagIds: string[] = rule.tagsTemplate
    ? JSON.parse(rule.tagsTemplate)
    : [];
  const ruleTags: Tag[] = tagIds.length
    ? await db.query.tags.findMany({
        where: and(eq(tags.userId, userId), isNull(tags.deletedAt)),
      })
    : [];

  const filteredTags = ruleTags
    .filter((t: Tag) => tagIds.includes(t.id))
    .map((t: Tag) => ({ id: t.id, title: t.title, color: t.color }));

  return { ...rule, tags: filteredTags };
}

export async function getDueRepeatingRules(
  today: string,
  userId: string,
): Promise<RepeatingRule[]> {
  return await db.query.repeatingRules.findMany({
    where: and(
      eq(repeatingRules.userId, userId),
      isNull(repeatingRules.deletedAt),
      eq(repeatingRules.status, 'active'),
      lte(repeatingRules.nextOccurrence, today),
    ),
  });
}

export async function createRepeatingRule(
  input: CreateRepeatingRuleInput,
): Promise<string> {
  const now = new Date();

  const [inserted] = await db
    .insert(repeatingRules)
    .values({
      id: generateId(),
      userId: input.userId,
      rrule: input.rrule,
      nextOccurrence: input.startDate,
      status: 'active',
      title: input.title,
      notes: input.notes ?? null,
      projectId: input.projectId ?? null,
      headingId: input.headingId ?? null,
      areaId: input.areaId ?? null,
      checklistTemplate: input.checklistItems
        ? JSON.stringify(input.checklistItems)
        : null,
      tagsTemplate: input.tagIds ? JSON.stringify(input.tagIds) : null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
    .returning({ id: repeatingRules.id });

  return inserted.id;
}

export async function updateRepeatingRule(
  id: string,
  userId: string,
  input: UpdateRepeatingRuleInput,
): Promise<string> {
  const now = new Date();

  const updateData: Partial<NewRepeatingRule> & { updatedAt: Date } = {
    updatedAt: now,
  };

  if (input.rrule !== undefined) updateData.rrule = input.rrule;
  if (input.nextOccurrence !== undefined)
    updateData.nextOccurrence = input.nextOccurrence;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.title !== undefined) updateData.title = input.title;
  if (input.notes !== undefined) updateData.notes = input.notes;
  if (input.projectId !== undefined) updateData.projectId = input.projectId;
  if (input.headingId !== undefined) updateData.headingId = input.headingId;
  if (input.areaId !== undefined) updateData.areaId = input.areaId;
  if (input.checklistItems !== undefined) {
    updateData.checklistTemplate = JSON.stringify(input.checklistItems);
  }
  if (input.checklistTemplate !== undefined) {
    updateData.checklistTemplate = input.checklistTemplate;
  }
  if (input.tagIds !== undefined) {
    updateData.tagsTemplate = JSON.stringify(input.tagIds);
  }
  if (input.tagsTemplate !== undefined) {
    updateData.tagsTemplate = input.tagsTemplate;
  }

  await db
    .update(repeatingRules)
    .set(updateData)
    .where(and(eq(repeatingRules.id, id), eq(repeatingRules.userId, userId)));
  return id;
}

export async function removeRepeatingRule(
  id: string,
  userId: string,
): Promise<string> {
  const now = new Date();
  await db
    .update(repeatingRules)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(repeatingRules.id, id), eq(repeatingRules.userId, userId)));
  return id;
}

export async function advanceRepeatingRule(
  id: string,
  userId: string,
): Promise<string | null> {
  const rule = await db.query.repeatingRules.findFirst({
    where: and(eq(repeatingRules.id, id), eq(repeatingRules.userId, userId)),
  });

  if (!rule) return null;

  const nextDate = computeNextOccurrence(rule.rrule, rule.nextOccurrence);
  if (!nextDate) {
    await removeRepeatingRule(id, userId);
    return null;
  }

  await db
    .update(repeatingRules)
    .set({ nextOccurrence: nextDate, updatedAt: new Date() })
    .where(and(eq(repeatingRules.id, id), eq(repeatingRules.userId, userId)));

  return nextDate;
}

export async function setRepeatingRuleNextOccurrenceFromDate(
  id: string,
  params: { afterDate: string },
): Promise<string | null> {
  const rule = await db.query.repeatingRules.findFirst({
    where: and(eq(repeatingRules.id, id), isNull(repeatingRules.deletedAt)),
  });

  if (!rule) return null;

  const nextDate = computeNextOccurrence(rule.rrule, params.afterDate);
  if (!nextDate) {
    await removeRepeatingRule(id, rule.userId);
    return null;
  }

  if (nextDate <= rule.nextOccurrence) return rule.nextOccurrence;

  await db
    .update(repeatingRules)
    .set({ nextOccurrence: nextDate, updatedAt: new Date() })
    .where(eq(repeatingRules.id, id));

  return nextDate;
}

export async function spawnRepeatingRule(
  ruleId: string,
  userId: string,
): Promise<string | null> {
  const rule = await db.query.repeatingRules.findFirst({
    where: and(
      eq(repeatingRules.id, ruleId),
      eq(repeatingRules.userId, userId),
      isNull(repeatingRules.deletedAt),
      eq(repeatingRules.status, 'active'),
    ),
  });

  if (!rule) return null;

  // Check if a task already exists for this rule and scheduled date
  const existing = await db.query.tasks.findFirst({
    where: and(
      eq(tasks.repeatingRuleId, ruleId),
      eq(tasks.scheduledDate, rule.nextOccurrence),
      eq(tasks.userId, userId),
      isNull(tasks.deletedAt),
    ),
  });

  if (existing) {
    // Task already spawned for this date, just advance the rule
    await advanceRepeatingRule(ruleId, userId);
    return null;
  }

  const now = new Date();
  const existingTasks = await db.query.tasks.findMany({
    where: eq(tasks.userId, userId),
  });
  const position = existingTasks.length + 1;

  const [inserted] = await db
    .insert(tasks)
    .values({
      id: generateId(),
      userId,
      title: rule.title,
      notes: rule.notes,
      status: 'scheduled',
      type: 'task',
      scheduledDate: rule.nextOccurrence,
      deadline: null,
      position,
      projectId: rule.projectId,
      headingId: rule.headingId,
      areaId: rule.areaId,
      repeatingRuleId: rule.id,
      completedAt: null,
      canceledAt: null,
      trashedAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
    .returning({ id: tasks.id });

  const taskId = inserted.id;

  if (rule.checklistTemplate) {
    const list: Array<{ title: string }> = JSON.parse(rule.checklistTemplate);
    for (const [index, item] of list.entries()) {
      await db.insert(checklistItems).values({
        id: generateId(),
        userId,
        taskId,
        title: item.title,
        completed: false,
        position: index + 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });
    }
  }

  if (rule.tagsTemplate) {
    const tagIds: string[] = JSON.parse(rule.tagsTemplate);
    for (const tagId of tagIds) {
      await db.insert(taskTags).values({
        id: generateId(),
        userId,
        taskId,
        tagId,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });
    }
  }

  await advanceRepeatingRule(ruleId, userId);
  return taskId;
}

export async function spawnDueRepeatingRules(
  today: string,
  userId: string,
): Promise<string[]> {
  const dueRules = await getDueRepeatingRules(today, userId);
  const created: string[] = [];

  for (const rule of dueRules) {
    const taskId = await spawnRepeatingRule(rule.id, userId);
    if (taskId) created.push(taskId);
  }

  return created;
}

export async function createRepeatingRuleFromTask(
  taskId: string,
  rrule: string,
  startDate: string,
  userId: string,
): Promise<string> {
  const task = (await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
  })) as Task | undefined;
  if (!task) throw new Error('Task not found');

  const taskChecklistItems = (await db.query.checklistItems.findMany({
    where: and(
      eq(checklistItems.taskId, taskId),
      eq(checklistItems.userId, userId),
      isNull(checklistItems.deletedAt),
    ),
    orderBy: asc(checklistItems.position),
  })) as ChecklistItem[];

  const taskTagRelations = (await db.query.taskTags.findMany({
    where: and(
      eq(taskTags.taskId, taskId),
      eq(taskTags.userId, userId),
      isNull(taskTags.deletedAt),
    ),
  })) as TaskTag[];

  const tagIds = taskTagRelations.map((tt) => tt.tagId);

  // Compute the NEXT occurrence after startDate
  const nextOccurrence = computeNextOccurrence(rrule, startDate);
  if (!nextOccurrence) {
    throw new Error('Could not compute next occurrence from rrule');
  }

  const ruleId = await createRepeatingRule({
    userId,
    rrule,
    startDate: nextOccurrence,
    title: task.title,
    notes: task.notes,
    projectId: task.projectId,
    headingId: task.headingId,
    areaId: task.areaId,
    checklistItems: taskChecklistItems.map((item) => ({ title: item.title })),
    tagIds,
  });

  // Delete the original task - it's now a template
  await db
    .update(tasks)
    .set({
      trashedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));

  return ruleId;
}

export async function updateTemplateFromTask(taskId: string): Promise<void> {
  const task = (await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
  })) as Task | undefined;

  if (!task?.repeatingRuleId) return;

  const taskChecklistItems = (await db.query.checklistItems.findMany({
    where: and(
      eq(checklistItems.taskId, taskId),
      eq(checklistItems.userId, task.userId),
      isNull(checklistItems.deletedAt),
    ),
    orderBy: asc(checklistItems.position),
  })) as ChecklistItem[];

  const taskTagRelations = (await db.query.taskTags.findMany({
    where: and(
      eq(taskTags.taskId, taskId),
      eq(taskTags.userId, task.userId),
      isNull(taskTags.deletedAt),
    ),
  })) as TaskTag[];

  const tagIds = taskTagRelations.map((tt) => tt.tagId);

  await updateRepeatingRule(task.repeatingRuleId, task.userId, {
    title: task.title,
    notes: task.notes,
    projectId: task.projectId,
    headingId: task.headingId,
    areaId: task.areaId,
    checklistItems: taskChecklistItems.map((item) => ({ title: item.title })),
    tagIds,
  });
}
