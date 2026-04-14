# OMO Agent Dashboard

可视化智能体管理看板 | 简洁 | 高效

---

## 产品介绍

**OMO Agent Dashboard** 是一款专为 [Oh My OpenCode (OMO)](https://github.com/code-yeongyu/oh-my-opencode) 多智能体系统打造的可视化管理平台。

通过直观的 Web 界面，您可以实时监控智能体状态、灵活配置模型参数、按项目分组管理、智能追踪成本消耗。

**特点**：本地优先（SQLite）、零外部依赖、安装即用。

> **注意**：原有的 Chat / AgentChat 功能已移除，专注于智能体管理与任务调度。

---

## 核心功能

### 1. 智能体状态看板
- 网格视图展示所有智能体。
- 实时状态：运行中、空闲、错误。
- WebSocket 实时推送更新。
- 快捷操作：编辑配置、查看详情。

### 2. 项目分组管理
- 按项目划分智能体，互不干扰。
- 支持创建、编辑、删除项目。
- 项目级别的任务管理。
- 智能体数量统计。

### 3. 可视化配置
- 模型选择：支持 AI 模型下拉选择与搜索过滤。
- 参数控制：Temperature (0.0 ~ 2.0), Top P (0.0 ~ 1.0), Max Tokens (1 ~ 100000)。

### 4. 任务看板 (Kanban)
- 四列布局：待办 → 进行中 → 已完成 → 失败。
- 拖拽操作，流畅动画。
- 支持任务创建、编辑、删除。
- 按项目筛选任务。

### 5. 成本追踪
- Token 使用量实时统计。
- 按智能体/项目分类。
- 图表可视化（柱状图、饼图）。
- 主流模型定价内置。

### 6. 活动日志
- 记录所有操作历史。
- 类型筛选：启动、停止、错误、配置变更。
- 实时更新，分页加载。

### 7. 其他特性
- 🌙 暗色/亮色主题。
- 🔄 配置文件监听（自动同步 OMO 配置）。
- 📦 本地 SQLite 存储。
- 🔧 丰富的运维脚本。

---

## 界面预览

```text
┌─────────────────────────────────────────────────────────────────┐
│  🌟 OMO Agent Dashboard          [项目 ▼]  [☀️]  [⚙️]         │
├────────────┬────────────────────────────────────────────────────┤
│            │                                                     │
│  📁 项目    │   ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│  ├─ All    │   │Sisyphus │ │ Oracle  │ │ Explore │            │
│  ├─ 项目 A  │   │  ● 运行  │ │  ○ 空闲  │ │  ● 运行  │            │
│  └─ 项目 B  │   │ GPT-4   │ │Claude-5 │ │ GPT-4o  │            │
│            │   │ 1.2M tok │ │ 200K tok│ │ 800K tok│            │
│  ────────  │   └─────────┘ └─────────┘ └─────────┘            │
│            │                                                     │
│  💰 成本    │   ┌─────────┐ ┌─────────┐                        │
│  📊 统计    │   │ Metis   │ │ Atlas   │                        │
│            │   │  ○ 空闲  │ │  ● 运行  │                        │
│            │   │ Opus    │ │ GPT-4   │                        │
│            │   │ 50K tok │ │ 2.1M tok│                        │
│            │   └─────────┘ └─────────┘                        │
│            │                                                     │
└────────────┴────────────────────────────────────────────────────┘
```

---

## 快速开始

### 安装

```bash
# 克隆项目
git clone https://github.com/tavisWei/OMO-Agent-Dashboard.git
cd OMO-Agent-Dashboard

# 一键安装（自动检测系统、安装依赖、初始化目录）
./scripts/install.sh

# 或者手动安装
npm install
```

### 启动

```bash
# 启动开发服务器 (同时启动后端 3001 和前端 3002)
npm run dev
```

访问 **http://localhost:3002**

### 升级步骤

如果您是从旧版本升级，请执行以下操作：

1. 拉取最新代码：`git pull origin main`
2. 更新依赖：`npm install`
3. 重启服务：`npm run dev`

---

## 技术架构

```text
┌──────────────────────────────────────────────────────────────┐
│                        前端 (Browser)                         │
│   React 19 + Vite 8 + Tailwind CSS 4 + Zustand 5           │
│   端口: 3002                                                 │
└────────────────────────────┬─────────────────────────────────┘
                             │ HTTP / WebSocket
┌────────────────────────────┴─────────────────────────────────┐
│                        后端 (Node.js)                         │
│   Express 4 + ws (WebSocket) + chokidar (文件监听)          │
│   端口: 3001                                                 │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────┴─────────────────────────────────┐
│                        数据层                                 │
│   sql.js (SQLite WASM) + JSONC 配置文件                      │
│   存储路径: ./data/dashboard.db                              │
└──────────────────────────────────────────────────────────────┘
```

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 19, Vite 8 |
| UI 样式 | Tailwind CSS 4 |
| 状态管理 | Zustand 5 |
| 后端框架 | Express 4 |
| 实时通信 | WebSocket (ws) |
| 数据库 | sql.js (SQLite WASM) |
| 拖拽 | @dnd-kit |
| 图表 | Recharts |

---

## 项目结构

```text
OMO-Agent-Dashboard/
├── src/
│   ├── components/          # React 组件
│   │   ├── AgentCard.tsx       # 智能体卡片
│   │   ├── AgentGrid.tsx       # 智能体网格
│   │   ├── AgentConfigPanel.tsx # 配置面板
│   │   ├── KanbanBoard.tsx     # 任务看板
│   │   ├── CostOverview.tsx     # 成本统计
│   │   ├── ActivityFeed.tsx    # 活动日志
│   │   ├── ModelLibrary.tsx    # 模型库
│   │   └── SettingsPage.tsx     # 设置页面
│   ├── server/              # Express 后端
│   │   ├── index.ts             # 服务入口 (Port 3001)
│   │   ├── websocket.ts          # WebSocket 服务
│   │   └── routes/              # API 路由
│   ├── config/              # 配置模块 (OMO 同步)
│   ├── db/                  # 数据库层 (SQLite)
│   └── stores/               # Zustand 状态
├── scripts/                 # 运维脚本
├── e2e/                    # E2E 测试 (Playwright)
└── data/                   # 本地数据库存储
```

---

## 运维指南

### 常用脚本

| 命令 | 说明 |
|------|------|
| `./scripts/install.sh` | 一键安装环境 |
| `./scripts/start.sh` | 启动后台服务 |
| `./scripts/stop.sh` | 停止所有服务 |
| `./scripts/status.sh` | 查看服务运行状态 |
| `./scripts/logs.sh` | 查看运行日志 |
| `./scripts/health.sh` | 系统健康检查 |

### 配置说明

默认读取 OMO 配置文件：`~/.config/opencode/oh-my-opencode.jsonc`

可在设置页面修改路径，或通过环境变量指定：
```bash
OMO_CONFIG_PATH=/path/to/config.jsonc npm run dev
```

---

## 测试

```bash
# 单元测试
npm run test:run

# E2E 测试 (Playwright)
npm run test:e2e

# 测试覆盖率
npm run test:coverage
```

---

## 系统要求

- **Node.js**: 18+
- **npm**: 9+
- **操作系统**: macOS / Linux / Windows (WSL2)

---

## 许可证

MIT License
