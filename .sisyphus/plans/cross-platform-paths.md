# Cross-Platform Path Configuration

## TL;DR

> **Quick Summary**: Fix hardcoded Unix-style paths to support Windows/macOS/Linux, add centralized path utilities, and provide UI for path configuration with validation.
> 
> **Deliverables**:
> - `src/utils/paths.ts` - Cross-platform path utility module
> - Fixed path resolution in `omo-reader.ts`, `omo-writer.ts`, `watcher.ts`
> - Backend API endpoints for path info and validation
> - Path configuration UI in SettingsPage
> - Unit tests for path utilities
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 (path utility) → Task 6 (backend API) → Task 8 (frontend UI) → Final Verification

---

## Context

### Original Request
用户担心项目中的智能体和模型库配置文件路径是硬编码的，在macOS环境下运行正常，但可能在Linux或Windows环境下出现问题。需要：
1. 根据操作系统判断默认值
2. 在UI上提供选择路径的功能，验证配置文件后加载

### Interview Summary
**Key Discussions**:
- macOS路径: 使用 `~/.config/` (XDG标准) 而非 `~/Library/Application Support/`
- 前端功能: 提供路径选择，验证是配置文件后才加载，否则提示错误
- 测试策略: 需要单元测试

**Research Findings**:
- `config-manager.ts` 已正确使用 `path.join()`
- `omo-reader.ts` 和 `omo-writer.ts` 使用硬编码正斜杠
- `watcher.ts` 使用 `process.env.HOME` 在Windows上不存在
- 环境变量覆盖已存在但部分文件未使用

### Metis Review
**Identified Gaps** (addressed):
- 迁移策略: 新路径工具优先使用环境变量，保持向后兼容
- 路径优先级: env vars > UI自定义 > OS默认值
- 验证范围: 检查文件存在性、JSON/JSONC可解析性
- UI/后端验证: 后端为主，前端为辅

---

## Work Objectives

### Core Objective
实现跨平台路径配置，修复硬编码路径，提供可验证的路径配置UI。

### Concrete Deliverables
- `src/utils/paths.ts` - 路径工具模块
- 修复后的 `src/config/omo-reader.ts`
- 修复后的 `src/config/omo-writer.ts`
- 修复后的 `src/server/watcher.ts`
- 新增API端点 `GET /api/config/paths`, `POST /api/config/validate`
- 更新后的 `src/components/SettingsPage.tsx`
- 测试文件 `src/utils/paths.test.ts`

### Definition of Done
- [ ] Windows/macOS/Linux 路径正确解析
- [ ] 所有硬编码正斜杠替换为 `path.join()`
- [ ] UI可显示、修改、验证路径
- [ ] 单元测试覆盖率 > 80%

### Must Have
- 跨平台路径检测（Windows/macOS/Linux）
- 路径验证API（检查存在性、格式）
- UI路径配置和验证反馈

### Must NOT Have (Guardrails)
- 不修改环境变量覆盖行为
- 不添加文件浏览器组件
- 不实现自动迁移工具
- 不修改现有配置格式
- 不修改 AgentConfigPanel 和 ModelLibrary 的业务逻辑（只更新它们依赖的路径工具）

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Vitest)
- **Automated tests**: YES (Tests after)
- **Framework**: Vitest

### QA Policy
Every task MUST include agent-executed QA scenarios.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - can start immediately):
├── Task 1: Create path utility module (src/utils/paths.ts)
├── Task 2: Fix omo-reader.ts hardcoded paths
├── Task 3: Fix omo-writer.ts hardcoded paths
└── Task 4: Fix watcher.ts process.env.HOME issue

Wave 2 (Backend - depends on Wave 1):
├── Task 5: Add path info endpoint (GET /api/config/paths)
├── Task 6: Add path validation endpoint (POST /api/config/validate)
└── Task 7: Update config-manager.ts to use path utility

Wave 3 (Frontend - depends on Wave 2):
├── Task 8: Update SettingsPage with path configuration UI
└── Task 9: Update settingsStore with path state

Wave 4 (Testing - can parallel with Wave 3):
└── Task 10: Unit tests for path utilities

