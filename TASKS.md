# TASKS - OMO Agent Dashboard

> 本文档为 OMO Agent Dashboard 的任务分解清单
> 生成时间: 2026-04-11
> 状态: 规划中

---

## Wave 1: 项目初始化（可并行）

### Task 1.1: 项目脚手架搭建
**Category**: quick  
**Parallelization**: can run in parallel: yes

**任务描述**:
- 初始化 Vite + React + TypeScript 项目
- 配置 Tailwind CSS 4
- 配置 ESLint + Prettier
- 安装核心依赖: express, better-sqlite3, ws, zustand, react-router-dom
- 配置 `package.json` scripts: dev, build, start

**参考文件**:
- SPEC.md (技术架构部分)

**验收标准**:
- [ ] `npm install` 成功，无 error
- [ ] `npm run dev` 启动开发服务器
- [ ] 浏览器访问 `http://localhost:3001` 显示空白 React 页面

---

### Task 1.2: 数据库层搭建
**Category**: quick  
**Parallelization**: can run in parallel: yes

**任务描述**:
- 使用 better-sqlite3 初始化 SQLite 数据库
- 创建数据库 schema（projects, agents, tasks, cost_records, activity_logs）
- 配置 WAL 模式
- 创建 `src/db/` 目录结构
- 编写数据库初始化脚本

**参考文件**:
- SPEC.md (数据库设计部分)
- `.opencode/spec-templates/07-数据库设计.md`

**验收标准**:
- [ ] 数据库文件 `data/dashboard.db` 自动创建
- [ ] 所有表创建成功
- [ ] 可以执行基本的 CRUD 操作

---

### Task 1.3: 配置文件读取模块
**Category**: deep  
**Parallelization**: can run in parallel: yes

**任务描述**:
- 创建 OMO 配置文件读取模块
- 支持读取 `~/.config/opencode/oh-my-opencode.jsonc`
- 解析 JSONC 格式（支持注释）
- 提取 agents 配置列表
- 实现配置文件的保存功能

**参考文件**:
- SPEC.md (配置文件同步部分)

**验收标准**:
- [ ] 可以读取本地 OMO 配置文件
- [ ] 解析成功返回智能体列表
- [ ] 保存配置后 JSON 格式正确

---

## Wave 2: 后端 API + WebSocket（可并行）

### Task 2.1: Express REST API 搭建
**Category**: quick  
**Parallelization**: can run in parallel: yes

**任务描述**:
- 创建 Express 应用入口
- 配置 CORS（仅允许 localhost）
- 创建 API 路由结构:
  - `GET /api/projects` - 项目列表
  - `POST /api/projects` - 创建项目
  - `GET /api/projects/:id` - 项目详情
  - `PUT /api/projects/:id` - 更新项目
  - `DELETE /api/projects/:id` - 删除项目
  - `GET /api/agents` - 智能体列表
  - `PUT /api/agents/:id` - 更新智能体
  - `GET /api/tasks` - 任务列表
  - `POST /api/tasks` - 创建任务
  - `PUT /api/tasks/:id` - 更新任务
  - `DELETE /api/tasks/:id` - 删除任务

**参考文件**:
- SPEC.md (技术架构 - REST API 部分)
- `.opencode/spec-templates/03-接口文档.md`

**验收标准**:
- [ ] 所有 API 路由响应 200/201/204
- [ ] POST 请求 body 正确解析
- [ ] 错误请求返回 400/404/500

---

### Task 2.2: WebSocket 实时通信
**Category**: deep  
**Parallelization**: can run in parallel: yes

**任务描述**:
- 创建 WebSocket 服务器（与 Express 共用端口）
- 实现心跳检测机制
- 实现消息广播（智能体状态变更）
- 实现客户端订阅/退订
- 定义消息协议:
  ```json
  { "type": "agent_update", "payload": { "agentId": "...", "status": "..." } }
  { "type": "task_update", "payload": { "taskId": "...", "status": "..." } }
  ```

**参考文件**:
- SPEC.md (实时更新部分)

**验收标准**:
- [ ] WebSocket 连接成功率 > 99%
- [ ] 消息延迟 P95 < 500ms
- [ ] 支持多客户端同时连接

---

### Task 2.3: 文件监听模块
**Category**: unspecified-high  
**Parallelization**: can run in parallel: yes

**任务描述**:
- 使用 chokidar 监听 OMO 配置文件变化
- 配置文件变更时自动同步到数据库
- 触发 WebSocket 广播通知前端
- 防抖处理（避免频繁触发）

**参考文件**:
- SPEC.md (配置文件同步部分)

**验收标准**:
- [ ] 配置文件变更后 1s 内触发同步
- [ ] 无重复触发
- [ ] 监听稳定，不泄漏内存

---

## Wave 3: 前端基础 UI（可并行）

### Task 3.1: 应用布局组件
**Category**: visual-engineering  
**Parallelization**: can run in parallel: yes

