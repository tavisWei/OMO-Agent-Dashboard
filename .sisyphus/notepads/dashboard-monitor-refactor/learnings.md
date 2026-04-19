
## Task 3: Agent Runtime Data Flow Tracing

### Verified Data Flow Chain

1. **Tmux Polling** (`src/server/index.ts`, `startTmuxPolling()`)
   - Runs every 5000ms via `setInterval`.
   - Executes `tmux list-sessions -F "#{session_name}|#{session_activity}|#{session_windows}"`.
   - Parses each line into `{ name, status: 'running' | 'idle', windowCount }`.
   - **Calls `agentStatusMonitor.updateStatus(session.name, status, session.name)` for every session.**

2. **`agentStatusMonitor.updateStatus()`** (`src/server/agentStatus.ts`)
   - Stores runtime state in a private `Map<string, AgentRuntimeStatus>` keyed by `agentId`.
   - Updates `lastUpdate` to `new Date().toISOString()`.
   - Immediately triggers `this.broadcast()`.

3. **WebSocket Broadcast** (`src/server/agentStatus.ts` + `src/server/websocket.ts`)
   - `broadcast()` stringifies: `JSON.stringify({ type: 'agent_status', data: status })`.
   - `status` is the full array from `getStatus()` (`Array.from(this.status.values())`).
   - Sends to every client where `readyState === WebSocket.OPEN`.
   - On new connection (`websocket.ts`), server also pushes a one-time `agent_status` message with current data.

4. **Client Hook Consumption** (`src/hooks/useAgentRuntime.ts`)
   - Connects to `ws://${window.location.hostname}:3001`.
   - On `message`, checks `message.type === 'agent_status'`.
   - If matched, calls `setAgents(message.data)`.

5. **Zustand Store** (`src/stores/agentRuntimeStore.ts`)
   - `setAgents(agents)` rebuilds a `Map<string, AgentRuntime>` using `agent.agentId` as the key.
   - Store shape: `{ agents: Map<string, AgentRuntime>, wsConnected: boolean }`.

### Critical Mapping Fact

- **`agentId` in the runtime store is currently the tmux session name, NOT the database agent ID.**
  - `updateStatus(session.name, status, session.name)` uses `session.name` as both the `agentId` and `sessionName`.
  - There is no lookup against the DB agents table during polling.
  - If a tmux session name does not match an agent name from the OMO config / DB, the runtime entry will still exist but will not correlate to a known agent record without additional mapping logic.

### WebSocket URL & Message Contract

- **URL:** `ws://${window.location.hostname}:3001` (no path, no subprotocol).
- **Server→Client runtime message format:**
  ```json
  {
    "type": "agent_status",
    "data": [
      { "agentId": "<tmux-session-name>", "status": "running|idle|...", "lastUpdate": "...", "sessionName": "<tmux-session-name>" }
    ]
  }
  ```
- **Client filter:** `if (message.type === 'agent_status') { setAgents(message.data); }`

### Gotchas for Later Tasks

- **Project filtering is impossible at the runtime layer today** because `AgentRuntimeStatus` carries no project information. The tmux poller does not know which project a session belongs to.
- **Session-to-agent matching is name-based and fragile.** Any rename divergence between tmux session and DB `agent.name` breaks correlation.
- **`updateAgent` in the store exists but is never used by the hook.** The hook only uses `setAgents`, which replaces the entire Map on every `agent_status` message.
- **No cleanup of stale statuses.** If a tmux session ends, the server stops sending updates for that key, but the client Map is fully overwritten by `setAgents`, so stale entries disappear naturally on the next broadcast. However, if the server has zero sessions, it broadcasts an empty array, which correctly clears the client Map.
