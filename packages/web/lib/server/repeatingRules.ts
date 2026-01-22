import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { repeatingRules } from '@/db/schema';
import type { RepeatingRuleRecord } from '@/db/validation';
import { auth } from '@/lib/auth';
import {
  createRepeatingRuleFromTask,
  describeRRule,
  removeRepeatingRule,
  spawnDueRepeatingRules,
  type UpdateRepeatingRuleInput,
  updateRepeatingRule,
} from '@/lib/services/repeatingRules';

async function getUserId(): Promise<string> {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session.user.id;
}

export const getRepeatingRules = createServerFn({ method: 'GET' }).handler(
  async () => {
    const userId = await getUserId();
    return (await db.query.repeatingRules.findMany({
      where: and(
        eq(repeatingRules.userId, userId),
        isNull(repeatingRules.deletedAt),
      ),
      orderBy: asc(repeatingRules.createdAt),
    })) as RepeatingRuleRecord[];
  },
);

export const getRepeatingRule = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const userId = await getUserId();
    const rule = await db.query.repeatingRules.findFirst({
      where: and(
        eq(repeatingRules.id, data.id),
        eq(repeatingRules.userId, userId),
        isNull(repeatingRules.deletedAt),
      ),
    });
    return (rule ?? null) as RepeatingRuleRecord | null;
  });

export const createRepeatingRuleFromTaskFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { taskId: string; rrule: string; startDate: string }) => data,
  )
  .handler(async ({ data }) => {
    const userId = await getUserId();
    const id = await createRepeatingRuleFromTask(
      data.taskId,
      data.rrule,
      data.startDate,
      userId,
    );
    return { id, txid: Date.now() };
  });

export const updateRepeatingRuleFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { id: string; updates: UpdateRepeatingRuleInput }) => data,
  )
  .handler(async ({ data }) => {
    const userId = await getUserId();
    await updateRepeatingRule(data.id, userId, data.updates);
    return { id: data.id, txid: Date.now() };
  });

export const removeRepeatingRuleFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const userId = await getUserId();
    await removeRepeatingRule(data.id, userId);
    return { id: data.id, txid: Date.now() };
  });

export const describeRRuleFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { rrule: string }) => data)
  .handler(async ({ data }) => {
    return { description: describeRRule(data.rrule) };
  });

export const materializeDueRepeatingTasksFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { today?: string }) => data)
  .handler(async ({ data }) => {
    const userId = await getUserId();
    const today = data.today ?? new Date().toISOString().split('T')[0];
    const ids = await spawnDueRepeatingRules(today, userId);
    return { ids, txid: Date.now() };
  });
