# OMO Agent Dashboard

可视化智能体管理看板 | 简洁 | 高效

---

## 产品介绍

**OMO Agent Dashboard** 是一款专为 [Oh My OpenCode (OMO)](https://github.com/code-yeongyu/oh-my-opencode) 多智能体系统打造的可视化管理平台。

通过直观的 Web 界面，您可以实时监控智能体状态、灵活配置模型参数、按项目分组管理、智能追踪成本消耗。

**特点**：本地优先（SQLite）、零外部依赖、安装即用。

---

## 核心功能

### 1. 智能体状态看板

- 网格视图展示所有智能体
- 实时状态：运行中、空闲、错误
- WebSocket 实时推送更新
- 快捷操作：编辑配置、查看详情

### 2. 项目分组管理

- 按项目划分智能体，互不干扰
- 支持创建、编辑、删除项目
- 项目级别的任务管理
- 智能体数量统计

### 3. 可视化配置

| 参数 | 说明 | 范围 |
|------|------|------|
| 模型 | 选择 AI 模型 | 下拉选择 + 搜索过滤 |
| Temperature | 创造性控制 | 0.0 ~ 2.0 |
| Top P | 采样阈值 | 0.0 ~ 1.0 |
| Max Tokens | 最大输出 | 1 ~ 100000 |

### 4. 任务看板（Kanban）

- 四列布局：待办 → 进行中 → 已完成 → 失败
- 拖拽操作，流畅动画
- 支持任务创建、编辑、删除
- 按项目筛选任务

### 5. 成本追踪

- Token 使用量实时统计
- 按智能体/项目分类
- 图表可视化（柱状图、饼图）
- 支持 CSV 导出
- 主流模型定价内置

### 6. 智能体对话

- 直接与指定智能体对话
- Markdown 渲染 + 代码高亮
- SSE 流式响应
- 聊天历史记录

### 7. 活动日志

- 记录所有操作历史
- 类型筛选：启动、停止、错误、配置变更
- 实时更新
- 分页加载

### 8. 其他特性

- 🌙 暗色/亮色主题
- 🔄 配置文件监听（自动同步）
- 📦 本地 SQLite 存储
- 🔧 丰富的运维脚本

---

## 界面预览

```
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
# 启动开发服务器
./scripts/start.sh

# 或手动启动
npm run dev
```

访问 **http://localhost:3002**

### 运维命令

| 命令 | 说明 |
|------|------|
| `./scripts/install.sh` | 一键安装 |
| `./scripts/start.sh` | 启动服务 |
| `./scripts/stop.sh` | 停止服务 |
| `./scripts/restart.sh` | 重启服务 |
| `./scripts/status.sh` | 查看状态 |
| `./scripts/logs.sh` | 查看日志 |
| `./scripts/manage.sh` | 交互式菜单 |
| `./scripts/health.sh` | 健康检查 |

---

## 技术架构

```
┌──────────────────────────────────────────────────────────────┐
│                        前端 (Browser)                         │
│   React 19 + Vite 7 + Tailwind CSS 4 + Zustand             │
└────────────────────────────┬─────────────────────────────────┘
                             │ HTTP / WebSocket
┌────────────────────────────┴─────────────────────────────────┐
│                        后端 (Node.js)                         │
│   Express 5 + ws (WebSocket) + chokidar (文件监听)          │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────┴─────────────────────────────────┐
│                        数据层                                 │
│   sql.js (SQLite WASM) + JSONC 配置文件                      │
└──────────────────────────────────────────────────────────────┘
```

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 19, Vite 7 |
| UI 样式 | Tailwind CSS 4 |
| 状态管理 | Zustand 5 |
| 后端框架 | Express 5 |
| 实时通信 | WebSocket (ws) |
| 数据库 | sql.js (SQLite WASM) |
| 拖拽 | @dnd-kit |
| 图表 | Recharts |
| Markdown | react-markdown |
| 代码高亮 | react-syntax-highlighter |

---

## 项目结构

```
OMO-Agent-Dashboard/
├── src/
│   ├── components/          # React 组件
│   │   ├── AgentCard.tsx       # 智能体卡片
│   │   ├── AgentGrid.tsx       # 智能体网格
│   │   ├── AgentConfigPanel.tsx # 配置面板
│   │   ├── KanbanBoard.tsx     # 任务看板
│   │   ├── CostOverview.tsx     # 成本统计
│   │   ├── AgentChat.tsx       # 智能体对话
│   │   ├── ActivityFeed.tsx    # 活动日志
│   │   └── SettingsPage.tsx     # 设置页面
│   ├── server/              # Express 后端
│   │   ├── index.ts             # 服务入口
│   │   ├── websocket.ts          # WebSocket 服务
│   │   └── routes/              # API 路由
│   │       ├── agents.ts
│   │       ├── projects.ts
│   │       ├── tasks.ts
│   │       ├── cost.ts
│   │       ├── chat.ts
│   │       └── activity-logs.ts
│   ├── config/              # 配置模块
│   │   ├── omo-reader.ts        # OMO 配置读取
│   │   ├── omo-writer.ts        # OMO 配置写入
│   │   └── file-watcher.ts      # 文件监听
│   ├── db/                  # 数据库层
│   │   ├── schema.ts            # 表结构
│   │   ├── migrations.ts        # 迁移
│   │   └── index.ts             # 数据库操作
│   └── stores/               # Zustand 状态
├── scripts/                 # 运维脚本
│   ├── install.sh              # 安装脚本
│   ├── start.sh               # 启动
│   ├── stop.sh                # 停止
│   ├── restart.sh              # 重启
│   ├── status.sh               # 状态
│   ├── logs.sh                 # 日志
│   ├── manage.sh               # 交互菜单
│   └── health.sh               # 健康检查
├── e2e/                    # E2E 测试
└── screenshots/            # 截图
```

---

## API 参考

### 智能体

```
GET    /api/agents              # 获取所有智能体
GET    /api/agents/:id          # 获取单个智能体
PUT    /api/agents/:id          # 更新智能体配置
DELETE /api/agents/:id          # 删除智能体
```

### 项目

```
GET    /api/projects            # 获取所有项目
POST   /api/projects            # 创建项目
GET    /api/projects/:id        # 获取项目详情
PUT    /api/projects/:id        # 更新项目
DELETE /api/projects/:id        # 删除项目
```

### 任务

```
GET    /api/tasks               # 获取任务列表
POST   /api/tasks               # 创建任务
PUT    /api/tasks/:id           # 更新任务
DELETE /api/tasks/:id           # 删除任务
```

### 成本

```
GET    /api/cost?range=today    # 获取成本统计
```

### 活动日志

```
GET    /api/activity-logs       # 获取活动日志
```

---

## 配置说明

默认读取 OMO 配置文件：

```
~/.config/opencode/oh-my-opencode.jsonc
```

可在设置页面修改路径，或通过环境变量：

```bash
OMO_CONFIG_PATH=/自定义/路径/config.jsonc npm run dev
```

---

## 测试

```bash
# 单元测试
npm run test:run

# E2E 测试
npm run test:e2e

# 测试覆盖率
npm run test:coverage
```

---

## 与竞品对比

| 功能 | OMO Dashboard | Mission Control | Agent Config |
|------|:-------------:|:---------------:|:------------:|
| 安装 | `npm install` | Docker + Postgres | npm |
| 数据库 | SQLite ✅ | PostgreSQL ❌ | JSON ❌ |
| 成本追踪 | ✅ | ❌ | ❌ |
| 任务看板 | ✅ | ✅ | ❌ |
| 智能体对话 | ✅ | ❌ | ❌ |
| WebSocket 实时 | ✅ | ✅ | ❌ |
| 本地优先 | ✅ | ❌ | ✅ |

---

## 系统要求

- **Node.js**: 18+
- **npm**: 9+
- **操作系统**: macOS / Linux / Windows (WSL2)
- **可选**: OMO 已配置

---

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 `git checkout -b feature/xxx`
3. 提交改动 `git commit -m 'feat: xxx'`
4. 推送分支 `git push origin feature/xxx`
5. 创建 Pull Request

---

## 更新日志

### v0.1.0 (2026-04-11)

- 🎉 初始版本发布
- 智能体状态看板
- 项目分组管理
- 可视化配置
- 任务看板
- 成本统计
- 智能体对话
- 活动日志
- 暗色/亮色主题
- WebSocket 实时更新
- 58 个单元测试
- 9 个 E2E 测试

---

## 许可证

MIT License
