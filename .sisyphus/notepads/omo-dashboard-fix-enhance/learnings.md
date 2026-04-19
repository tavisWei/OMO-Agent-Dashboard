- 2026-04-13: Existing SQLite databases need additive migrations for `agents.source` and `activity_logs.agent_name`; relying on `CREATE TABLE IF NOT EXISTS` alone is insufficient.
- 2026-04-13: Agent status usage is split across UI badges, runtime cards, and server polling, so expanding the canonical union requires updating all status label/color maps.
- 2026-04-13: Adding a new foreign-key-backed column to an existing sql.js table requires creating indexes only after additive column migration/rebuild; otherwise startup can fail on missing-column indexes before migration repair runs.
- 2026-04-13: With sql.js, capture `getRowsModified()` before calling `saveDatabase()`; otherwise successful `UPDATE`/`DELETE` operations can incorrectly report zero modified rows.
- 2026-04-13: Agent CRUD changes also need test fixture updates because `Agent` literals in route tests must now include `model_id`.
- 2026-04-14: For legacy `tasks` tables in sql.js, adding new task metadata columns with `ALTER TABLE ... ADD COLUMN` plus backfill `UPDATE`s is the safest startup path when new dependency tables also reference `tasks`, because rebuilding `tasks` can complicate foreign-key propagation.
- 2026-04-14: Task JSON compatibility fields (`depends_on`, `labels`, `assigned_agents`) should be normalized both on write and on read so legacy rows remain queryable while newer API layers can consume array-shaped metadata.
- 2026-04-14: Keeping `task_agent_assignments` and `task_dependencies` in sync with legacy `tasks.agent_id`, `tasks.assigned_agents`, and `tasks.depends_on` lets new multi-agent endpoints ship without breaking older simple task CRUD callers.
- 2026-04-14: A persisted orchestration state machine can stay deterministic by treating `task_orchestrations.current_step` as a completed-step counter and deriving sequential/parallel/pipeline step views from `pattern + agent_order + status` instead of storing per-step runtime rows.
- 2026-04-14: Legacy tasks may not have `task_agent_assignments` rows yet, so orchestration startup needs a fallback order synthesized from `tasks.assigned_agents` and `tasks.agent_id` to remain backward-compatible.

## Kanban Board & Task Metadata (Task 17)
- **Multi-Agent Display**: Task cards now iterate over `assigned_agents` to show multiple agent badges.
- **Dependency Visualization**: Added a "Blocked" indicator on cards when `depends_on` tasks are not 'done'.
- **Drag-and-Drop Validation**: Implemented client-side validation in `KanbanBoard.tsx` to prevent moving blocked tasks to `in_progress`, matching server-side constraints.
- **Filtering**: Added agent and priority filters to the Kanban board for better task management in complex projects.

## Unit Tests for New API Endpoints (Task 23)
- When mocking `../orchestrator.js` in tasks route tests, must use partial mock (`importOriginal`) to preserve `TASK_ORCHESTRATION_PATTERNS` and `TASK_ORCHESTRATION_ACTIONS` constants — full auto-mock replaces them with `vi.fn()` causing payload validation to fail.
- Pre-existing `db/index.test.ts` failures (6 tests) are caused by column index shifts from schema migrations adding new columns to agents/tasks/activity_logs tables; these are not related to new test additions.
- Agents API tests (POST create, DELETE custom, DELETE blocked for omo_config) already existed in `projects.test.ts`.
