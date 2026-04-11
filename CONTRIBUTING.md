# Contributing to OMO Agent Dashboard

Thank you for your interest in contributing.

## Development Setup

```bash
git clone https://github.com/your-username/OMO-Agent-Dashboard.git
cd OMO-Agent-Dashboard
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

## Branch Strategy

- `main` — stable, always buildable
- `feat/*` — new features
- `fix/*` — bug fixes
- `refactor/*` — code restructuring without behavior change

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add cost export to CSV
fix: sidebar not collapsing on small screens
refactor: extract WebSocket logic into separate module
```

## Adding a New Feature

1. Open an issue describing the feature or discuss it first
2. Create a branch from `main`
3. Implement, keeping behavior aligned with `SPEC.md`
4. Add TypeScript types for any new data structures
5. Ensure `npm run build` passes with no errors

## Adding a New API Route

1. Add route handler in `src/server/routes/<resource>.ts`
2. Export the router and mount it in `src/server/index.ts`
3. Add TypeScript types in `src/types/index.ts`
4. Update README.md API section if the route is user-facing

## Adding a New Frontend Component

1. Create component under `src/components/`
2. Export from `src/components/index.ts`
3. Keep Zustand stores in `src/stores/` — avoid prop drilling
4. Use Tailwind utility classes for styling

## Running Tests

Currently there are no automated tests. Run the build as a sanity check:

```bash
npm run build
```

## Reporting Issues

Please include:
- Steps to reproduce
- Expected vs actual behavior
- Node.js version and OS
- Any relevant logs or screenshots

## Code Style

- TypeScript strict mode is enforced by the tsconfig
- Use functional React components with hooks
- Prefer `const` over `let`
- No `any` types unless absolutely necessary
- Format on save via your editor (prettier-compatible)

## Questions

Open an issue for discussion before opening a large PR. Small fixes and typos can go straight to a PR.
