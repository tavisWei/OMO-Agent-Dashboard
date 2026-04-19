- 2026-04-13: Treated `src/stores/` as canonical and removed `src/store/` entirely rather than trying to reconcile duplicated agent store implementations.
- 2026-04-13: Preserved UI-created agents across config syncs by adding an `agents.source` discriminator and scoping `clearAgents()` deletes to `source='omo_config'`.
- 2026-04-13: Kept historical activity log names stable by adding `activity_logs.agent_name` and reading `COALESCE(al.agent_name, a.name)` in activity queries.
- 2026-04-13: Kept agent compatibility during Model Library rollout by tracking model deletion usage through both `agents.model_id` and legacy `agents.model` string values until agent creation/edit flows are updated.
- 2026-04-13: Added `agents.model_id` as a nullable FK to `models(id)` while keeping the legacy `agents.model` string for runtime compatibility with existing OMO config sync/write paths.
- 2026-04-13: Used WebSocket `agent_created` and `agent_deleted` events plus store-side optimistic reconciliation so UI-created agent changes propagate without a full refetch.
- 2026-04-14: Kept legacy task assignment behavior intact by preserving `tasks.agent_id` and defaulting the new `assigned_agents` JSON field to `[agent_id]` for newly created single-agent tasks.
- 2026-04-14: Added normalized task metadata fields directly to `tasks` for backward-compatible reads/writes, while also introducing dedicated `task_agent_assignments` and `task_dependencies` tables so later API/orchestration work can move to relational joins without another schema reset.
- 2026-04-14: Implemented task deletion as an explicit parent-child cascade in the API/db layer, while relying on FK cascades for assignment/dependency rows, so later UI work does not leave orphaned subtasks behind.
- 2026-04-14: Stored a single `task_orchestrations` row per task (unique `task_id`) and modeled restarts as record replacement so `GET /api/tasks/:id/orchestration` stays singular and easy for later UI polling/subscription logic.
- 2026-04-14: Kept orchestration progression explicit and testable by using `POST /api/tasks/:id/orchestrate` for `start|advance|fail` actions, while syncing task lifecycle states (`in_progress`/`done`/`failed`) from the orchestration engine instead of adding fake background execution.

## Kanban Board Redesign (Task 17)
- **Lightweight Multi-Agent UI**: Used a simple flex-wrap of badges for multiple agents on cards to keep the UI clean without heavy dependencies.
- **Real-time Sync**: Relied on the existing WebSocket-enabled `taskStore` for updates, ensuring the board stays in sync across clients.
- **Blocking Feedback**: Chose to show a temporary error message and prevent the drag-end action when a blocked task is moved to `in_progress`, providing immediate feedback to the user.
- **New Task Dialog**: Expanded the dialog to include priority, multi-agent selection, and dependency selection to support the full task schema.