**任务描述**:
- 创建 AppLayout 组件（Header + Sidebar + Main）
- 创建 Header 组件（Logo, 项目选择器, 主题切换, 设置按钮）
- 创建 Sidebar 组件（项目列表, 新建项目, 快捷入口）
- 配置 React Router（/project/:id, /agent/:id, /analytics, /settings）
- 实现主题切换功能（Zustand store + localStorage）

**参考文件**:
- SPEC.md (页面结构部分)

**验收标准**:
- [ ] 布局响应式，无滚动条溢出
- [ ] 主题切换无闪烁
- [ ] 路由跳转正常

---

### Task 3.2: 智能体卡片组件
**Category**: visual-engineering  
**Parallelization**: can run in parallel: yes

**任务描述**:
- 创建 AgentCard 组件:
  - 智能体名称 + 图标
  - 状态指示器（运行中/空闲/错误）
  - 当前模型名称
  - Token 使用量
  - 编辑按钮
- 创建 AgentGrid 组件（网格布局）
- 创建状态徽章组件（StatusBadge）

**参考文件**:
- SPEC.md (Dashboard 布局图示)

**验收标准**:
- [ ] 卡片布局整齐，间距一致
- [ ] 状态颜色正确区分（绿色=运行, 灰色=空闲, 红色=错误）
- [ ] 响应式布局（不同屏幕宽度自适应）

---

### Task 3.3: 智能体配置面板
**Category**: visual-engineering  
**Parallelization**: can run in parallel: yes

**任务描述**:
- 创建 AgentConfigPanel 组件（Modal/Drawer）
- 模型选择器（支持自动补全）
- Temperature 滑块（0-2，步进 0.1）
- Top P 滑块（0-1，步进 0.05）
- Max Tokens 输入框
- 保存/取消按钮
- 表单验证与错误提示

**参考文件**:
- SPEC.md (智能体配置面板图示)

**验收标准**:
- [ ] 滑块拖动流畅
- [ ] 模型补全下拉正常
- [ ] 保存后配置立即生效

---

### Task 3.4: 项目管理组件
**Category**: visual-engineering  
**Parallelization**: can run in parallel: yes

**任务描述**:
- 创建 ProjectList 组件（侧边栏项目列表）
- 创建 ProjectCard 组件
- 创建 NewProjectDialog 组件
- 实现项目的 CRUD 操作（通过 API）
- 项目选中状态高亮

**参考标准**:
- [ ] 项目创建 < 1s
- [ ] 无重复项目名
- [ ] 删除确认弹窗

---

## Wave 4: 任务看板 + 成本统计

### Task 4.1: 任务看板页面
**Category**: visual-engineering  
**Parallelization**: can run in parallel: yes

**任务描述**:
- 创建 KanbanBoard 组件
- 四列布局: Backlog, In Progress, Done, Failed
- 任务卡片拖拽（使用 @dnd-kit）
- 任务创建/编辑/删除
- 按项目筛选
- 拖拽时显示占位符

**参考文件**:
- SPEC.md (任务看板描述)

**验收标准**:
- [ ] 拖拽流畅（帧率 > 30fps）
- [ ] 状态变更后 500ms 内同步
- [ ] 支持触摸设备拖拽

---

### Task 4.2: 成本统计页面
**Category**: visual-engineering  
**Parallelization**: can run in parallel: yes

**任务描述**:
- 创建 CostOverview 组件（总览卡片）
- 时间范围选择器（今日/本周/本月/自定义）
- Token 使用图表（使用 recharts）
- 按智能体/项目分类展示
- CSV 导出功能
- 支持主流模型定价（OpenAI/Anthropic/Google）

**参考文件**:
- SPEC.md (成本追踪部分)

**验收标准**:
- [ ] 成本数据延迟 < 5min
- [ ] 图表渲染流畅
- [ ] CSV 导出格式正确

---

## Wave 5: 高级功能

### Task 5.1: 智能体 Chat 功能
**Category**: visual-engineering  
**Parallelization**: can run in parallel: yes

**任务描述**:
- 创建 AgentChat 组件
- 消息输入框（支持 Markdown）
- 消息列表（流式响应）
- 代码块语法高亮（使用 highlight.js）
- 发送/接收动画
- 聊天历史记录

**验收标准**:
- [ ] 流式响应正常显示
- [ ] 代码块高亮正确
- [ ] 滚动到最新消息

---

### Task 5.2: 活动日志页面
**Category**: visual-engineering  
**Parallelization**: can run in parallel: yes

**任务描述**:
- 创建 ActivityFeed 组件
- 日志列表（时间倒序）
- 日志类型筛选（started/stopped/error/config_changed）
- 按智能体/项目筛选
- 分页加载
- 实时更新（新日志高亮）

**验收标准**:
- [ ] 日志实时更新
- [ ] 分页加载无闪烁
- [ ] 筛选结果正确

---

### Task 5.3: 设置页面
**Category**: visual-engineering  
**Parallelization**: can run in parallel: yes

