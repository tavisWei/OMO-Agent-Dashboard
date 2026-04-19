# OMO Agent Dashboard - 修复与渐进增强

## TL;DR

> **Quick Summary**: 修复现有 OMO Agent Dashboard 的 6 个阻塞性 bug 使其可运行，然后渐进增强：新增 Agent CRUD + 集中式 Model 库 + 全新任务系统（多 Agent 协作编排优先）。
> 
> **Deliverables**:
> - 可正常运行的 Dashboard（修复 CORS、API_BASE、重复 store、参数不匹配、类型冲突、clearAgents 数据丢失）
> - 移除 Chat 功能
> - Agent 创建/编辑/删除 UI + POST API
> - 集中式 Model 库（全局模型注册表）
> - 重新设计的任务系统（多 Agent 协作编排 → Issue 工作流 → 子任务+依赖 → 任务队列）
> - 完整的 ProjectDetail 和 AgentDetail 页面
> - 新功能的单元测试 + E2E 冒烟测试
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 6 waves
> **Critical Path**: Bug fixes → Agent CRUD → Model Library → Task System Redesign → Detail Pages → Tests

---

## Context

### Original Request
用户希望修复无法运行的 OMO Agent Dashboard，并增强为一个完整的多 Agent 服务管理看板，支持管理多 Agent 任务、创建管理多 Agent、选择管理多 Agent 的 model。

### Interview Summary
**Key Discussions**:
- Agent 创建方式: 保持 OMO 配置同步 + 新增 UI 创建
- Chat 功能: 移除（当前是 mock）
- 任务系统: 完全重新设计，优先级：多Agent协作编排 → Issue工作流 → 子任务+依赖 → 简单任务队列
- Model 管理: 集中式 Model 库
- 实施策略: 修复优先，渐进增强
- 测试策略: 修复后补测试
- i18n: 保留中英文
- 部署: 本地开发使用

**Research Findings**:
- 代码完成度 ~75%，大部分是真实实现
- 6 个阻塞性 bug（含 Metis 发现的 clearAgents 数据丢失）
- 同类项目（AutoGen Studio、OpenHands、CrewAI）使用 Grid视图 + Detail抽屉 + 任务队列模式
- SSE 推荐但不在本次范围内（保持现有 WebSocket）

### Metis Review
**Identified Gaps** (addressed):
- Bug 6 发现: `syncOMOConfig()` 调用 `clearAgents()` 会在重启时清除所有 UI 创建的 agent → 纳入 Phase 1 修复
- API_BASE 不一致比预期更广: `NewProjectDialog.tsx` 和 `projectStore.ts` 也有硬编码 → 全部统一
- `activity_logs` 表缺少 `agent_name` 列但 TypeScript 接口有 → 纳入修复
- WebSocket `task_update` 是死代码路径 → 任务系统重设计时激活
- 类型定义分散在 `types/index.ts` 和 `db/schema.ts` → 统一到 `types/index.ts`

---

## Work Objectives

### Core Objective
修复 OMO Agent Dashboard 使其可正常运行，然后渐进增强为完整的多 Agent 管理平台，支持 Agent CRUD、集中式 Model 库、多 Agent 协作任务系统。

### Concrete Deliverables
- 可运行的 Dashboard（`npm run dev` 无错误启动）
- Agent CRUD API + UI（创建、编辑、删除）
- Model 库 API + UI（全局模型注册表）
- 新任务系统（多 Agent 编排、Issue 工作流、子任务、依赖关系）
- ProjectDetail 页面（项目内 Agent 列表 + 任务看板）
- AgentDetail 页面（Agent 配置 + 活动日志 + 任务列表）

### Definition of Done
- [ ] `npm run dev` 启动无错误
- [ ] `curl http://localhost:3001/api/agents` 返回 200
- [ ] 浏览器 `http://localhost:3002` 无 CORS 错误
- [ ] 可从 UI 创建新 Agent
- [ ] 可从 Model 库选择模型
- [ ] 可创建多 Agent 协作任务
- [ ] ProjectDetail 和 AgentDetail 页面完整
- [ ] `npm run test:run` 通过

### Must Have
- 修复所有 6 个阻塞性 bug
- 移除 Chat 功能
- Agent CRUD（UI + API）
- 集中式 Model 库
- 任务系统重设计（至少多 Agent 编排 + Issue 工作流）
- ProjectDetail 和 AgentDetail 实现
- 保留 i18n 中英文

### Must NOT Have (Guardrails)
- 不切换 WebSocket 到 SSE（保持现有实现）
- 不为现有代码补写回归测试（只测新功能）
- 不扩展任务队列为后台作业处理系统
- 不添加用户认证/权限
- 不添加 Docker 部署
- 不添加云同步/多设备同步
- 不添加移动端适配
- 不在 Phase 1 添加任何新功能
- 不使用 `src/store/` 目录（统一用 `src/stores/`）
- 不在组件中硬编码 `http://localhost:3001/api`（统一用 Vite proxy `/api`）

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: Tests-after (修复后补测试)
- **Framework**: vitest (unit) + playwright (e2e)
- **Pattern**: 每个 Phase 完成后补充对应测试

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright - Navigate, interact, assert DOM, screenshot
- **API/Backend**: Use Bash (curl) - Send requests, assert status + response fields
- **Database**: Use Bash (node REPL) - Query DB, verify schema

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Bug Fixes - foundation, MAX PARALLEL):
├── Task 1: Fix CORS + Vite proxy setup [quick]
├── Task 2: Standardize API_BASE across all files [quick]
├── Task 3: Delete duplicate src/store/ + unify types [quick]
├── Task 4: Fix cost API param + agent status types [quick]
├── Task 5: Fix clearAgents() data loss + activity_logs schema [quick]
├── Task 6: Remove Chat feature completely [quick]
└── Task 7: Smoke test gate - verify app runs [quick]

Wave 2 (Agent CRUD + Model Library, PARALLEL):
├── Task 8: Model library - DB schema + API (depends: 7) [deep]
├── Task 9: Agent CRUD - POST/DELETE API + OMO sync fix (depends: 7) [deep]
├── Task 10: Model library - UI component (depends: 8) [visual-engineering]
├── Task 11: Agent creation form UI (depends: 9, 10) [visual-engineering]
└── Task 12: Agent edit/delete UI enhancements (depends: 9) [visual-engineering]

Wave 3 (Task System Redesign - Schema + API, PARALLEL):
├── Task 13: Task system - new DB schema + migration (depends: 7) [deep]
├── Task 14: Task system - CRUD API with multi-agent support (depends: 13) [deep]
├── Task 15: Task system - orchestration engine (depends: 13) [ultrabrain]
└── Task 16: Task system - WebSocket task_update activation (depends: 14) [quick]

Wave 4 (Task System UI + Detail Pages, PARALLEL):
├── Task 17: New Kanban board with multi-agent tasks (depends: 14, 16) [visual-engineering]
├── Task 18: Task detail view + sub-task management (depends: 14) [visual-engineering]
├── Task 19: ProjectDetail page implementation (depends: 9, 14) [visual-engineering]
├── Task 20: AgentDetail page implementation (depends: 9, 14) [visual-engineering]
└── Task 21: Task dependency visualization (depends: 15) [visual-engineering]

