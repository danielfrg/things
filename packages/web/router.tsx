import { createRouter as createTanstackRouter } from '@tanstack/react-router';
import { NotFound } from './components/NotFound';
// Import the generated route tree
import { routeTree } from './routeTree.gen';

import './styles.css';

// Create a new router instance
export function getRouter() {
  return createTanstackRouter({
    routeTree,
    scrollRestoration: true,
    // Prefetch route data on hover/touch for instant navigation
    defaultPreload: 'intent',
    // Small delay to avoid unnecessary preloads on quick mouse movements
    defaultPreloadDelay: 50,
    // Keep preloaded data fresh for 30 seconds
    defaultPreloadStaleTime: 30000,
    defaultNotFoundComponent: NotFound,
  });
}
