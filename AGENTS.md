# Coding Conventions

For Coding Style see [docs/STYLE_GUIDE.md](docs/STYLE_GUIDE.md).

Use Bun instead of Node and npm.

## TypeScript
- **Strict**: No `any`. Use specific types or Generics.
- **Imports**: Import directly from source (e.g., `@/lib/hooks/useData`).
- **Router Typing**: Due to strict route typing, you may need to cast routes if passing variables (e.g., `navigate({ to: '/today' as '/inbox' })`).

## Components
- Functional components only.
- Reuse components in the components/ui directory, for example buttons, checkboxes, etc.
- Use `useEffect` sparingly; prefer derived state or event handlers.
- Co-locate small, specific components in the same file if they aren't reused elsewhere.

## Styling (Tailwind)
- Use `cn()` utility for class merging.
- Support Dark Mode via `dark:` variants.
- Use CSS variables defined in `src/styles.css` for theme colors (e.g., `text-things-blue`).

## Linting
- Only fix **errors**, not warnings.
- Do not add `biome-ignore` comments.

## Debugging

- NEVER try to restart the app, or the server process, EVER.
- NEVER use db:clean or db:seed, EVER

## Tool Calling

ALWAYS USE PARALLEL TOOLS WHEN APPLICABLE.