Wave 5 (i18n + Polish, PARALLEL):
├── Task 22: i18n updates for all new features (depends: 17-21) [quick]
├── Task 23: Unit tests for new API endpoints (depends: 9, 14) [unspecified-high]
├── Task 24: E2E smoke tests per phase (depends: 17-21) [unspecified-high]
└── Task 25: Empty states + error boundaries (depends: 17-21) [visual-engineering]

Wave FINAL (After ALL tasks — 4 parallel reviews, then user okay):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1-6 | None | 7 | 1 |
| 7 | 1-6 | 8-16 | 1 |
| 8 | 7 | 10, 11 | 2 |
| 9 | 7 | 11, 12, 19, 20 | 2 |
| 10 | 8 | 11 | 2 |
| 11 | 9, 10 | - | 2 |
| 12 | 9 | - | 2 |
| 13 | 7 | 14, 15 | 3 |
| 14 | 13 | 16, 17, 18, 19, 20 | 3 |
| 15 | 13 | 21 | 3 |
| 16 | 14 | 17 | 3 |
| 17 | 14, 16 | 22-25 | 4 |
| 18 | 14 | 22-25 | 4 |
| 19 | 9, 14 | 22-25 | 4 |
| 20 | 9, 14 | 22-25 | 4 |
| 21 | 15 | 22-25 | 4 |
| 22-25 | 17-21 | F1-F4 | 5 |

### Agent Dispatch Summary

- **Wave 1**: 7 tasks → all `quick`
- **Wave 2**: 5 tasks → T8,T9 `deep`, T10-T12 `visual-engineering`
- **Wave 3**: 4 tasks → T13,T14 `deep`, T15 `ultrabrain`, T16 `quick`
- **Wave 4**: 5 tasks → all `visual-engineering`
- **Wave 5**: 4 tasks → T22 `quick`, T23-T24 `unspecified-high`, T25 `visual-engineering`
- **FINAL**: 4 tasks → F1 `oracle`, F2 `unspecified-high`, F3 `unspecified-high`, F4 `deep`

---

## TODOs

- [x] 1. Fix CORS + Setup Vite Proxy

  **What to do**:
  - Fix `src/server/index.ts:28`: Change CORS origin from `http://localhost:3001` to `http://localhost:3002`
  - Verify `vite.config.ts` has proxy config: `/api` → `http://localhost:3001`
  - If proxy missing, add it to Vite config
  - Test: server on 3001, client on 3002, API calls work through proxy

  **Must NOT do**:
  - Don't change server port
  - Don't add any new features

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2-6)
  - **Blocks**: Task 7
  - **Blocked By**: None

  **References**:
  - `src/server/index.ts:28` - CORS origin line to fix
  - `vite.config.ts` - Vite proxy configuration (already has `/api` proxy to localhost:3001)
  - `package.json:7-9` - dev script runs server on 3001, client on 3002

  **Acceptance Criteria**:
  **QA Scenarios:**
  ```
  Scenario: CORS allows client origin
    Tool: Bash (curl)
    Steps:
      1. Start dev server: npm run dev (background)
      2. curl -I -H "Origin: http://localhost:3002" http://localhost:3001/api/agents
      3. Assert response header contains: Access-Control-Allow-Origin: http://localhost:3002
    Expected Result: CORS header matches client port 3002
    Evidence: .sisyphus/evidence/task-1-cors-fix.txt

  Scenario: Vite proxy forwards API calls
    Tool: Bash (curl)
    Steps:
      1. curl http://localhost:3002/api/agents
      2. Assert response is 200 with JSON array (not CORS error)
    Expected Result: Proxy forwards /api to backend
    Evidence: .sisyphus/evidence/task-1-proxy-forward.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `fix: resolve CORS and proxy configuration`
  - Files: `src/server/index.ts`, `vite.config.ts`

- [x] 2. Standardize API_BASE Across All Files

  **What to do**:
  - Use `ast_grep_search` to find ALL occurrences of `http://localhost:3001/api` in the codebase
  - Replace ALL with `/api` (relative, goes through Vite proxy)
  - Known files: `src/store/agentStore.ts`, `src/stores/projectStore.ts`, `src/components/NewProjectDialog.tsx`, `src/components/AgentChat.tsx`
  - Verify no other hardcoded API URLs remain

  **Must NOT do**:
  - Don't change any API logic, only the base URL string

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3-6)
  - **Blocks**: Task 7
  - **Blocked By**: None

  **References**:
  - `src/store/agentStore.ts:4` - `API_BASE = 'http://localhost:3001/api'`
  - `src/stores/projectStore.ts:23` - hardcoded absolute URL
  - `src/components/NewProjectDialog.tsx:10` - hardcoded absolute URL
  - `src/components/AgentChat.tsx` - hardcoded absolute URL
  - `src/stores/agentStore.ts:33` - already uses `/api` (correct pattern to follow)

  **Acceptance Criteria**:
  **QA Scenarios:**
  ```
  Scenario: No hardcoded localhost URLs remain
    Tool: Bash (grep)
    Steps:
      1. grep -r "localhost:3001/api" src/ --include="*.ts" --include="*.tsx"
      2. Assert: zero matches
    Expected Result: No hardcoded API URLs in source
    Evidence: .sisyphus/evidence/task-2-no-hardcoded-urls.txt

  Scenario: API calls work through proxy
    Tool: Bash (curl)
    Steps:
      1. curl http://localhost:3002/api/projects
      2. Assert: 200 with JSON array
    Expected Result: All API calls route through Vite proxy
    Evidence: .sisyphus/evidence/task-2-proxy-works.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `fix: standardize API_BASE to use Vite proxy`
  - Files: `src/stores/projectStore.ts`, `src/components/NewProjectDialog.tsx`, `src/components/AgentChat.tsx`

- [x] 3. Delete Duplicate Store + Unify Type Definitions

  **What to do**:
  - Use `lsp_find_references` on `src/store/agentStore.ts` exports to verify nothing imports from it
  - Delete entire `src/store/` directory
  - Unify type definitions: ensure `types/index.ts` is the single source of truth
  - If `db/schema.ts` has duplicate type definitions, make them import from `types/index.ts`

  **Must NOT do**:
  - Don't change any type shapes, only consolidate locations
  - Don't modify `src/stores/` (the canonical store directory)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-2, 4-6)
  - **Blocks**: Task 7
  - **Blocked By**: None

  **References**:
  - `src/store/agentStore.ts` - DUPLICATE to delete (101 lines, no WebSocket, wrong API_BASE)
  - `src/stores/agentStore.ts` - CANONICAL store (159 lines, has WebSocket, correct API_BASE)
  - `src/types/index.ts` - Type definitions (should be single source)
  - `src/db/schema.ts` - May have duplicate types
  - `src/App.tsx:12` - imports from `./stores/agentStore` (correct)

  **Acceptance Criteria**:
  **QA Scenarios:**
  ```
  Scenario: Duplicate store directory removed
    Tool: Bash
    Steps:
      1. ls src/store/ 2>/dev/null
      2. Assert: directory does not exist (exit code 2)
    Expected Result: src/store/ directory is gone
    Evidence: .sisyphus/evidence/task-3-no-duplicate-store.txt

  Scenario: No broken imports
    Tool: Bash
    Steps:
      1. grep -r "from.*['\"].*store/agentStore" src/ --include="*.ts" --include="*.tsx"
      2. Assert: zero matches (no imports from deleted directory)
    Expected Result: All imports use src/stores/ path
    Evidence: .sisyphus/evidence/task-3-imports-clean.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `fix: remove duplicate store and unify type definitions`
  - Files: `src/store/` (deleted), `src/types/index.ts`, `src/db/schema.ts`

