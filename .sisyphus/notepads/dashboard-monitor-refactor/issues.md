
## Task 3: Known Issues / Gotchas

- **agentId = sessionName mismatch:** `agentStatusMonitor` keys runtime entries by tmux session name. If the session name differs from the DB agent name, any UI that joins runtime status to DB agents by name will fail to match.
- **No project context in runtime payload:** `AgentRuntimeStatus` does not include a `projectId` or `projectName`, so project-scoped monitoring UI cannot filter the WS payload server-side and must do client-side correlation.
- **WS message schema inconsistency (minor):** The general `WSMessage` interface uses `payload`, but `agent_status` messages emitted by `AgentStatusMonitor` use `data`. The client hook (`useAgentRuntime.ts`) expects `message.data`, which is correct for the runtime path but diverges from the generic `WSMessage` contract used elsewhere.
- `/api/activity-logs` 500 was caused by the route using CommonJS `require(...)` inside an ESM server file plus `database.exec(..., params)` for parameterized reads; switching to direct ESM import + sql.js prepared statements restores HTTP 200 JSON responses.
- Startup cleanup is now invoked explicitly in `src/server/index.ts` right after DB initialization, and `cleanupHistoricalData()` was narrowed to historical dashboard tables only so configured/synced agents are not destructively wiped.
