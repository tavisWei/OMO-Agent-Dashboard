
## Task 3: Decisions Record

- **No source code changes were made** in Task 3; this is a pure documentation task.
- The runtime data flow was confirmed to be: tmux poll → `agentStatusMonitor.updateStatus()` → WS broadcast → `useAgentRuntime` hook → `agentRuntimeStore`.
- Decision deferred to Task 5/6: whether to enrich `AgentRuntimeStatus` with a real DB `agentId` and/or `projectId`, or keep the name-based correlation and do the join in the UI layer.