- [x] 4. Fix Cost API Param + Agent Status Types

  **What to do**:
  - Fix `src/stores/costStore.ts:53`: Change `range=${timeRange}` to `dateRange=${timeRange}`
  - Unify agent status types across codebase:
    - Canonical set: `'idle' | 'running' | 'error' | 'stopped' | 'thinking' | 'offline'`
    - Update `src/types/index.ts` AgentStatus type
    - Update `src/db/schema.ts` status column comment
    - Ensure `src/server/agentStatus.ts` and `src/stores/agentRuntimeStore.ts` use same type

  **Must NOT do**:
  - Don't change cost calculation logic
  - Don't add new status values beyond unifying existing ones

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-3, 5-6)
  - **Blocks**: Task 7
  - **Blocked By**: None

  **References**:
  - `src/stores/costStore.ts:53` - sends `range` but server expects `dateRange`
  - `src/server/routes/cost.ts:19` - reads `req.query.dateRange`
  - `src/types/index.ts:2` - AgentStatus type definition
  - `src/db/schema.ts:126` - DB status column
  - `src/server/agentStatus.ts:5` - runtime status values
  - `src/stores/agentRuntimeStore.ts` - runtime store status type

  **Acceptance Criteria**:
  **QA Scenarios:**
  ```
  Scenario: Cost API returns filtered data
    Tool: Bash (curl)
    Steps:
      1. curl "http://localhost:3001/api/cost-records?dateRange=week"
      2. Assert: 200 with JSON array (may be empty but not error)
    Expected Result: dateRange parameter is recognized by server
    Evidence: .sisyphus/evidence/task-4-cost-param-fix.txt

  Scenario: Agent status types are consistent
    Tool: Bash (grep)
    Steps:
      1. grep -n "thinking\|offline\|stopped" src/types/index.ts
      2. Assert: all three values present in AgentStatus type
    Expected Result: Unified status type includes all values
    Evidence: .sisyphus/evidence/task-4-status-types.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `fix: correct cost API param and unify agent status types`
  - Files: `src/stores/costStore.ts`, `src/types/index.ts`, `src/db/schema.ts`, `src/server/agentStatus.ts`

- [x] 5. Fix clearAgents() Data Loss + activity_logs Schema

  **What to do**:
  - Fix `src/server/index.ts:63`: `syncOMOConfig()` calls `clearAgents()` which wipes ALL agents on restart
  - Change to merge strategy: sync OMO config agents without deleting UI-created agents
  - Add `source` column to agents table: `'omo_config' | 'ui_created'`
  - Only clear+resync agents where `source = 'omo_config'`
  - Fix `activity_logs` table: add `agent_name` column or ensure JOIN works correctly
  - Update `src/db/migrations.ts` with new migration

  **Must NOT do**:
  - Don't change OMO config file format
  - Don't add new features beyond the merge strategy

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-4, 6)
  - **Blocks**: Task 7
  - **Blocked By**: None

  **References**:
  - `src/server/index.ts:63` - syncOMOConfig() with clearAgents() call
  - `src/db/index.ts` - clearAgents() function definition
  - `src/db/schema.ts` - agents table schema (needs `source` column)
  - `src/db/migrations.ts` - migration runner
  - `src/config/omo-reader.ts` - reads OMO config
  - `src/types/index.ts:127` - ActivityLog interface has `agent_name`

  **Acceptance Criteria**:
  **QA Scenarios:**
  ```
  Scenario: UI-created agents survive restart
    Tool: Bash (curl)
    Steps:
      1. POST /api/agents with {name: "test-ui-agent", model: "gpt-4", source: "ui_created"}
      2. Restart server (kill + start)
      3. GET /api/agents
      4. Assert: "test-ui-agent" still exists in response
    Expected Result: UI-created agents persist across restarts
    Evidence: .sisyphus/evidence/task-5-agent-persist.txt

  Scenario: OMO config agents still sync
    Tool: Bash (curl)
    Steps:
      1. GET /api/agents
      2. Assert: agents from OMO config are present
    Expected Result: OMO sync still works alongside UI agents
    Evidence: .sisyphus/evidence/task-5-omo-sync.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `fix: prevent clearAgents data loss and fix activity_logs schema`
  - Files: `src/server/index.ts`, `src/db/index.ts`, `src/db/schema.ts`, `src/db/migrations.ts`

- [x] 6. Remove Chat Feature Completely

  **What to do**:
  - Delete `src/components/AgentChat.tsx`
  - Delete `src/server/routes/chat.ts`
  - Remove chat route from `src/server/index.ts` (import + app.use)
  - Remove `/chat/:agentId` route from `src/App.tsx`
  - Remove chat-related i18n keys from `src/locales/en.json` and `src/locales/zh.json`
  - Remove chat-related e2e tests if any
  - Ensure no broken imports remain

  **Must NOT do**:
  - Don't remove any non-chat functionality
  - Don't modify other routes or components

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-5)
  - **Blocks**: Task 7
  - **Blocked By**: None

  **References**:
  - `src/components/AgentChat.tsx` - Chat UI component (DELETE)
  - `src/server/routes/chat.ts` - Chat API route (DELETE)
  - `src/server/index.ts:9` - chat route import
  - `src/App.tsx:158` - chat route definition
  - `src/locales/en.json` / `src/locales/zh.json` - chat i18n keys

  **Acceptance Criteria**:
  **QA Scenarios:**
  ```
  Scenario: Chat endpoint returns 404
    Tool: Bash (curl)
    Steps:
      1. curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/chat
      2. Assert: 404
    Expected Result: Chat API no longer exists
    Evidence: .sisyphus/evidence/task-6-chat-removed.txt

  Scenario: No chat imports remain
    Tool: Bash (grep)
    Steps:
      1. grep -r "AgentChat\|chat" src/ --include="*.ts" --include="*.tsx" -l
      2. Assert: zero matches (or only unrelated uses of "chat" word)
    Expected Result: All chat references removed
    Evidence: .sisyphus/evidence/task-6-no-chat-imports.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat: remove chat feature`
  - Files: `src/components/AgentChat.tsx` (deleted), `src/server/routes/chat.ts` (deleted), `src/server/index.ts`, `src/App.tsx`, `src/locales/*.json`

- [x] 7. Wave 1 Smoke Test Gate

  **What to do**:
  - Run `npm run dev` and verify both server and client start
  - Verify all existing pages load without console errors
  - Run all curl smoke tests from Tasks 1-6
  - Create git tag `v0.1.1-wave1-complete` as rollback checkpoint
  - Verify existing features still work: agent grid, project list, cost overview, activity feed, theme switching

  **Must NOT do**:
  - Don't add any new features
  - Don't fix non-blocking issues found during testing

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (after Tasks 1-6)
  - **Blocks**: Tasks 8-16
  - **Blocked By**: Tasks 1-6

  **References**:
  - All files modified in Tasks 1-6
  - `package.json:7` - dev script

  **Acceptance Criteria**:
  **QA Scenarios:**
  ```
  Scenario: Full app smoke test
    Tool: Playwright
    Steps:
      1. Navigate to http://localhost:3002
      2. Assert: page loads, no console errors
      3. Assert: agent grid visible with CSS selector `.agent-card` or similar
      4. Click sidebar "Projects" link
      5. Assert: project list renders
      6. Toggle theme (dark/light)
      7. Assert: theme changes without flash
    Expected Result: All existing features work after bug fixes
    Evidence: .sisyphus/evidence/task-7-smoke-test.png

  Scenario: API endpoints respond correctly
    Tool: Bash (curl)
    Steps:
      1. curl http://localhost:3001/api/agents → 200
      2. curl http://localhost:3001/api/projects → 200
      3. curl http://localhost:3001/api/tasks → 200
      4. curl "http://localhost:3001/api/cost-records?dateRange=week" → 200
      5. curl http://localhost:3001/api/activity-logs → 200
      6. curl http://localhost:3001/api/chat → 404
    Expected Result: All API endpoints respond with correct status codes
    Evidence: .sisyphus/evidence/task-7-api-smoke.txt
  ```

  **Commit**: YES
  - Message: `chore: wave 1 complete - all blocking bugs fixed`
  - Pre-commit: `npm run dev` starts successfully