Wave FINAL (Verification):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
```

### Dependency Matrix
- **Task 1**: None → Blocks Task 2, 3, 4, 7
- **Task 2**: Task 1 → None
- **Task 3**: Task 1 → None
- **Task 4**: Task 1 → None
- **Task 5**: None → Blocks Task 8
- **Task 6**: None → Blocks Task 8
- **Task 7**: Task 1 → None
- **Task 8**: Task 5, 6 → None
- **Task 9**: None → Blocks Task 8
- **Task 10**: Task 1 → None

---

## TODOs

- [x] 1. Create cross-platform path utility module

  **What to do**:
  - Create `src/utils/paths.ts` with OS-aware path detection
  - Implement `getConfigDir()`, `getDataDir()`, `getHomeDir()` functions
  - Support Windows (`%APPDATA%`, `%LOCALAPPDATA%`), macOS/Linux (`~/.config/`, `~/.local/share/`)
  - Handle `process.env.HOME` missing on Windows (use `USERPROFILE`)
  - Export path constants for all config files

  **Must NOT do**:
  - Do NOT add file system side effects (pure functions only)
  - Do NOT change environment variable behavior

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: Straightforward utility module creation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 2, 3, 4, 7
  - **Blocked By**: None

  **References**:
  - `src/server/config-manager.ts:33-44` - Current path resolution pattern
  - `src/server/opencode-reader.ts:30-32` - DB path pattern
  - Node.js `os.homedir()`, `path.join()`, `process.env` docs

  **Acceptance Criteria**:
  - [ ] File created: `src/utils/paths.ts`
  - [ ] Exports: `getConfigDir()`, `getDataDir()`, `getHomeDir()`, `getOpenAgentPath()`, `getOpencodePath()`, `getOmoPath()`, `getDbPath()`
  - [ ] Windows returns `%APPDATA%/opencode` for config
  - [ ] macOS/Linux returns `~/.config/opencode` for config
  - [ ] All functions are pure (no side effects)

  **QA Scenarios**:
  ```
  Scenario: Path utility returns correct paths
    Tool: Bash (node REPL)
    Preconditions: None
    Steps:
      1. Run `node -e "const p = require('./src/utils/paths.ts'); console.log(p.getConfigDir());"`
      2. Verify output contains `.config` or `AppData/Roaming`
    Expected Result: Path matches current OS convention
    Evidence: .sisyphus/evidence/task1-paths-output.txt
  ```

  **Commit**: YES
  - Message: `feat(paths): add cross-platform path utility module`
  - Files: `src/utils/paths.ts`

- [x] 2. Fix hardcoded paths in omo-reader.ts

  **What to do**:
  - Replace `${homeDir}/.config/opencode/oh-my-opencode.jsonc` with `path.join()`
  - Use new path utility module
  - Keep backward compatibility with optional `configPath` parameter

  **Must NOT do**:
  - Do NOT change the public API signature
  - Do NOT change error handling behavior

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:
  - `src/config/omo-reader.ts:46-48` - Current hardcoded path
  - `src/utils/paths.ts` - New path utility

  **Acceptance Criteria**:
  - [ ] No hardcoded forward slashes in path construction
  - [ ] Uses `path.join()` or path utility
  - [ ] Existing tests still pass

  **QA Scenarios**:
  ```
  Scenario: omo-reader uses correct paths
    Tool: Bash (bun test)
    Preconditions: Task 1 complete
    Steps:
      1. Run existing tests: `bun test src/config/omo-reader.test.ts`
      2. Verify no failures
    Expected Result: All tests pass
    Evidence: .sisyphus/evidence/task2-reader-test.txt
  ```

  **Commit**: YES (group with Task 3)
  - Message: `fix(config): replace hardcoded paths with path utility`
  - Files: `src/config/omo-reader.ts`, `src/config/omo-writer.ts`

- [x] 3. Fix hardcoded paths in omo-writer.ts

  **What to do**:
  - Replace `${os.homedir()}/.config/opencode` with `path.join()`
  - Use new path utility module
  - Keep backward compatibility with optional `configPath` parameter

  **Must NOT do**:
  - Do NOT change the public API signature
  - Do NOT change file writing behavior

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:
  - `src/config/omo-writer.ts:55,88` - Current hardcoded paths
  - `src/utils/paths.ts` - New path utility

  **Acceptance Criteria**:
  - [ ] No hardcoded forward slashes in path construction
  - [ ] Uses `path.join()` or path utility
  - [ ] Existing tests still pass

  **QA Scenarios**:
  ```
  Scenario: omo-writer uses correct paths
    Tool: Bash (bun test)
    Preconditions: Task 1 complete
    Steps:
      1. Run existing tests: `bun test src/config/omo-writer.test.ts`
      2. Verify no failures
    Expected Result: All tests pass
    Evidence: .sisyphus/evidence/task3-writer-test.txt
  ```

  **Commit**: YES (group with Task 2)

- [x] 4. Fix process.env.HOME in watcher.ts

  **What to do**:
  - Replace `process.env.HOME ?? ''` with `os.homedir()`
  - Use new path utility for DB path
  - Ensure watcher works on Windows

  **Must NOT do**:
  - Do NOT change watcher polling logic
  - Do NOT change file watching behavior

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:
  - `src/server/watcher.ts:13` - Current HOME usage
  - `src/utils/paths.ts` - New path utility

  **Acceptance Criteria**:
  - [ ] Uses `os.homedir()` instead of `process.env.HOME`
  - [ ] Works on Windows without HOME env var

  **QA Scenarios**:
  ```
  Scenario: watcher works without HOME env var
    Tool: Bash
    Preconditions: Task 1 complete
    Steps:
      1. Run `HOME= node -e "const w = require('./src/server/watcher.ts'); console.log(w.getWalPath());"`
      2. Verify no error and path is resolved
    Expected Result: Path resolved without HOME
    Evidence: .sisyphus/evidence/task4-watcher-test.txt
  ```

  **Commit**: YES
  - Message: `fix(watcher): use os.homedir() for cross-platform support`
  - Files: `src/server/watcher.ts`

- [x] 5. Add path info API endpoint

  **What to do**:
  - Add `GET /api/config/paths` endpoint
  - Return current config paths (openAgent, opencode, omo, db)
  - Include OS type and home directory
  - **Integration**: This endpoint provides the paths that AgentConfigPanel and ModelLibrary will use (via dashboardStore)

  **Must NOT do**:
  - Do NOT expose sensitive paths (API keys, tokens)
  - Do NOT change existing endpoints

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 8
  - **Blocked By**: None

  **References**:
  - `src/server/routes/config.ts` - Existing config routes
  - `src/server/config-manager.ts` - Path resolution
    - `getConfigPaths()` returns `{ openAgentPath, opencodePath, omoPath }` (lines 37-44)
    - `getBaseConfigDir()` returns `path.join(os.homedir(), '.config', 'opencode')` (line 34)
  - `src/types/domain.ts` - Type definitions
    - `DashboardConfigSnapshot` interface (lines 70-79) already includes `openAgentPath`, `opencodePath`, `omoPath`
  - `src/stores/dashboardStore.ts` - Uses config paths
    - `fetchConfig()` calls `/api/config` which returns `DashboardConfig` (lines 161-174)
    - `DashboardConfig` includes `openAgentPath`, `opencodePath`, `omoPath` (lines 67-77)
  - `src/components/AgentConfigPanel.tsx` - Uses agent config from dashboardStore
  - `src/components/ModelLibrary.tsx` - Uses config from dashboardStore (lines 9, 41-44)

  **Acceptance Criteria**:
  - [ ] Endpoint returns JSON with paths and OS info
  - [ ] Paths are absolute (resolved)
  - [ ] Includes `os` field (win32, darwin, linux)
  - [ ] Returns same paths used by AgentConfigPanel and ModelLibrary

  **QA Scenarios**:
  ```
  Scenario: Path info endpoint returns correct paths
    Tool: Bash (curl)
    Preconditions: Server running
    Steps:
      1. `curl http://localhost:3001/api/config/paths`
      2. Verify JSON response contains: openAgentPath, opencodePath, omoPath, dbPath, os, homeDir
      3. Verify paths match what AgentConfigPanel and ModelLibrary use
    Expected Result: Returns { openAgentPath, opencodePath, omoPath, dbPath, os, homeDir }
    Evidence: .sisyphus/evidence/task5-paths-api.json

  Scenario: Path info matches dashboard config
    Tool: Bash (curl)
    Preconditions: Server running
    Steps:
      1. `curl http://localhost:3001/api/config/paths`
      2. `curl http://localhost:3001/api/config`
      3. Verify paths from both endpoints match
    Expected Result: /api/config/paths and /api/config return consistent paths
    Evidence: .sisyphus/evidence/task5-paths-consistency.json
  ```

  **Commit**: YES (group with Task 6)
  - Message: `feat(api): add path info endpoint`
  - Files: `src/server/routes/config.ts`

- [x] 6. Add path validation API endpoint

  **What to do**:
  - Add `POST /api/config/validate` endpoint
  - Accept path and config type
  - Validate: file exists, is readable, is valid JSON/JSONC
  - Return validation result with error details

  **Must NOT do**:
  - Do NOT write to files during validation
  - Do NOT expose file contents

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 8
  - **Blocked By**: None

  **References**:
  - `src/server/routes/config.ts` - Existing config routes
  - `src/config/omo-reader.ts` - Config reading logic
  - `src/server/config-manager.ts` - Validation patterns

  **Acceptance Criteria**:
  - [ ] Accepts `{ path: string, type: 'openagent' | 'opencode' | 'omo' }`
  - [ ] Returns `{ valid: boolean, exists: boolean, readable: boolean, parseable: boolean, error?: string }`
  - [ ] Does not modify files

  **QA Scenarios**:
  ```
  Scenario: Validate valid config file
    Tool: Bash (curl)
    Preconditions: Server running, valid config exists
    Steps:
      1. `curl -X POST http://localhost:3001/api/config/validate -H "Content-Type: application/json" -d '{"path":"~/.config/opencode/opencode.json","type":"opencode"}'`
      2. Verify response: valid=true
    Expected Result: Returns { valid: true, exists: true, readable: true, parseable: true }
    Evidence: .sisyphus/evidence/task6-validate-valid.json

  Scenario: Validate invalid config file
    Tool: Bash (curl)
    Preconditions: Server running
    Steps:
      1. `curl -X POST http://localhost:3001/api/config/validate -H "Content-Type: application/json" -d '{"path":"/nonexistent/file.json","type":"opencode"}'`
      2. Verify response: valid=false, exists=false
    Expected Result: Returns { valid: false, exists: false, error: "File not found" }
    Evidence: .sisyphus/evidence/task6-validate-invalid.json
  ```

  **Commit**: YES (group with Task 5)

- [x] 7. Update config-manager.ts to use path utility

  **What to do**:
  - Refactor `getBaseConfigDir()` to use path utility
  - Ensure all path construction uses `path.join()`
  - Keep environment variable overrides working

  **Must NOT do**:
  - Do NOT change the public API signature
  - Do NOT remove env var support

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:
  - `src/server/config-manager.ts:33-44` - Current implementation
  - `src/utils/paths.ts` - New path utility

  **Acceptance Criteria**:
  - [ ] Uses path utility for base directory
  - [ ] Env var overrides still work
  - [ ] All existing tests pass

  **QA Scenarios**:
  ```
  Scenario: config-manager uses path utility
    Tool: Bash (bun test)
    Preconditions: Task 1 complete
    Steps:
      1. Run `bun test src/server/config-manager.test.ts`
      2. Verify all tests pass
    Expected Result: No test failures
    Evidence: .sisyphus/evidence/task7-manager-test.txt
  ```

  **Commit**: YES
  - Message: `refactor(config): use centralized path utility`
  - Files: `src/server/config-manager.ts`

- [x] 8. Update SettingsPage with path configuration UI

  **What to do**:
  - Add "Path Configuration" section to SettingsPage
  - Display current detected paths (openAgent, opencode, omo, db)
  - Add input fields for custom paths with validation
  - Add "Validate" button that calls validation API
  - Show validation results (success/error with details)
  - Add "Reset to Defaults" button
  - **Integration**: Update `dashboardStore.fetchConfig()` to use custom paths from settingsStore when set
  - **Integration**: AgentConfigPanel and ModelLibrary will automatically use correct paths via dashboardStore

  **Must NOT do**:
  - Do NOT add file browser component
  - Do NOT change existing theme settings UI
  - Do NOT modify AgentConfigPanel or ModelLibrary directly (they use dashboardStore)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Task 5, 6, 9

  **References**:
  - `src/components/SettingsPage.tsx` - Current settings UI
  - `src/stores/settingsStore.ts` - Settings state
  - `src/stores/dashboardStore.ts` - Config fetching (lines 161-174)
  - `src/server/routes/config.ts` - API endpoints
  - `src/components/AgentConfigPanel.tsx` - Uses config from dashboardStore
  - `src/components/ModelLibrary.tsx` - Uses config from dashboardStore (lines 9, 41-44)

  **Acceptance Criteria**:
  - [ ] New "Path Configuration" section added
  - [ ] Displays current paths with OS info
  - [ ] Input fields for custom paths (openAgent, opencode, omo, db)
  - [ ] Validate button calls API and shows result
  - [ ] Reset button restores defaults
  - [ ] When custom paths are set, dashboardStore.fetchConfig() uses them
  - [ ] AgentConfigPanel and ModelLibrary display correct config data

  **QA Scenarios**:
  ```
  Scenario: Path configuration UI works
    Tool: Playwright
    Preconditions: Server running, frontend built
    Steps:
      1. Navigate to Settings page
      2. Verify "Path Configuration" section exists
      3. Enter invalid path and click Validate
      4. Verify error message shown
      5. Enter valid path and click Validate
      6. Verify success message shown
    Expected Result: UI shows paths, validates correctly
    Evidence: .sisyphus/evidence/task8-settings-ui.png

  Scenario: Custom paths affect AgentConfigPanel and ModelLibrary
    Tool: Playwright
    Preconditions: Server running, valid custom paths set
    Steps:
      1. Set custom opencode.json path in Settings
      2. Navigate to ModelLibrary
      3. Verify models from custom path are displayed
      4. Navigate to AgentConfigPanel
      5. Verify agents from custom path are displayed
    Expected Result: Both components show data from custom paths
    Evidence: .sisyphus/evidence/task8-components-custom-paths.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add path configuration to settings`
  - Files: `src/components/SettingsPage.tsx`, `src/stores/dashboardStore.ts`

- [x] 9. Update settingsStore with path state

  **What to do**:
  - Add path fields to settingsStore state
  - Add actions to update custom paths
  - Persist to localStorage
  - **Integration**: Export path state for dashboardStore to consume

  **Must NOT do**:
  - Do NOT remove existing fields
  - Do NOT change persistence key

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 8
  - **Blocked By**: None

  **References**:
  - `src/stores/settingsStore.ts` - Current store
  - `src/stores/themeStore.ts` - Example of persisted store
  - `src/stores/dashboardStore.ts` - Will read from settingsStore

  **Acceptance Criteria**:
  - [ ] Added: `customOpenAgentPath`, `customOpencodePath`, `customOmoPath`, `customDbPath`
  - [ ] Added: `setCustomOpenAgentPath()`, etc.
  - [ ] Persists to localStorage
  - [ ] Exported for dashboardStore integration

  **QA Scenarios**:
  ```
  Scenario: settingsStore persists paths
    Tool: Bash (node)
    Preconditions: None
    Steps:
      1. Set custom path in store
      2. Reload page
      3. Verify path persisted
    Expected Result: Custom path survives reload
    Evidence: .sisyphus/evidence/task9-store-persist.txt
  ```

  **Commit**: YES (group with Task 8)

- [x] 10. Unit tests for path utilities

  **What to do**:
  - Create `src/utils/paths.test.ts`
  - Test `getConfigDir()` for each OS
  - Test `getDataDir()` for each OS
  - Test `getHomeDir()` fallback
  - Test path with spaces
  - Test env var overrides

  **Must NOT do**:
  - Do NOT test actual file system
  - Do NOT modify real paths

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:
  - `src/utils/paths.ts` - Module to test
  - `src/test/setup.ts` - Test setup
  - Vitest mocking docs

  **Acceptance Criteria**:
  - [ ] Test file created: `src/utils/paths.test.ts`
  - [ ] Tests for Windows, macOS, Linux paths
  - [ ] Tests for env var overrides
  - [ ] Tests for path with spaces
  - [ ] Coverage > 80%

  **QA Scenarios**:
  ```
  Scenario: Path utility tests pass
    Tool: Bash (bun test)
    Preconditions: Task 1 complete
    Steps:
      1. Run `bun test src/utils/paths.test.ts`
      2. Verify all tests pass
      3. Check coverage report
    Expected Result: 100% tests pass, coverage > 80%
    Evidence: .sisyphus/evidence/task10-test-results.txt
  ```

  **Commit**: YES
  - Message: `test(paths): add unit tests for path utilities`
  - Files: `src/utils/paths.test.ts`

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter + `bun test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp).
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill if UI)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together, not isolation). Test edge cases: empty state, invalid input, rapid actions. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Task 1**: `feat(paths): add cross-platform path utility module`
- **Task 2-3**: `fix(config): replace hardcoded paths with path utility`
- **Task 4**: `fix(watcher): use os.homedir() for cross-platform support`
- **Task 5-6**: `feat(api): add path info and validation endpoints`
- **Task 7**: `refactor(config): use centralized path utility`
- **Task 8-9**: `feat(ui): add path configuration to settings`
- **Task 10**: `test(paths): add unit tests for path utilities`

---

## Success Criteria

### Verification Commands
```bash
# Build check
npm run build

# Type check
npx tsc --noEmit

# Unit tests
bun test

# Path utility tests specifically
bun test src/utils/paths.test.ts

# API test
curl http://localhost:3001/api/config/paths
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] No hardcoded forward slashes in path construction
- [ ] Windows paths work correctly
- [ ] UI path configuration functional
- [ ] Evidence files captured for all tasks