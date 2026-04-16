# OMO Agent Dashboard

> Oh My OpenCode 实时可视化控制台 | 零外部依赖 | 本地优先

[English](#english) | [中文](#中文)

---

<a name="中文"></a>
## 中文

### 项目简介

**OMO Agent Dashboard** 是专为 [Oh My OpenCode (OMO)](https://github.com/code-yeongyu/oh-my-opencode) 多智能体系统设计的**实时监控与管理控制台**。

不同于早期版本需要手动维护一套独立的 Agent 配置，当前版本的 Dashboard 直接**桥接 OpenCode 运行时数据库**和**本地配置文件**，让你在一个 Web 界面中实时掌握所有智能体会话的状态、模型配置、Token 消耗与任务编排进度。

**核心定位**：OMO 用户的"任务控制中心"——安装即用，无需 Docker、无需 PostgreSQL、无需云端账号。

---

### 核心功能

#### 1. 实时智能体会话监控
- 直接读取 OpenCode 本地 SQLite 数据库（`~/.local/share/opencode/opencode.db`）
- 实时展示会话状态：`queued`（排队中）、`thinking`（思考中）、`running`（运行中）、`completed`（已完成）、`error`（出错）
- WebSocket 推送更新，延迟 < 500ms
- 支持按项目目录与状态多维筛选
- 会话层级树展示（父子会话关系）

#### 2. 可视化模型与配置管理
- 读取并编辑 `oh-my-openagent.json` 中的智能体模型映射
- 读取并编辑 `opencode.json` 中的 Provider / 模型列表 / API Key
- 分类预设（Categories）模型快速切换
- 配置版本管理：保存快照、一键回滚、删除历史版本

#### 3. 任务看板与编排（Kanban + Orchestration）
- 四列任务看板：Backlog → In Progress → Done → Failed
- 任务依赖关系管理（阻塞/前置依赖校验）
- 多智能体任务编排：支持 `sequential`（顺序）、`parallel`（并行）、`pipeline`（流水线）三种模式
- 实时编排状态推送与进度追踪

#### 4. tmux 会话联动
- 自动轮询本地 tmux 会话活跃度
- 将会话活跃状态同步到 Agent 状态看板

#### 5. 活动日志与系统事件
- 实时活动流（Activity Feed）
- 记录智能体启停、配置变更、错误事件

#### 6. 主题与国际化
- 暗色 / 亮色主题切换，无闪烁
- 基于 i18next 的国际化架构（目前支持中文/英文）

---

### 逻辑架构图

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              用户浏览器 (Browser)                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │  会话监控看板  │  │  模型配置管理  │  │  任务看板    │  │  配置版本管理    │ │
│  │ AgentMonitor │  │ ModelLibrary │  │ ProjectDetail│  │   Agents Page   │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘ │
│         └─────────────────┴─────────────────┴───────────────────┘           │
│                                    │                                        │
│                           HTTP / WebSocket                                  │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────┐
│                           后端服务层 (Node.js + Express)                      │
│  ┌─────────────────────────────────┼─────────────────────────────────────┐  │
│  │        REST API 路由            │         WebSocket 服务               │  │
│  │  ├─ /api/sessions      会话查询  │   实时推送: agent_status             │  │
│  │  ├─ /api/agents        Agent管理 │   实时推送: session_update           │  │
│  │  ├─ /api/tasks         任务CRUD  │   实时推送: task_updated             │  │
│  │  ├─ /api/config        配置管理  │   实时推送: orchestration_update     │  │
│  │  ├─ /api/models        模型管理  │   心跳检测 + 多客户端广播             │  │
│  │  ├─ /api/tmux          tmux状态  │                                      │  │
│  │  └─ /api/activity-logs 活动日志  │                                      │  │
│  └─────────────────────────────────┴─────────────────────────────────────┘  │
│                                    │                                        │
│  ┌─────────────────────────────────┼─────────────────────────────────────┐  │
│  │         数据适配层 (Adapter)     │         配置管理层 (Config Manager)  │  │
│  │  - opencode-reader.ts           │  - 读写 oh-my-openagent.json         │  │
│  │  - adapter.ts (状态推断)         │  - 读写 opencode.json                │  │
│  │  - agentStatus.ts (运行时状态)   │  - 读写 oh-my-opencode.jsonc (legacy)│  │
│  │  - orchestrator.ts (编排引擎)    │  - 配置版本快照与回滚                  │  │
│  └─────────────────────────────────┴─────────────────────────────────────┘  │
│                                    │                                        │
│         ┌──────────────────────────┴──────────────────────────┐             │
│         │                                                     │             │
│  ┌──────┴──────┐                                    ┌─────────┴─────────┐   │
│  │ OpenCode DB │                                    │ Dashboard SQLite  │   │
│  │  (只读桥接)  │                                    │  (任务/项目/日志)  │   │
│  │ ~/.local/...│                                    │ data/dashboard.db │   │
│  └─────────────┘                                    └───────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 技术架构图

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Frontend (Vite + React 19)                     │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  UI Layer                                                           │    │
│  │   - Tailwind CSS 4 (原子化样式 + CSS Variables 主题)                │    │
│  │   - React Router DOM 7 (SPA 路由)                                   │    │
│  │   - i18next + react-i18next (国际化)                                │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  State Management                                                   │    │
│  │   - Zustand 5 (分领域 Store)                                         │    │
│  │     ├─ dashboardStore   会话/项目/概览数据                           │    │
│  │     ├─ agentRuntimeStore WebSocket 连接与实时状态                     │    │
│  │     ├─ projectStore     本地项目筛选状态                             │    │
│  │     ├─ taskStore        任务与看板状态                               │    │
│  │     ├─ themeStore       主题偏好 (持久化到 localStorage)              │    │
│  │     └─ settingsStore    用户设置                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Component Architecture                                             │    │
│  │   - AppLayout / Header / Sidebar                                    │    │
│  │   - AgentMonitorView / AgentRuntimeCard / StatusBadge               │    │
│  │   - ProjectDetail / TaskCard / NewTaskDialog                        │    │
│  │   - ModelLibrary / AgentConfigPanel / SettingsPage                  │    │
│  │   - ActivityFeed (紧凑/完整双模式)                                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │ HTTP / WS
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Backend (Node.js + Express 4)                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Server Entry: src/server/index.ts                                  │    │
│  │   - CORS 配置 (localhost:3002)                                      │    │
│  │   - 全局错误处理中间件                                               │    │
│  │   - 启动时同步 OMO 配置 + 初始化数据库                               │    │
│  │   - tmux 轮询定时器 (5s)                                            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  WebSocket Module: src/server/websocket.ts                          │    │
│  │   - 与 Express 共用端口 (upgrade 事件)                               │    │
│  │   - 30s 心跳检测 + 自动清理断连客户端                                │    │
│  │   - 文件监听 (watcher.ts) 触发广播                                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Route Modules                                                      │    │
│  │   - sessions.ts    OpenCode 会话查询 (只读)                          │    │
│  │   - agents.ts      Agent CRUD + 回写 OMO 配置                        │    │
│  │   - tasks.ts       任务全生命周期 + 依赖校验 + 编排触发               │    │
│  │   - config.ts      三份配置文件的读写与版本管理                       │    │
│  │   - models.ts      Dashboard 内部模型库管理                          │    │
│  │   - cost.ts        Token 成本记录查询                                │    │
│  │   - tmux.ts        tmux 会话状态查询                                 │    │
│  │   - activity-logs.ts 活动日志查询                                    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Core Services                                                      │    │
│  │   - opencode-reader.ts   桥接 OpenCode SQLite (better-sqlite3)      │    │
│  │   - adapter.ts           会话状态推断 + 树形组装 + 项目分组           │    │
│  │   - agentStatus.ts       运行时状态聚合 + WebSocket 广播              │    │
│  │   - orchestrator.ts      任务编排引擎 (Sequential/Parallel/Pipeline) │    │
│  │   - config-manager.ts    本地 JSON/JSONC 配置管理 + 版本快照          │    │
│  │   - watcher.ts           文件变更监听 (chokidar)                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         │                            │                            │
┌────────┴────────┐        ┌─────────┴─────────┐        ┌────────┴────────┐
│   OpenCode DB   │        │  Dashboard SQLite │        │  Config Files   │
│  (better-sqlite3│        │   (better-sqlite3)│        │   (JSON/JSONC)  │
│   readonly)     │        │                   │        │                 │
│ ~/.local/share/ │        │  data/dashboard.db│        │ ~/.config/      │
│ opencode/       │        │                   │        │ opencode/       │
│ opencode.db     │        │  - projects       │        │                 │
│                 │        │  - agents         │        │ - oh-my-        │
│  - session      │        │  - tasks          │        │   openagent.json│
│  - message      │        │  - task_orchestrations│    │                 │
│  - todo         │        │  - cost_records   │        │ - opencode.json │
│  - project      │        │  - activity_logs  │        │                 │
│                 │        │                   │        │ - oh-my-        │
│                 │        │                   │        │   opencode.jsonc│
└─────────────────┘        └───────────────────┘        └─────────────────┘
```

---

### 技术栈

| 层级 | 技术 | 选型理由 |
|------|------|----------|
| 前端框架 | React 19 + Vite 8 | 现代化开发体验，Fast HMR |
| UI 样式 | Tailwind CSS 4 | 原子化 CSS，主题切换零成本 |
| 状态管理 | Zustand 5 | 轻量、无样板代码、支持持久化 |
| 后端框架 | Express 4 | 稳定、生态丰富 |
| 实时通信 | WebSocket (`ws`) | 与 Express 同端口，零额外依赖 |
| 数据库 | better-sqlite3 | 同步 API、WAL 模式、本地零运维 |
| 文件监听 | chokidar | 跨平台、高可靠 |
| 测试 | Vitest + React Testing Library + Playwright | 单元测试 97 例全部通过 |
| 构建工具 | TypeScript 5.7 + tsx | 严格类型检查、Node 热重载 |

---

### 项目结构

```text
OMO-Agent-Dashboard/
├── src/
│   ├── components/           # React 组件
│   │   ├── AgentMonitorView.tsx      # 主监控看板
│   │   ├── AgentRuntimeCard.tsx      # 智能体运行时卡片
│   │   ├── AgentConfigPanel.tsx      # 配置面板
│   │   ├── ProjectDetail.tsx         # 项目详情 + 任务看板
│   │   ├── TaskCard.tsx / NewTaskDialog.tsx
│   │   ├── ModelLibrary.tsx          # 模型库管理
│   │   ├── SettingsPage.tsx          # 设置页
│   │   ├── ActivityFeed.tsx          # 活动日志
│   │   └── AppLayout.tsx / Header.tsx / Sidebar.tsx
│   ├── server/               # Express 后端
│   │   ├── index.ts                  # 服务入口 (Port 3001)
│   │   ├── websocket.ts              # WebSocket 服务
│   │   ├── opencode-reader.ts        # OpenCode DB 桥接
│   │   ├── adapter.ts                # 数据适配与状态推断
│   │   ├── agentStatus.ts            # 运行时状态监控
│   │   ├── orchestrator.ts           # 任务编排引擎
│   │   ├── config-manager.ts         # 配置管理 + 版本快照
│   │   ├── watcher.ts                # 文件变更监听
│   │   └── routes/                   # API 路由
│   ├── db/                   # Dashboard SQLite 层
│   │   ├── index.ts                  # CRUD 封装
│   │   ├── schema.ts                 # 表结构定义
│   │   └── migrations.ts             # 迁移脚本
│   ├── config/               # OMO 配置读写模块
│   ├── stores/               # Zustand 状态仓库
│   ├── types/                # TypeScript 类型定义
│   └── i18n/                 # 国际化资源
├── e2e/                      # Playwright E2E 测试
├── data/                     # 本地数据库存储
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
└── playwright.config.ts
```

---

### 快速开始

#### 环境要求

- **Node.js**: 18+
- **npm**: 9+
- **操作系统**: macOS / Linux / Windows (WSL2)
- **前置依赖**: 已安装并配置好 [Oh My OpenCode](https://github.com/code-yeongyu/oh-my-opencode)

#### 安装

```bash
# 克隆项目
git clone https://github.com/tavisWei/OMO-Agent-Dashboard.git
cd OMO-Agent-Dashboard

# 安装依赖
npm install
```

#### 启动开发环境

```bash
# 同时启动后端 (3001) 和前端 (3002)
npm run dev
```

访问 **http://localhost:3002**

#### 生产构建

```bash
npm run build
npm start
```

---

### 运维方法

#### 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（前后端同时） |
| `npm run server` | 仅启动后端服务（热重载） |
| `npm run client` | 仅启动前端 Vite 服务 |
| `npm run build` | 生产构建 |
| `npm start` | 运行生产构建后的服务 |
| `npm run test` | 运行单元测试（Vitest 交互模式） |
| `npm run test:run` | 运行单元测试（CI 模式） |
| `npm run test:e2e` | 运行 E2E 测试（Playwright） |
| `npm run test:coverage` | 生成测试覆盖率报告 |

#### 更新升级

```bash
# 1. 拉取最新代码
git pull origin master

# 2. 更新依赖
npm install

# 3. 验证测试
npm run test:run

# 4. 重新启动
npm run dev
```

#### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `OPENCODE_DB_PATH` | OpenCode 数据库路径 | `~/.local/share/opencode/opencode.db` |
| `OH_MY_OPENAGENT_CONFIG_PATH` | openagent 配置路径 | `~/.config/opencode/oh-my-openagent.json` |
| `OPENCODE_CONFIG_PATH` | opencode 配置路径 | `~/.config/opencode/opencode.json` |
| `OH_MY_OPENCODE_CONFIG_PATH` | 旧版 OMO 配置路径 | `~/.config/opencode/oh-my-opencode.jsonc` |

---

### 项目特点与优势

1. **零外部依赖，本地优先**
   - 不需要 Docker、PostgreSQL、Redis 或任何云服务
   - 所有数据均来自本地文件系统和 SQLite

2. **实时监控，而非轮询假象**
   - WebSocket 双向推送，会话状态变化 < 500ms 感知
   - 直接读取 OpenCode 运行时数据库，数据真实可靠

3. **配置即代码，版本可回滚**
   - 所有模型配置修改直接落盘到本地 JSON
   - 支持配置版本快照，一键保存/回滚，不怕改坏

4. **任务编排引擎**
   - 不仅是看板，更内置 Sequential / Parallel / Pipeline 三种编排模式
   - 任务依赖自动校验，阻塞关系一目了然

5. **tmux 联动**
   - 自动检测本地 tmux 会话活跃度，补充运行状态维度

6. **严格类型与测试覆盖**
   - TypeScript Strict Mode
   - 97 例单元测试全部通过，核心模块均有测试覆盖

---

### 与同类项目的差异

| 特性 | OMO Agent Dashboard | 通用 AI Agent 管理面板 | OMO CLI 原生体验 |
|------|----------------------|------------------------|------------------|
| **安装复杂度** | ⭐ `npm install` 即可 | ⭐⭐⭐ 常需 Docker + 外部数据库 | ⭐ 已随 OMO 安装 |
| **本地优先** | ✅ 零云端依赖 | ❌ 多数需要云端账号或 API | ✅ 纯本地 |
| **实时监控** | ✅ WebSocket + DB 桥接 | ⚠️ 多为轮询或日志导入 | ❌ 仅终端输出 |
| **可视化配置** | ✅ 直接编辑 JSON 并回写 | ✅ 一般有 | ❌ 手动编辑文件 |
| **配置版本管理** | ✅ 快照 + 回滚 | ❌ 罕见 | ❌ 无 |
| **任务编排** | ✅ 内置编排引擎 | ⚠️ 部分有工作流 | ❌ 无 |
| **tmux 联动** | ✅ 本地会话状态映射 | ❌ 不适用 | ❌ 需手动查看 |
| **成本追踪** | ✅ Token / Cost 统计 | ⚠️ 部分有 | ❌ 无 |

**一句话总结**：如果你已经是 OMO 用户，Dashboard 让你在浏览器里获得"Mission Control"级别的掌控力；如果你不是 OMO 用户，这个项目对你没有直接价值——它是为 OMO 生态深度定制的。

---

### 测试状态

```bash
$ npm run test:run

 Test Files  8 passed (8)
      Tests  97 passed (97)
```

---

### 许可证

MIT License

---

<a name="english"></a>
## English

### Introduction

**OMO Agent Dashboard** is a real-time monitoring and management console designed for the [Oh My OpenCode (OMO)](https://github.com/code-yeongyu/oh-my-opencode) multi-agent system.

Unlike earlier versions that required maintaining a separate set of agent configurations, the current Dashboard **bridges directly to the OpenCode runtime database** and **local configuration files**, giving you a single web interface to track session status, model mappings, token consumption, and task orchestration progress in real time.

**Core value proposition**: A local-first, zero-external-dependency mission control for OMO users.

---

### Key Features

1. **Real-time Session Monitoring**
   - Directly reads the OpenCode local SQLite database (`~/.local/share/opencode/opencode.db`)
   - Live session statuses: `queued`, `thinking`, `running`, `completed`, `error`
   - WebSocket push updates with < 500ms latency
   - Multi-dimensional filtering by project directory and status
   - Hierarchical session tree (parent/child relationships)

2. **Visual Model & Config Management**
   - Edit agent-to-model mappings in `oh-my-openagent.json`
   - Edit providers, models, and API keys in `opencode.json`
   - Category preset switching
   - Config versioning: save snapshots, rollback, delete history

3. **Task Kanban & Orchestration**
   - Four-column Kanban: Backlog → In Progress → Done → Failed
   - Task dependency management with blocking/pre-requisite validation
   - Multi-agent orchestration: `sequential`, `parallel`, `pipeline`
   - Real-time orchestration state push and progress tracking

4. **tmux Session Integration**
   - Polls local tmux session activity
   - Syncs session liveness to the agent status board

5. **Activity Feed & System Events**
   - Real-time activity stream
   - Logs agent start/stop, config changes, and errors

6. **Theming & i18n**
   - Dark / light theme switching without flicker
   - i18next-based architecture (Chinese / English)

---

### Logical Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Browser                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ Agent Monitor│  │ Model Library│  │ Task Kanban  │  │ Config Versions │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘ │
│         └─────────────────┴─────────────────┴───────────────────┘           │
│                                    │                                        │
│                           HTTP / WebSocket                                  │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────┐
│                           Backend (Node.js + Express)                       │
│  ┌─────────────────────────────────┼─────────────────────────────────────┐  │
│  │        REST API Routes          │         WebSocket Service            │  │
│  │  ├─ /api/sessions               │   Push: agent_status                 │  │
│  │  ├─ /api/agents                 │   Push: session_update               │  │
│  │  ├─ /api/tasks                  │   Push: task_updated                 │  │
│  │  ├─ /api/config                 │   Push: orchestration_update         │  │
│  │  ├─ /api/models                 │   Heartbeat + broadcast              │  │
│  │  ├─ /api/tmux                   │                                      │  │
│  │  └─ /api/activity-logs          │                                      │  │
│  └─────────────────────────────────┴─────────────────────────────────────┘  │
│  ┌─────────────────────────────────┼─────────────────────────────────────┐  │
│  │         Adapter Layer           │         Config Manager               │  │
│  │  - opencode-reader.ts           │  - oh-my-openagent.json I/O          │  │
│  │  - adapter.ts (status inference)│  - opencode.json I/O                 │  │
│  │  - agentStatus.ts               │  - oh-my-opencode.jsonc I/O (legacy) │  │
│  │  - orchestrator.ts              │  - Version snapshots & rollback      │  │
│  └─────────────────────────────────┴─────────────────────────────────────┘  │
│         ┌──────────────────────────┴──────────────────────────┐             │
│  ┌──────┴──────┐                                    ┌─────────┴─────────┐   │
│  │ OpenCode DB │                                    │ Dashboard SQLite  │   │
│  │  (read-only)│                                    │ (tasks/projects/  │   │
│  │             │                                    │  logs)            │   │
│  └─────────────┘                                    └───────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | React 19 + Vite 8 | Modern DX, fast HMR |
| Styling | Tailwind CSS 4 | Atomic CSS, zero-cost theming |
| State | Zustand 5 | Lightweight, no boilerplate |
| Backend | Express 4 | Stable, rich ecosystem |
| Real-time | WebSocket (`ws`) | Same port as Express |
| Database | better-sqlite3 | Synchronous API, WAL mode, zero ops |
| Testing | Vitest + RTL + Playwright | 97 unit tests passing |
| Build | TypeScript 5.7 + tsx | Strict types, Node hot reload |

---

### Quick Start

```bash
git clone https://github.com/tavisWei/OMO-Agent-Dashboard.git
cd OMO-Agent-Dashboard
npm install
npm run dev
```

Open **http://localhost:3002**

---

### Operations

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev servers (both frontend and backend) |
| `npm run build` | Production build |
| `npm start` | Run production build |
| `npm run test:run` | Run unit tests (CI mode) |
| `npm run test:e2e` | Run E2E tests |

---

### Why This Project?

- **Zero external dependencies** — no Docker, no PostgreSQL, no cloud accounts
- **Real-time by design** — WebSocket push, not polling
- **Config as code with versioning** — every change writes to local JSON; snapshots protect you from mistakes
- **Built-in orchestration engine** — sequential, parallel, and pipeline task flows
- **Strictly typed & tested** — TypeScript strict mode, 97 passing tests

---

### License

MIT License