- [x] 8. Model Library - DB Schema + API

  **What to do**:
  - Create `models` table in DB schema: `id, name, provider, model_id, description, pricing_input, pricing_output, max_tokens, is_active, created_at, updated_at`
  - Seed with common models (OpenAI GPT-4/4o, Anthropic Claude Opus/Sonnet, Google Gemini)
  - Create `src/server/routes/models.ts` with CRUD API:
    - `GET /api/models` - list all models (with optional `?provider=` filter)
    - `POST /api/models` - add model to library
    - `PUT /api/models/:id` - update model
    - `DELETE /api/models/:id` - remove model (check if agents use it first)
  - Add DB CRUD functions in `src/db/index.ts`
  - Register route in `src/server/index.ts`
  - Add Model type to `src/types/index.ts`

  **Must NOT do**:
  - Don't build UI in this task (Task 10 handles that)
  - Don't modify agent creation flow yet

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 9)
  - **Blocks**: Tasks 10, 11
  - **Blocked By**: Task 7

  **References**:
  - `src/db/index.ts` - existing DB CRUD pattern to follow
  - `src/db/schema.ts` - existing schema pattern
  - `src/server/routes/agents.ts` - existing route pattern to follow
  - `src/server/index.ts` - route registration pattern
  - `src/types/index.ts` - type definition location

  **Acceptance Criteria**:
  **QA Scenarios:**
  ```
  Scenario: Model CRUD API works
    Tool: Bash (curl)
    Steps:
      1. GET /api/models → 200 with seeded models array
      2. POST /api/models with {"name":"Custom Model","provider":"openai","model_id":"gpt-4-turbo","max_tokens":128000} → 201
      3. GET /api/models → includes new model
      4. DELETE /api/models/:id → 204
    Expected Result: Full CRUD lifecycle works
    Evidence: .sisyphus/evidence/task-8-model-crud.txt

  Scenario: Cannot delete model in use by agent
    Tool: Bash (curl)
    Steps:
      1. Create model, assign to agent
      2. DELETE /api/models/:id → 409 Conflict
    Expected Result: Deletion blocked with error message
    Evidence: .sisyphus/evidence/task-8-model-delete-guard.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(models): add centralized model library schema and API`
  - Files: `src/db/schema.ts`, `src/db/index.ts`, `src/server/routes/models.ts`, `src/server/index.ts`, `src/types/index.ts`

- [x] 9. Agent CRUD - POST/DELETE API + OMO Sync Fix

  **What to do**:
  - Add `POST /api/agents` endpoint to create agents from UI
  - Set `source: 'ui_created'` for UI-created agents (vs `'omo_config'` for synced)
  - Add `DELETE /api/agents/:id` endpoint (only allow deleting UI-created agents)
  - Update `syncOMOConfig()` to only clear/resync `source='omo_config'` agents
  - Add `model_id` foreign key to agents table (references models table)
  - Create `src/stores/agentStore.ts` actions: `createAgent()`, `deleteAgent()`
  - Update WebSocket to broadcast agent creation/deletion events

  **Must NOT do**:
  - Don't build UI form (Task 11 handles that)
  - Don't allow deleting OMO-config agents from UI

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 8)
  - **Blocks**: Tasks 11, 12, 19, 20
  - **Blocked By**: Task 7

  **References**:
  - `src/server/routes/agents.ts` - existing agent routes (add POST/DELETE)
  - `src/db/index.ts` - existing createAgent function
  - `src/stores/agentStore.ts` - existing store (add create/delete actions)
  - `src/server/websocket.ts` - broadcast pattern
  - `src/config/omo-reader.ts` - OMO config sync logic

  **Acceptance Criteria**:
  **QA Scenarios:**
  ```
  Scenario: Create agent via API
    Tool: Bash (curl)
    Steps:
      1. POST /api/agents with {"name":"UI Agent","model_id":"model-uuid","temperature":0.7}
      2. Assert: 201 with agent object including source: "ui_created"
      3. GET /api/agents → includes new agent
    Expected Result: Agent created and persisted
    Evidence: .sisyphus/evidence/task-9-agent-create.txt

  Scenario: Cannot delete OMO-config agent
    Tool: Bash (curl)
    Steps:
      1. GET /api/agents → find agent with source: "omo_config"
      2. DELETE /api/agents/:id → 403 Forbidden
    Expected Result: OMO agents protected from deletion
    Evidence: .sisyphus/evidence/task-9-omo-protect.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(agents): add Agent CRUD API with OMO sync protection`
  - Files: `src/server/routes/agents.ts`, `src/db/index.ts`, `src/stores/agentStore.ts`, `src/server/websocket.ts`

- [x] 10. Model Library - UI Component

  **What to do**:
  - Create `src/components/ModelLibrary.tsx`: grid/list of available models
  - Model card: name, provider icon, model_id, pricing, max_tokens, active/inactive toggle
  - Add model form (dialog): name, provider dropdown, model_id, pricing fields
  - Delete model button with confirmation (shows warning if agents use it)
  - Create `src/stores/modelStore.ts` with Zustand
  - Add route `/models` in `src/App.tsx`
  - Add "Models" link in Sidebar
  - Add i18n keys for model library

  **Must NOT do**:
  - Don't integrate with agent creation form (Task 11)
  - Don't add model testing/validation

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (after Task 8)
  - **Blocks**: Task 11
  - **Blocked By**: Task 8

  **References**:
  - `src/components/AgentGrid.tsx` - grid layout pattern to follow
  - `src/components/AgentCard.tsx` - card component pattern
  - `src/components/NewProjectDialog.tsx` - dialog/form pattern
  - `src/stores/agentStore.ts` - store pattern to follow
  - `src/App.tsx` - route registration
  - `src/components/Sidebar.tsx` - navigation link pattern

  **Acceptance Criteria**:
  **QA Scenarios:**
  ```
  Scenario: Model library page renders
    Tool: Playwright
    Steps:
      1. Navigate to http://localhost:3002/models
      2. Assert: model cards visible (seeded models from Task 8)
      3. Click "Add Model" button
      4. Fill form: name="Test Model", provider="openai", model_id="gpt-test"
      5. Click Save
      6. Assert: new model card appears in grid
    Expected Result: Model library CRUD works in UI
    Evidence: .sisyphus/evidence/task-10-model-library.png
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(models): add Model Library UI`
  - Files: `src/components/ModelLibrary.tsx`, `src/stores/modelStore.ts`, `src/App.tsx`, `src/components/Sidebar.tsx`

