# Things: Task Management System

Packages:

- packages/server: Hono API uses Drizzle ORM with SQLite
- packages/web: Solid.js SPA uses Tailwind CSS v4
- packages/sdk: Generated TypeScript client from the API used by the web app

## Coding Conventions

For Coding Style see [STYLE_GUIDE.md](STYLE_GUIDE.md).

- Runtime: Use Bun instead of Node or npm for all tasks.
- API Access: NEVER make raw HTTP requests using `fetch`. ALWAYS use the generated client from `@things/sdk`.
- Naming: Prefer single-word naming for variables and functions where possible.
- Files: Keep all filenames lowercase with words separated by dashes.

## TypeScript

- Strictness: No `any`. Use specific types or Generics.
- IDs: Use the prefixed ID system (e.g., `tsk_`, `prj_`, `are_`). Logic for this is in `packages/server/src/lib/id.ts`.
- Imports: Import directly from source or using the `@/` alias (e.g., `@/components/ui/button`).

## Solid.js Best Practices

Follow these strictly to ensure fine-grained reactivity and optimal performance:

### 1. JSX Prop Passing

- Call functions for Signals: Pass the value to props by calling the signal: `<User id={id()} />`.
- DO NOT pass the accessor: `<User id={id} />`. Components should receive values, not accessors, to stay agnostic of the data source.

### 2. Never Destructure Props

- Destructuring `const { name } = props` breaks reactivity by extracting the value from the reactive getter.
- ALWAYS access props directly in JSX or reactive scopes: `<h1>{props.name}</h1>`.
- Use `splitProps` if you need to separate or omit attributes.

### 3. Reactive Scopes & Function Wrappers

- The component body runs **only once** as setup code.
- If logic needs to be reactive, wrap it in a function: `const doubled = () => count() * 2`.
- Read signals inside reactive scopes: JSX expressions, `createMemo`, or `createEffect`.

### 4. Control Flow Components

- Prefer `<Show when={...}>` over JavaScript logical operators (`&&`) or ternary operators.
- ALWAYS use `<For each={...}>` instead of `.map()` for rendering lists. It preserves item identity and minimizes DOM churn.

### 5. Sparse createEffect & Derivation

- Derive everything: Use functions or `createMemo` for values that depend on other state.
- Avoid `createEffect` to sync state (e.g., setting signal B because signal A changed).
- Use `createResource` for async data fetching to integrate with Suspense.
- Use `createEffect` only for side effects (DOM manipulation, 3rd-party libs).

### 6. Stores for Complex Objects

- Use `createStore` for nested objects or arrays.
- Stores provide path-based reactivity, ensuring that updating `store.task.title` only notifies observers of that specific property.

## Components

- Solid.js: Functional components only. Use Signals for state; use `createMemo` for derived state.
- Side Effects: Use `createEffect` sparingly; prefer event handlers or derived state.
- UI Library: Reuse components in `packages/web/src/components/ui`. Do not recreate standard elements like buttons or inputs.
- Context: Use `createSimpleContext` (found in `packages/web/src/context/context.tsx`) to manage shared state.
- Co-location: Small, specific components should be kept in the same file as their parent if they are not reused elsewhere.

## Data & Sync

- TaskRepository: The `TaskRepository` is the single source of truth for task data. View-specific adapters in `view-adapters.ts` provide specific interfaces for pages.
- SSE: Real-time updates are handled via Server-Sent Events (SSE). Listen for events via `useEvent()`.
- Optimistic UI: Use the `usePendingChanges` or `useStickyFields` hooks in `packages/web/src/context/pending-changes.ts` to manage local UI state while mutations are in-flight.

## Linting & Formatting

- Only fix errors, not warnings.
- Do not add `eslint-ignore` comments.
- Run `bun run format` to apply Prettier rules.

## Debugging

- NEVER try to restart the app or the server process.
- NEVER run `db:reset` or `db:seed` on an active environment.

## Tool Calling

- ALWAYS USE PARALLEL TOOLS WHEN APPLICABLE.
