import {
  createRootRoute,
  HeadContent,
  Outlet,
  redirect,
  Scripts,
} from '@tanstack/react-router';
import { type ReactNode, useEffect } from 'react';

import { AppLayout } from '@/components/layout/AppLayout';
import { getAreas } from '@/lib/server/areas';
import { getSession } from '@/lib/server/auth';
import { getChecklistItems } from '@/lib/server/checklistItems';
import { getHeadings } from '@/lib/server/headings';
import { getProjects } from '@/lib/server/projects';
import {
  getRepeatingRules,
  materializeDueRepeatingTasksFn,
} from '@/lib/server/repeatingRules';
import { getTags, getTaskTags } from '@/lib/server/tags';
import { getTasks } from '@/lib/server/tasks';
import appCss from '../styles.css?url';

// Routes that don't require authentication
const publicRoutes = ['/login', '/register', '/api/auth'];

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Things',
      },
      {
        name: 'theme-color',
        content: '#000000',
      },
      {
        name: 'mobile-web-app-capable',
        content: 'yes',
      },
      {
        name: 'apple-mobile-web-app-status-bar-style',
        content: 'black-translucent',
      },
      {
        name: 'apple-mobile-web-app-title',
        content: 'Things',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
      {
        rel: 'apple-touch-icon',
        href: '/apple-touch-icon.png',
      },
    ],
  }),
  beforeLoad: async ({ location }) => {
    // Check if this is a public route
    const isPublicRoute = publicRoutes.some((route) =>
      location.pathname.startsWith(route),
    );

    if (isPublicRoute) {
      return { session: null, isPublicRoute: true };
    }

    // Get session for protected routes
    const session = await getSession();

    if (!session) {
      throw redirect({ to: '/login' });
    }

    return { session, isPublicRoute: false };
  },
  loader: async ({ context }) => {
    // Skip data loading for public routes or unauthenticated users
    if (context.isPublicRoute || !context.session) {
      return {
        tasks: [],
        projects: [],
        areas: [],
        tags: [],
        taskTags: [],
        headings: [],
        checklistItems: [],
        repeatingRules: [],
        user: null,
      };
    }

    // Materialize due repeating tasks before fetching data
    const today = new Date().toISOString().split('T')[0];
    await materializeDueRepeatingTasksFn({ data: { today } });

    const [
      tasks,
      projects,
      areas,
      tags,
      taskTags,
      headings,
      checklistItems,
      repeatingRules,
    ] = await Promise.all([
      getTasks(),
      getProjects(),
      getAreas(),
      getTags(),
      getTaskTags(),
      getHeadings(),
      getChecklistItems(),
      getRepeatingRules(),
    ]);

    return {
      tasks,
      projects,
      areas,
      tags,
      taskTags,
      headings,
      checklistItems,
      repeatingRules,
      user: context.session.user,
    };
  },
  notFoundComponent: RootNotFoundComponent,
  errorComponent: RootErrorComponent,
  component: RootComponent,
});

function RootComponent() {
  const data = Route.useLoaderData();
  const { isPublicRoute } = Route.useRouteContext();

  // For public routes, just render the outlet directly
  if (isPublicRoute) {
    return (
      <RootDocument>
        <Outlet />
      </RootDocument>
    );
  }

  return (
    <RootDocument>
      <AppLayout initialData={data}>
        <Outlet />
      </AppLayout>
    </RootDocument>
  );
}

function RootNotFoundComponent() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-xl font-semibold">Not Found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page doesn't exist.
        </p>
      </div>
    </div>
  );
}

function RootErrorComponent({ error }: { error: unknown }) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Unknown error';

  console.error('Root error:', error);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-xl font-semibold text-destructive">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The app hit an unexpected error while rendering.
        </p>
        <pre className="mt-4 whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-xs">
          {message}
        </pre>
      </div>
    </div>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  // Remove hydrating class once JS is loaded
  useEffect(() => {
    document.body.classList.remove('hydrating');
  }, []);

  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration.scope);
        })
        .catch((error) => {
          console.log('SW registration failed:', error);
        });
    }
  }, []);

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground hydrating">
        {children}
        <Scripts />
      </body>
    </html>
  );
}