- [x] 11. Agent Creation Form UI

  **What to do**:
  - Create `src/components/NewAgentDialog.tsx`: form to create new agent
  - Fields: name, model (dropdown from Model library), temperature slider, top_p slider, max_tokens input, project assignment
  - Model dropdown populated from `GET /api/models` (only active models)
  - On submit: `POST /api/agents` → close dialog → refresh agent grid
  - Add "New Agent" button to Dashboard header or AgentGrid
  - Add i18n keys

  **Must NOT do**:
  - Don't modify existing AgentConfigPanel (that's for editing)
  - Don't add agent templates or presets

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (after Tasks 9, 10)
  - **Blocks**: None
  - **Blocked By**: Tasks 9, 10

  **References**:
  - `src/components/AgentConfigPanel.tsx` - existing config panel (343 lines, has sliders/dropdowns)
  - `src/components/NewProjectDialog.tsx` - dialog pattern
  - `src/stores/modelStore.ts` - model data source (from Task 10)
  - `src/stores/agentStore.ts` - createAgent action (from Task 9)

  **Acceptance Criteria**:
  **QA Scenarios:**
  ```
  Scenario: Create agent from UI
    Tool: Playwright
    Steps:
      1. Navigate to http://localhost:3002
      2. Click "New Agent" button
      3. Fill: name="My Agent", select model from dropdown, set temperature=0.8
      4. Click Create
      5. Assert: new agent card appears in grid
      6. Assert: dialog closes
    Expected Result: End-to-end agent creation from UI
    Evidence: .sisyphus/evidence/task-11-agent-create-ui.png
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(agents): add Agent creation form UI`
  - Files: `src/components/NewAgentDialog.tsx`, `src/components/AgentGrid.tsx`

- [x] 12. Agent Edit/Delete UI Enhancements

  **What to do**:
  - Update `AgentConfigPanel.tsx`: model dropdown now uses Model library (not free text)
  - Add delete button to AgentConfigPanel (only for `source: 'ui_created'` agents)
  - Show `source` badge on AgentCard ("OMO" vs "Custom")
  - Delete confirmation dialog with agent name
  - After delete: refresh agent grid, show toast notification

  **Must NOT do**:
  - Don't allow editing OMO-config agent's name (read-only from config)
  - Don't add bulk operations

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (after Task 9)
  - **Blocks**: None
  - **Blocked By**: Task 9

  **References**:
  - `src/components/AgentConfigPanel.tsx` - existing config panel to enhance
  - `src/components/AgentCard.tsx` - add source badge
  - `src/stores/agentStore.ts` - deleteAgent action

  **Acceptance Criteria**:
  **QA Scenarios:**
  ```
  Scenario: Delete UI-created agent
    Tool: Playwright
    Steps:
      1. Create agent via UI (from Task 11)
      2. Click agent card → open config panel
      3. Assert: Delete button visible (source is ui_created)
      4. Click Delete → confirmation dialog appears
      5. Confirm delete
      6. Assert: agent removed from grid
    Expected Result: Agent deletion works with confirmation
    Evidence: .sisyphus/evidence/task-12-agent-delete.png

  Scenario: OMO agent has no delete button
    Tool: Playwright
    Steps:
      1. Click OMO-synced agent card
      2. Assert: no Delete button in config panel
      3. Assert: "OMO" badge visible on card
    Expected Result: OMO agents are protected
    Evidence: .sisyphus/evidence/task-12-omo-protected.png
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(agents): enhance edit/delete UI with source protection`
  - Files: `src/components/AgentConfigPanel.tsx`, `src/components/AgentCard.tsx`

- [x] 13. Task System - New DB Schema + Migration

  **What to do**:
  - Redesign `tasks` table schema:
    - Add: `parent_task_id TEXT REFERENCES tasks(id)` (sub-tasks)
    - Add: `depends_on TEXT` (JSON array of task IDs for dependencies)
    - Add: `priority TEXT DEFAULT 'medium'` ('low'|'medium'|'high'|'critical')
    - Add: `labels TEXT` (JSON array of label strings)
    - Add: `due_date INTEGER` (optional deadline timestamp)
    - Add: `estimated_tokens INTEGER` (estimated cost)
    - Change: `agent_id` → keep for backward compat, add `assigned_agents TEXT` (JSON array of agent IDs for multi-agent)
  - Create `task_agent_assignments` junction table: `task_id, agent_id, role ('lead'|'worker'|'reviewer'), assigned_at`
  - Create `task_dependencies` table: `task_id, depends_on_task_id, dependency_type ('blocks'|'requires')`
  - Write migration in `src/db/migrations.ts` to alter existing tasks table
  - Update DB CRUD functions in `src/db/index.ts`
  - Update Task type in `src/types/index.ts`

  **Must NOT do**:
  - Don't build UI (Wave 4)
  - Don't implement orchestration engine (Task 15)
  - Don't add task scheduling/recurring tasks

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (start of wave)
  - **Blocks**: Tasks 14, 15
  - **Blocked By**: Task 7

  **References**:
  - `src/db/schema.ts` - existing tasks table schema
  - `src/db/index.ts` - existing task CRUD functions
  - `src/db/migrations.ts` - migration runner pattern
  - `src/types/index.ts` - Task type definition

  **Acceptance Criteria**:
  **QA Scenarios:**
  ```
  Scenario: New schema supports sub-tasks and dependencies
    Tool: Bash (curl)
    Steps:
      1. POST /api/tasks with {title:"Parent Task", priority:"high"}
      2. POST /api/tasks with {title:"Sub Task", parent_task_id: parent_id}
      3. GET /api/tasks/:parent_id → includes sub_tasks array
    Expected Result: Hierarchical task structure works
    Evidence: .sisyphus/evidence/task-13-schema.txt

  Scenario: Migration preserves existing data
    Tool: Bash
    Steps:
      1. Check existing tasks still queryable after migration
      2. New columns have correct defaults
    Expected Result: Zero data loss during migration
    Evidence: .sisyphus/evidence/task-13-migration.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(tasks): redesign task schema with sub-tasks and dependencies`
  - Files: `src/db/schema.ts`, `src/db/index.ts`, `src/db/migrations.ts`, `src/types/index.ts`

