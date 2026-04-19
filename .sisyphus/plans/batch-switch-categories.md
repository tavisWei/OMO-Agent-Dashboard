# Batch Model Switch with Category Presets

## TL;DR

> **Quick Summary**: Enhance the global model switching UI to support batch-updating category presets alongside agents.
> 
> **Deliverables**:
> - Updated `src/App.tsx` batch switch UI with scope selector
> - Backend batch category update support in `config-manager.ts`
> - Updated API route in `src/server/routes/config.ts`
> 
> **Estimated Effort**: Small
> **Parallel Execution**: NO - sequential
> **Critical Path**: UI update → Backend API → Verification

---

## Context

### Original Request
用户发现智能体的全局模型切换不支持分类预设，希望添加"同时应用到分类预设"的功能。

### Analysis Summary
**Current Behavior**:
- Global model switch (`handleBatchSwitch` in App.tsx) only iterates over `config.agents`
- Category presets are stored in `oh-my-openagent.json > categories` 
- Users must manually edit each category preset one by one

**Gap**:
- No UI option to apply batch switch to categories
- No backend support for batch category updates
- No way to sync agent and category models in one operation

---

## Work Objectives

### Core Objective
Add a "Apply to category presets" option to the global model switching UI, allowing users to batch-update both agents and categories simultaneously.

### Concrete Deliverables
1. Updated `src/App.tsx` - Add scope selector (agents / categories / both)
2. Updated `src/server/config-manager.ts` - Add `updateCategoryModelsBatch()` function
3. Updated `src/server/routes/config.ts` - Add batch category update endpoint

### Definition of Done
- [ ] UI shows scope selector in global model switch section
- [ ] Users can choose: agents only, categories only, or both
- [ ] Backend supports batch category updates
- [ ] Existing functionality preserved (backward compatible)

### Must Have
- Scope selector UI (checkbox or radio buttons)
- Batch category update API endpoint
- Backward compatibility (default: agents only, matching current behavior)

### Must NOT Have (Guardrails)
- Do NOT change the default behavior (agents only)
- Do NOT modify individual category update endpoint
- Do NOT change config file format
- Do NOT add new dependencies

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Vitest)
- **Automated tests**: NO (too small for dedicated tests)
- **Manual QA**: YES

---

## Execution Strategy

### Sequential Tasks

```
Task 1: Add batch category update to config-manager.ts
Task 2: Add batch category API endpoint to config.ts
Task 3: Update global model switch UI in App.tsx
Task 4: Manual QA verification
```

### Dependency Matrix
- **Task 1**: None → Blocks Task 2
- **Task 2**: Task 1 → Blocks Task 3
- **Task 3**: Task 2 → None
- **Task 4**: Task 3 → None

---

## TODOs

- [x] 1. Add batch category update function to config-manager.ts

  **What to do**:
  - Add `updateCategoryModelsBatch()` function in `src/server/config-manager.ts`
  - Accept array of category names and model update
  - Update all specified categories in `oh-my-openagent.json`
  - Return success/error result

  **Must NOT do**:
  - Do NOT modify existing `updateCategoryModel()` function
  - Do NOT change config file format

  **References**:
  - `src/server/config-manager.ts:254-266` - Existing `updateCategoryModel()`
  - `src/server/config-manager.ts:240-252` - Existing `updateAgentModel()`

  **Acceptance Criteria**:
  - [ ] Function accepts `(categoryNames: string[], update: AgentModelUpdate)`
  - [ ] Updates all categories atomically
  - [ ] Returns `ConfigManagerResult<boolean>`

- [x] 2. Add batch category API endpoint

  **What to do**:
  - Add `PUT /api/config/categories/batch` endpoint in `src/server/routes/config.ts`
  - Accept `{ categories: string[], model: string, variant?: string }`
  - Call `updateCategoryModelsBatch()`
  - Return success/error response

  **Must NOT do**:
  - Do NOT modify existing category endpoints

  **References**:
  - `src/server/routes/config.ts:83-98` - Existing category endpoint
  - `src/server/config-manager.ts` - New batch function

  **Acceptance Criteria**:
  - [ ] Endpoint accepts PUT with category list and model
  - [ ] Returns `{ success: true }` or error

- [x] 3. Update global model switch UI

  **What to do**:
  - Modify `src/App.tsx` global model switch section (lines 224-263)
  - Add scope selector: "Agents" checkbox + "Categories" checkbox
  - Default: Agents checked, Categories unchecked (backward compatible)
  - Update `handleBatchSwitch` to conditionally include categories
  - Show loading state for both operations

  **Must NOT do**:
  - Do NOT change default behavior (agents only)
  - Do NOT remove existing UI elements

  **References**:
  - `src/App.tsx:224-263` - Current global switch UI
  - `src/App.tsx:196-218` - Current `handleBatchSwitch`

  **Acceptance Criteria**:
  - [ ] UI shows two checkboxes: "Agents" and "Category presets"
  - [ ] Default: Agents checked, Categories unchecked
  - [ ] When both checked, batch switch updates both
  - [ ] When only categories checked, only categories updated
  - [ ] Loading state works correctly

  **QA Scenarios**:
  ```
  Scenario: Batch switch with both agents and categories
    Tool: Browser
    Preconditions: Server running, config loaded
    Steps:
      1. Navigate to Agents page
      2. Select a model in global switch
      3. Check both "Agents" and "Category presets"
      4. Click "一键切换"
      5. Verify both agents and categories updated
    Expected Result: All agents and categories use the new model
  ```

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit**
  Verify all Must Have items implemented. Check Must NOT HAVE compliance.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | VERDICT`

- [ ] F2. **Code Quality Review**
  Run `tsc --noEmit` + `npm run build`. Check for anti-patterns.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | VERDICT`

- [ ] F3. **Real Manual QA**
  Test all three scenarios: agents only, categories only, both.
  Output: `Scenarios [N/N pass] | VERDICT`

---

## Commit Strategy

- **Task 1-3**: `feat(batch-switch): add category preset support to global model switching`

---

## Success Criteria

### Verification Commands
```bash
# Type check
npx tsc --noEmit

# Build
npm run build

# Manual test
# 1. Start server
# 2. Open Agents page
# 3. Test batch switch with different scope combinations
```

### Final Checklist
- [ ] Scope selector visible in global model switch section
- [ ] Default behavior unchanged (agents only)
- [ ] Both agents and categories can be updated simultaneously
- [ ] Build passes
- [ ] No TypeScript errors
