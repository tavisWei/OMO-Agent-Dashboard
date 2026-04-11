# OMO Agent Dashboard

可视化智能体管理看板 | 零配置 | 本地优先

---

## 🎯 一句话介绍

OMO Agent Dashboard 是一款**本地优先**的 Web 可视化工具，用于管理和监控 Oh My OpenCode (OMO) 多智能体系统的工作状态，让开发者能够像管理团队一样管理 AI 智能体。

---

## 💡 解决什么问题？

- ❌ **配置繁琐** - 手动编辑 JSON 配置文件，容易出错
- ❌ **状态黑盒** - 不知道智能体在做什么、消耗多少 Token
- ❌ **管理分散** - 项目多了难以追踪
- ❌ **缺少可视化** - 需要在终端里猜状态

---

## ✨ 核心特性

| 特性 | 说明 |
|------|------|
| 📊 **智能体看板** | 网格视图实时显示所有智能体状态 |
| ⚙️ **可视化配置** | 拖拽滑块设置 model/temperature/top_p |
| 📁 **项目分组** | 按项目组织智能体，互不干扰 |
| 📋 **任务看板** | Kanban 拖拽管理智能体任务 |
| 💰 **成本追踪** | Token 使用量 + 预估成本图表 |
| 💬 **智能体对话** | 直接和智能体聊天 (SSE 流式响应) |
| 📝 **活动日志** | 记录所有操作历史 |
| 🌙 **暗色主题** | 保护眼睛的主题切换 |
| 🔄 **配置监听** | 自动同步 OMO 配置文件变化 |
| 📦 **本地存储** | SQLite 数据库，数据不出本地 |

---

## ⚡ 快速开始

```bash
# 一键安装
./scripts/install.sh

# 启动服务
./scripts/start.sh

# 打开浏览器
# 访问 http://localhost:3001
```

---

## 🏆 核心优势

| 对比项 | OMO Dashboard | Mission Control | OmO Agent Config |
|--------|:-------------:|:--------------:|:----------------:|
| **安装复杂度** | ⭐ 一条命令 | ⭐⭐⭐ Docker | ⭐ npm |
| **数据库** | SQLite ✅ | PostgreSQL ❌ | JSON ❌ |
| **成本追踪** | ✅ | ❌ | ❌ |
| **任务看板** | ✅ | ✅ | ❌ |
| **智能体对话** | ✅ | ❌ | ❌ |
| **本地优先** | ✅ | ❌ | ✅ |
| **实时更新** | WebSocket ✅ | WebSocket ✅ | ❌ |

---

## 👥 目标用户

- 🔧 **OpenCode/OMO 用户** - 需要管理多个智能体
- 📊 **AI 开发者** - 关注 Token 成本和效率
- 🚀 **效率追求者** - 想要可视化替代命令行

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + Vite 7 + Tailwind CSS 4 |
| 状态 | Zustand 5 |
| 后端 | Express 5 + WebSocket |
| 数据库 | sql.js (SQLite WASM) |
| 拖拽 | @dnd-kit |
| 图表 | Recharts |

---

## 📦 安装要求

- Node.js 18+
- npm 9+
- (可选) OMO 已配置

---

## 🚀 运维脚本

| 脚本 | 说明 |
|------|------|
| `./scripts/install.sh` | 一键安装 (依赖 + 目录 + 配置) |
| `./scripts/start.sh` | 启动服务 |
| `./scripts/stop.sh` | 停止服务 |
| `./scripts/restart.sh` | 重启服务 |
| `./scripts/status.sh` | 查看状态 |
| `./scripts/logs.sh` | 查看日志 |
| `./scripts/manage.sh` | 交互式菜单 |
| `./scripts/health.sh` | 健康检查 (Docker/K8s) |

---

## 📄 许可证

MIT