- [x] 14. Task System - CRUD API with Multi-Agent Support

  **What to do**:
  - Rewrite `src/server/routes/tasks.ts` with enhanced endpoints:
    - `GET /api/tasks` - list with filters: `?project_id=&status=&priority=&agent_id=&parent_task_id=`
    - `POST /api/tasks` - create task with multi-agent assignment
    - `PUT /api/tasks/:id` - update task (status, priority, agents, etc.)
    - `DELETE /api/tasks/:id` - delete task (cascade to sub-tasks)
    - `GET /api/tasks/:id` - get task detail with sub-tasks and dependencies
    - `POST /api/tasks/:id/assign` - assign agents to task with roles
    - `POST /api/tasks/:id/dependencies` - add/remove dependencies
    - `GET /api/tasks/:id/subtasks` - list sub-tasks
  - Implement task status state machine: backlog → in_progress → done/failed (no arbitrary transitions)
  - Update `src/stores/taskStore.ts` with new actions

  **Must NOT do**:
  - Don't build Kanban UI (Task 17)
  - Don't implement auto-scheduling

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (after Task 13)
  - **Blocks**: Tasks 16, 17, 18, 19, 20
  - **Blocked By**: Task 13

  **References**:
  - `src/server/routes/tasks.ts` - existing task routes to rewrite
  - `src/stores/taskStore.ts` - existing task store to update
  - `src/db/index.ts` - new task CRUD functions from Task 13

  **Acceptance Criteria**:
  **QA Scenarios:**
  ```
  Scenario: Multi-agent task assignment
    Tool: Bash (curl)
    Steps:
      1. POST /api/tasks with {title:"Multi-Agent Task", assigned_agents:[{agent_id:"a1",role:"lead"},{agent_id:"a2",role:"worker"}]}
      2. GET /api/tasks/:id → includes assigned_agents with roles
    Expected Result: Multiple agents assigned with roles
    Evidence: .sisyphus/evidence/task-14-multi-agent.txt

  Scenario: Task status state machine
    Tool: Bash (curl)
    Steps:
      1. POST /api/tasks → status: "backlog"
      2. PUT /api/tasks/:id {status:"in_progress"} → 200
      3. PUT /api/tasks/:id {status:"backlog"} → 400 (invalid transition)
    Expected Result: Invalid status transitions rejected
    Evidence: .sisyphus/evidence/task-14-state-machine.txt

  Scenario: Dependency enforcement
    Tool: Bash (curl)
    Steps:
      1. Create Task A and Task B
      2. POST /api/tasks/B/dependencies {depends_on_task_id: A.id, type:"blocks"}
      3. PUT /api/tasks/B {status:"in_progress"} → 400 (Task A not done)
      4. PUT /api/tasks/A {status:"done"} → 200
      5. PUT /api/tasks/B {status:"in_progress"} → 200
    Expected Result: Dependencies enforced on status transitions
    Evidence: .sisyphus/evidence/task-14-dependencies.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(tasks): rewrite task API with multi-agent and dependencies`
  - Files: `src/server/routes/tasks.ts`, `src/stores/taskStore.ts`

- [x] 15. Task System - Orchestration Engine

  **What to do**:
  - Create `src/server/orchestrator.ts`: multi-agent task orchestration logic
  - Implement orchestration patterns:
    - Sequential: Agent A → Agent B → Agent C (chain)
    - Parallel: Agents A, B, C work simultaneously, results aggregated
    - Pipeline: Output of Agent A feeds into Agent B
  - Create `task_orchestrations` table: `id, task_id, pattern ('sequential'|'parallel'|'pipeline'), agent_order (JSON), current_step, status`
  - API endpoints:
    - `POST /api/tasks/:id/orchestrate` - start orchestration
    - `GET /api/tasks/:id/orchestration` - get orchestration status
  - Integrate with WebSocket for real-time orchestration progress
  - Orchestration state machine: pending → running → step_complete → all_complete/failed

  **Must NOT do**:
  - Don't implement actual LLM calls (agents are managed externally)
  - Don't add scheduling/cron
  - Don't build UI (Task 21)

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (after Task 13)
  - **Blocks**: Task 21
  - **Blocked By**: Task 13

  **References**:
  - `src/server/websocket.ts` - WebSocket broadcast for progress updates
  - `src/db/index.ts` - DB operations pattern
  - `src/server/agentStatus.ts` - agent status monitoring (integrate with orchestration)

  **Acceptance Criteria**:
  **QA Scenarios:**
  ```
  Scenario: Sequential orchestration
    Tool: Bash (curl)
    Steps:
      1. Create task with 3 assigned agents
      2. POST /api/tasks/:id/orchestrate {pattern:"sequential", agent_order:["a1","a2","a3"]}
      3. GET /api/tasks/:id/orchestration → status: "running", current_step: 0
    Expected Result: Orchestration created and running
    Evidence: .sisyphus/evidence/task-15-orchestration.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(tasks): add multi-agent orchestration engine`
  - Files: `src/server/orchestrator.ts`, `src/db/schema.ts`, `src/db/index.ts`

- [x] 16. Task System - WebSocket task_update Activation

  **What to do**:
  - Activate the existing dead `task_update` WebSocket message type
  - Broadcast task status changes via WebSocket when:
    - Task created/updated/deleted
    - Agent assigned/unassigned
    - Orchestration step completed
    - Dependency resolved
  - Update `src/stores/taskStore.ts` to listen for WebSocket task events
  - Add WebSocket message types: `task_created`, `task_updated`, `task_deleted`, `orchestration_progress`

  **Must NOT do**:
  - Don't change WebSocket infrastructure (keep ws library)
  - Don't add SSE

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (after Task 14)
  - **Blocks**: Task 17
  - **Blocked By**: Task 14

  **References**:
  - `src/server/websocket.ts` - existing WebSocket with `task_update` type defined but unused
  - `src/stores/taskStore.ts` - task store to add WS listener
  - `src/stores/agentStore.ts` - example of store with WebSocket integration

  **Acceptance Criteria**:
  **QA Scenarios:**
  ```
  Scenario: Task updates broadcast via WebSocket
    Tool: Bash
    Steps:
      1. Connect WebSocket client to ws://localhost:3001
      2. POST /api/tasks (create task)
      3. Assert: WebSocket receives {type:"task_created", payload:{...}}
      4. PUT /api/tasks/:id (update status)
      5. Assert: WebSocket receives {type:"task_updated", payload:{...}}
    Expected Result: Real-time task updates via WebSocket
    Evidence: .sisyphus/evidence/task-16-ws-tasks.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(tasks): activate WebSocket task update broadcasts`
  - Files: `src/server/websocket.ts`, `src/stores/taskStore.ts`, `src/server/routes/tasks.ts`

- [x] 17. New Kanban Board with Multi-Agent Tasks

  **What to do**:
  - Rewrite `src/components/KanbanBoard.tsx` to support new task schema
  - Task cards show: title, priority badge, assigned agents (avatars), sub-task count, dependency indicator
  - Columns: Backlog → In Progress → Done → Failed (keep existing)
  - Drag-and-drop respects state machine (can't drag to invalid status)
  - Drag blocked if dependencies not met (visual indicator)
  - Filter by: project, agent, priority, labels
  - "New Task" button opens enhanced task creation dialog
  - Real-time updates via WebSocket (from Task 16)

  **Must NOT do**:
  - Don't add Gantt chart or timeline view
  - Don't add task templates

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 18-21)
  - **Blocks**: Tasks 22-25
  - **Blocked By**: Tasks 14, 16

  **References**:
  - `src/components/KanbanBoard.tsx` - existing Kanban to rewrite
  - `src/components/TaskCard.tsx` - existing task card to enhance
  - `src/components/NewTaskDialog.tsx` - existing dialog to enhance
  - `src/stores/taskStore.ts` - updated task store from Task 14

  **Acceptance Criteria**:
  **QA Scenarios:**
  ```
  Scenario: Kanban with multi-agent tasks
    Tool: Playwright
    Steps:
      1. Navigate to project page with Kanban
      2. Click "New Task"
      3. Fill: title, select 2 agents, set priority "high"
      4. Save → task appears in Backlog column
      5. Assert: task card shows both agent avatars and priority badge
      6. Drag task to "In Progress"
      7. Assert: task moves, status updated
    Expected Result: Enhanced Kanban works with new task schema
    Evidence: .sisyphus/evidence/task-17-kanban.png

  Scenario: Dependency blocks drag
    Tool: Playwright
    Steps:
      1. Create Task A and Task B (B depends on A)
      2. Try to drag Task B to "In Progress"
      3. Assert: drag blocked, visual indicator shows "Blocked by Task A"
    Expected Result: Dependencies enforced in UI
    Evidence: .sisyphus/evidence/task-17-dependency-block.png
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(tasks): rewrite Kanban board with multi-agent support`
  - Files: `src/components/KanbanBoard.tsx`, `src/components/TaskCard.tsx`, `src/components/NewTaskDialog.tsx`

