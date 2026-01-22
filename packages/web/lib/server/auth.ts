import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
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
