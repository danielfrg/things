import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { hashPassword } from 'better-auth/crypto';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { accounts, users } from '@/db/schema';
import { auth } from '@/lib/auth';

export const getSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    return session;
  },
);

export const getSessionUser = createServerFn({ method: 'GET' }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    return session?.user ?? null;
  },
);

export const requireSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session) {
      throw new Error('Unauthorized');
    }

    return session;
  },
);

export const requireUserId = createServerFn({ method: 'GET' }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    return session.user.id;
  },
);

export const updateEmailFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { newEmail: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    try {
      // Update the user's email directly
      const result = await db
        .update(users)
        .set({
          email: data.newEmail,
          updatedAt: new Date(),
        })
        .where(eq(users.id, session.user.id))
        .returning();

      if (!result.length) {
        return { success: false, error: 'Failed to update email' };
      }

      return { success: true, email: data.newEmail };
    } catch (error) {
      console.error('Failed to update email:', error);
      // Check for unique constraint violation
      if (error instanceof Error && error.message.includes('UNIQUE')) {
        return { success: false, error: 'Email already in use' };
      }
      return { success: false, error: 'Failed to update email' };
    }
  });

export const updatePasswordFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { newPassword: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    try {
      // Hash the new password using Better Auth's crypto
      const hashedPassword = await hashPassword(data.newPassword);

      // Update the credential account's password
      await db
        .update(accounts)
        .set({
          password: hashedPassword,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(accounts.userId, session.user.id),
            eq(accounts.providerId, 'credential'),
          ),
        );

      return { success: true };
    } catch (error) {
      console.error('Failed to update password:', error);
      return { success: false, error: 'Failed to update password' };
    }
  });