**任务描述**:
- 创建 SettingsPage 组件
- 主题选择（跟随系统/亮色/暗色）
- OMO 配置路径配置
- API Key 配置（成本追踪用）
- 数据导出/导入
- 关于页面（版本信息）

**验收标准**:
- [ ] 设置保存成功
- [ ] 路径配置正确性校验
- [ ] 导出文件格式正确

---

## Wave 6: 测试 + 部署

### Task 6.1: 单元测试
**Category**: unspecified-high  
**Parallelization**: can run in parallel: yes

**任务描述**:
- 配置 Vitest
- 编写数据库层测试
- 编写 API 路由测试
- 编写前端组件测试（React Testing Library）
- 测试覆盖率 > 70%

**参考文件**:
- `.opencode/spec-templates/10-测试策略.md`

**验收标准**:
- [ ] `npm test` 通过
- [ ] 覆盖率报告生成
- [ ] 无失败的测试用例

---

### Task 6.2: E2E 测试
**Category**: unspecified-high  
**Parallelization**: can run in parallel: yes

**任务描述**:
- 配置 Playwright
- 编写核心流程 E2E 测试:
  - 安装验证
  - 智能体列表加载
  - 创建项目
  - 编辑智能体配置
  - 任务看板拖拽
- 配置 CI/CD（可选）

**验收标准**:
- [ ] 所有 E2E 测试通过
- [ ] 测试稳定，无 flaky

---

### Task 6.3: 文档 + 发布
**Category**: writing  
**Parallelization**: can run in parallel: yes

**任务描述**:
- 编写 README.md（安装 + 使用说明）
- 编写 CONTRIBUTING.md
- 配置 GitHub Actions（CI）
- 创建 Release Notes
- 发布 npm 包（可选）

**验收标准**:
- [ ] README 清晰可执行
- [ ] npm publish 成功（如果选择发布）

---

## 依赖关系图

```
Wave 1 ──┬── Task 1.1 (脚手架)
         ├── Task 1.2 (数据库)
         └── Task 1.3 (配置文件)
                │
                ▼
Wave 2 ──┬── Task 2.1 (REST API) ←──────────────┐
         ├── Task 2.2 (WebSocket) ──────────────┼─── Task 1.2
         └── Task 2.3 (文件监听) ────────────────┘
                │
                ▼
Wave 3 ──┬── Task 3.1 (布局组件)
         ├── Task 3.2 (智能体卡片) ─────────────┐
         ├── Task 3.3 (配置面板) ───────────────┼── Wave 2
         └── Task 3.4 (项目管理) ───────────────┘
                │
                ▼
Wave 4 ──┬── Task 4.1 (任务看板) ────────────────────────┐
         └── Task 4.2 (成本统计) ─────────────────────────┤
                │                                          │
                ▼                                          ▼
Wave 5 ──┬── Task 5.1 (Chat) ─────────────────────────────┤
         ├── Task 5.2 (活动日志) ─────────────────────────┤
         └── Task 5.3 (设置页面) ──────────────────────────┘
                │
                ▼
Wave 6 ──┬── Task 6.1 (单元测试)
         ├── Task 6.2 (E2E 测试)
         └── Task 6.3 (文档发布)
```

---

## 执行顺序建议

1. **先跑通最小闭环**: Task 1.1 → Task 1.2 → Task 2.1 → Task 3.1
2. **核心功能优先**: 智能体状态显示 + 配置修改（Task 3.2 + 3.3）
3. **差异化功能**: 任务看板 + 成本统计（Wave 4）
4. **体验优化**: Chat + 活动日志（Wave 5）
5. **质量保障**: 测试 + 文档（Wave 6）

---

## 预估工时

| Wave | 任务数 | 预估工时 |
|------|--------|----------|
| Wave 1 | 3 | 4h |
| Wave 2 | 3 | 6h |
| Wave 3 | 4 | 8h |
| Wave 4 | 2 | 6h |
| Wave 5 | 3 | 6h |
| Wave 6 | 3 | 5h |
| **总计** | **18** | **~35h** |

---

## 状态追踪

| Task | Status | Completed At | Notes |
|------|--------|-------------|-------|
| Task 1.1 | pending | - | - |
| Task 1.2 | pending | - | - |
| Task 1.3 | pending | - | - |
| Task 2.1 | pending | - | - |
| Task 2.2 | pending | - | - |
| Task 2.3 | pending | - | - |
| Task 3.1 | pending | - | - |
| Task 3.2 | pending | - | - |
| Task 3.3 | pending | - | - |
| Task 3.4 | pending | - | - |
| Task 4.1 | pending | - | - |
| Task 4.2 | pending | - | - |
| Task 5.1 | pending | - | - |
| Task 5.2 | pending | - | - |
| Task 5.3 | pending | - | - |
| Task 6.1 | pending | - | - |
| Task 6.2 | pending | - | - |
| Task 6.3 | pending | - | - |