- [x] 18. Task Detail View + Sub-Task Management

  **What to do**:
  - Create `src/components/TaskDetail.tsx`: full task detail page/drawer
  - Sections: title/description, assigned agents with roles, sub-tasks list, dependencies graph, activity log, status history
  - Sub-task management: create sub-task, mark complete, reorder
  - Dependency management: add/remove dependencies, visual dependency chain
  - Add route `/tasks/:id` in `src/App.tsx`
  - Click task card in Kanban → opens TaskDetail

  **Must NOT do**:
  - Don't add comments/discussion
  - Don't add file attachments

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 17, 19-21)
  - **Blocks**: Tasks 22-25
  - **Blocked By**: Task 14

  **References**:
  - `src/components/AgentConfigPanel.tsx` - drawer/panel pattern
  - `src/stores/taskStore.ts` - task data and actions

  **Acceptance Criteria**:
  **QA Scenarios:**
  ```
  Scenario: Task detail with sub-tasks
    Tool: Playwright
    Steps:
      1. Create parent task with 2 sub-tasks via API
      2. Navigate to /tasks/:parent_id
      3. Assert: sub-tasks listed with checkboxes
      4. Check one sub-task as complete
      5. Assert: progress indicator updates
    Expected Result: Sub-task management works
    Evidence: .sisyphus/evidence/task-18-subtasks.png
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(tasks): add task detail view with sub-task management`
  - Files: `src/components/TaskDetail.tsx`, `src/App.tsx`

- [x] 19. ProjectDetail Page Implementation

  **What to do**:
  - Replace stub `ProjectDetail` in `src/App.tsx` with real component
  - Create `src/components/ProjectDetail.tsx`:
    - Project header: name, description, edit button
    - Agent list: agents assigned to this project (grid view)
    - Task Kanban: filtered to this project's tasks
    - Stats: agent count, task count by status, total cost
  - Wire up to existing project store and task store

  **Must NOT do**:
  - Don't add project settings/permissions
  - Don't add project archiving

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 17-18, 20-21)
  - **Blocks**: Tasks 22-25
  - **Blocked By**: Tasks 9, 14

  **References**:
  - `src/App.tsx:89-97` - stub ProjectDetail to replace
  - `src/stores/projectStore.ts` - project data
  - `src/stores/agentStore.ts` - agent data filtered by project
  - `src/stores/taskStore.ts` - task data filtered by project
  - `src/components/AgentGrid.tsx` - agent grid pattern to reuse
  - `src/components/KanbanBoard.tsx` - Kanban to embed (filtered)

  **Acceptance Criteria**:
  **QA Scenarios:**
  ```
  Scenario: ProjectDetail shows project data
    Tool: Playwright
    Steps:
      1. Create project with 2 agents and 3 tasks via API
      2. Navigate to /project/:id
      3. Assert: project name in header
      4. Assert: 2 agent cards visible
      5. Assert: Kanban shows 3 tasks
      6. Assert: stats show correct counts
    Expected Result: ProjectDetail renders complete project view
    Evidence: .sisyphus/evidence/task-19-project-detail.png
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(ui): implement ProjectDetail page`
  - Files: `src/components/ProjectDetail.tsx`, `src/App.tsx`

- [x] 20. AgentDetail Page Implementation

  **What to do**:
  - Replace stub `AgentDetail` in `src/App.tsx` with real component
  - Create `src/components/AgentDetail.tsx`:
    - Agent header: name, status badge, model, source badge (OMO/Custom)
    - Config panel: inline (not modal) - model, temperature, top_p, max_tokens
    - Task list: tasks assigned to this agent
    - Activity log: filtered to this agent
    - Cost summary: token usage for this agent
  - Wire up to existing stores

  **Must NOT do**:
  - Don't add agent logs/terminal (no Chat replacement)
  - Don't add agent cloning

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 17-19, 21)
  - **Blocks**: Tasks 22-25
  - **Blocked By**: Tasks 9, 14

  **References**:
  - `src/App.tsx:99-105` - stub AgentDetail to replace
  - `src/components/AgentConfigPanel.tsx` - config panel to embed inline
  - `src/stores/agentStore.ts` - agent data
  - `src/stores/taskStore.ts` - tasks filtered by agent
  - `src/stores/activityStore.ts` - activity logs filtered by agent
  - `src/stores/costStore.ts` - cost data filtered by agent

  **Acceptance Criteria**:
  **QA Scenarios:**
  ```
  Scenario: AgentDetail shows agent data
    Tool: Playwright
    Steps:
      1. Navigate to /agent/:id
      2. Assert: agent name and status badge visible
      3. Assert: config panel with model dropdown, sliders
      4. Assert: task list shows assigned tasks
      5. Assert: activity log shows agent events
    Expected Result: AgentDetail renders complete agent view
    Evidence: .sisyphus/evidence/task-20-agent-detail.png
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(ui): implement AgentDetail page`
  - Files: `src/components/AgentDetail.tsx`, `src/App.tsx`

- [x] 21. Task Dependency Visualization

  **What to do**:
  - Create `src/components/DependencyGraph.tsx`: visual dependency graph for tasks
  - Use simple SVG-based visualization (arrows between task nodes)
  - Show: task nodes with status colors, dependency arrows, critical path highlight
  - Embed in TaskDetail view and ProjectDetail view
  - Interactive: click node → navigate to task detail

  **Must NOT do**:
  - Don't use heavy libraries like React Flow (keep it simple SVG)
  - Don't add drag-to-create dependencies (use form instead)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 17-20)
  - **Blocks**: Tasks 22-25
  - **Blocked By**: Task 15

  **References**:
  - `src/components/TaskDetail.tsx` - embed graph here (from Task 18)
  - `src/components/ProjectDetail.tsx` - embed graph here (from Task 19)

  **Acceptance Criteria**:
  **QA Scenarios:**
  ```
  Scenario: Dependency graph renders
    Tool: Playwright
    Steps:
      1. Create 3 tasks: A → B → C (chain dependency)
      2. Navigate to task A detail
      3. Assert: SVG graph visible with 3 nodes and 2 arrows
      4. Click node B → navigates to task B detail
    Expected Result: Visual dependency graph works
    Evidence: .sisyphus/evidence/task-21-dependency-graph.png
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(tasks): add dependency visualization graph`
  - Files: `src/components/DependencyGraph.tsx`, `src/components/TaskDetail.tsx`, `src/components/ProjectDetail.tsx`

- [x] 22. i18n Updates for All New Features

  **What to do**:
  - Add i18n keys to `src/locales/en.json` and `src/locales/zh.json` for:
    - Model library (add/edit/delete model, provider names, pricing labels)
    - Agent creation form (all field labels, validation messages)
    - Task system (priority levels, dependency types, orchestration patterns, status labels)
    - ProjectDetail and AgentDetail (section headers, empty states)
  - Verify all new UI strings use `t()` function, no hardcoded strings

  **Must NOT do**:
  - Don't add new languages
  - Don't refactor existing i18n keys

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 23-25)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 17-21

  **References**:
  - `src/locales/en.json` - existing English translations
  - `src/locales/zh.json` - existing Chinese translations
  - `src/i18n/index.ts` - i18n setup

  **Acceptance Criteria**:
  **QA Scenarios:**
  ```
  Scenario: No hardcoded strings in new components
    Tool: Bash (grep)
    Steps:
      1. grep -n ">[A-Z][a-z]" src/components/ModelLibrary.tsx src/components/NewAgentDialog.tsx src/components/TaskDetail.tsx src/components/ProjectDetail.tsx src/components/AgentDetail.tsx
      2. Assert: minimal matches (only dynamic content, not UI labels)
    Expected Result: All UI strings use i18n
    Evidence: .sisyphus/evidence/task-22-i18n.txt
  ```

  **Commit**: YES (groups with Wave 5)
  - Message: `chore(i18n): add translations for all new features`
  - Files: `src/locales/en.json`, `src/locales/zh.json`

- [x] 23. Unit Tests for New API Endpoints

  **What to do**:
  - Write vitest tests for:
    - `src/server/routes/models.ts` - Model CRUD (create, read, update, delete, delete-guard)
    - `src/server/routes/agents.ts` - Agent POST/DELETE (create, delete, OMO protection)
    - `src/server/routes/tasks.ts` - Task CRUD (create, multi-agent assign, dependencies, state machine)
    - `src/server/orchestrator.ts` - Orchestration patterns (sequential, parallel, pipeline)
  - Follow existing test patterns in `src/server/routes/projects.test.ts`
  - Use supertest for API tests

  **Must NOT do**:
  - Don't write tests for existing (pre-fix) code
  - Don't write frontend component tests (Task 24 covers E2E)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 22, 24, 25)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 9, 14

  **References**:
  - `src/server/routes/projects.test.ts` - existing test pattern with supertest
  - `src/db/index.test.ts` - existing DB test pattern
  - `vitest.config.ts` - test configuration

  **Acceptance Criteria**:
  **QA Scenarios:**
  ```
  Scenario: All new API tests pass
    Tool: Bash
    Steps:
      1. npm run test:run
      2. Assert: all tests pass, zero failures
      3. Assert: new test files exist for models, agents, tasks, orchestrator
    Expected Result: Comprehensive API test coverage for new features
    Evidence: .sisyphus/evidence/task-23-unit-tests.txt
  ```

  **Commit**: YES (groups with Wave 5)
  - Message: `test: add unit tests for new API endpoints`
  - Files: `src/server/routes/models.test.ts`, `src/server/routes/agents.test.ts`, `src/server/routes/tasks.test.ts`, `src/server/orchestrator.test.ts`

- [x] 24. E2E Smoke Tests Per Phase

  **What to do**:
  - Write Playwright E2E tests covering critical user flows:
    - Dashboard loads with agent grid
    - Create new agent from UI → appears in grid
    - Open Model Library → add model → model appears
    - Create task with multi-agent assignment → appears in Kanban
    - Drag task between Kanban columns
    - Navigate to ProjectDetail → see agents and tasks
    - Navigate to AgentDetail → see config and tasks
    - Theme toggle works
  - Follow existing e2e test patterns in `e2e/` directory

  **Must NOT do**:
  - Don't test edge cases (that's F3's job)
  - Don't test API directly (Task 23 covers that)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 22, 23, 25)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 17-21

  **References**:
  - `e2e/` - existing E2E test directory
  - `playwright.config.ts` - Playwright configuration

  **Acceptance Criteria**:
  **QA Scenarios:**
  ```
  Scenario: E2E tests pass
    Tool: Bash
    Steps:
      1. npm run test:e2e
      2. Assert: all E2E tests pass
    Expected Result: Critical user flows verified end-to-end
    Evidence: .sisyphus/evidence/task-24-e2e.txt
  ```

  **Commit**: YES (groups with Wave 5)
  - Message: `test: add E2E smoke tests for all features`
  - Files: `e2e/*.spec.ts`

- [x] 25. Empty States + Error Boundaries

  **What to do**:
  - Add empty state UI for: 0 agents, 0 tasks, 0 projects, 0 models, 0 cost records
  - Each empty state: illustration/icon + descriptive text + CTA button
  - Add React Error Boundary wrapper around main content area
  - Error boundary shows: error message + "Reload" button
  - Add loading skeletons for: agent grid, Kanban board, model library
  - Add i18n keys for all empty states and error messages

  **Must NOT do**:
  - Don't add onboarding wizard
  - Don't add tooltips/tours

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 22-24)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 17-21

  **References**:
  - `src/components/AgentGrid.tsx` - add empty state when 0 agents
  - `src/components/KanbanBoard.tsx` - add empty state when 0 tasks
  - `src/components/AppLayout.tsx` - wrap with Error Boundary

  **Acceptance Criteria**:
  **QA Scenarios:**
  ```
  Scenario: Empty states render correctly
    Tool: Playwright
    Steps:
      1. Clear all agents, tasks, projects via API
      2. Navigate to Dashboard → Assert: empty state with "Create Agent" CTA
      3. Navigate to /models → Assert: empty state with "Add Model" CTA
      4. Navigate to project Kanban → Assert: empty state with "Create Task" CTA
    Expected Result: All empty states show helpful guidance
    Evidence: .sisyphus/evidence/task-25-empty-states.png
  ```

  **Commit**: YES (groups with Wave 5)
  - Message: `feat(ui): add empty states, error boundaries, loading skeletons`
  - Files: `src/components/EmptyState.tsx`, `src/components/ErrorBoundary.tsx`, various components

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter + `npm run test:run`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp).
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together, not isolation). Test edge cases: empty state, invalid input, rapid actions. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Wave | Commit Message | Files | Pre-commit |
|------|---------------|-------|------------|
| 1 | `fix: resolve 6 blocking bugs and remove chat feature` | server/*, stores/*, components/*, App.tsx | `npm run dev` starts |
| 2 | `feat(agents): add Agent CRUD and centralized Model library` | server/routes/*, stores/*, components/*, db/* | `curl POST /api/agents` returns 201 |
| 3 | `feat(tasks): redesign task system with multi-agent orchestration` | server/routes/tasks.ts, db/*, stores/taskStore.ts, types/* | `curl POST /api/tasks` returns 201 |
| 4 | `feat(ui): implement task UI, ProjectDetail, AgentDetail pages` | components/*, App.tsx | Playwright smoke test |
| 5 | `chore: add i18n, tests, polish` | locales/*, tests/*, components/* | `npm run test:run` passes |

---

## Success Criteria

### Verification Commands
```bash
npm run dev                    # Expected: server + client start without errors
curl http://localhost:3001/api/agents  # Expected: 200 with JSON array
curl http://localhost:3001/api/models  # Expected: 200 with model registry
curl -X POST http://localhost:3001/api/agents -H "Content-Type: application/json" -d '{"name":"test","model":"gpt-4"}'  # Expected: 201
curl "http://localhost:3001/api/cost-records?dateRange=week"  # Expected: 200 with filtered records
curl http://localhost:3001/api/chat  # Expected: 404 (removed)
npm run test:run               # Expected: all tests pass
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] No CORS errors in browser console
- [ ] Agent CRUD works end-to-end
- [ ] Model library populated and selectable
- [ ] Multi-agent task creation works
- [ ] ProjectDetail shows project agents + tasks
- [ ] AgentDetail shows agent config + activity + tasks
- [ ] i18n covers all new UI strings
