# OMO Agent Dashboard

A local-first web application for managing Oh My OpenCode (OMO) multi-agent systems. Visualize agent status, manage configurations, track costs, and coordinate tasks all from a single dashboard.

**Version**: 0.1.0

---

## Features

- **Agent Status Dashboard** — Real-time grid view of all OMO agents with live status updates via WebSocket
- **Project Organization** — Group agents by project for clear separation of concerns
- **Visual Agent Configuration** — Edit model, temperature, top_p, and maxTokens without touching JSON files
- **Task Kanban Board** — Drag-and-drop task management with Backlog / In Progress / Done / Failed columns
- **Cost Tracking** — Token usage and estimated cost per agent and project with charts
- **Activity Logs** — History of agent actions (started, stopped, errors, config changes)
- **Dark/Light Theme** — Theme toggle with persistence, no flash on load
- **Local SQLite Storage** — All data stays on your machine, no cloud dependency

---

## Prerequisites

- [Oh My OpenCode (OMO)](https://github.com/code-yeongyu/oh-my-opencode) installed and configured
- Node.js 18+ (tested with Node 22)

---

## Installation

```bash
# Clone the repository
git clone https://github.com/your-username/OMO-Agent-Dashboard.git
cd OMO-Agent-Dashboard

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

For production:

```bash
npm run build
npm start
```

---

## Pages & Routes

| Route | Description |
|---|---|
| `/` | Main dashboard — agent grid with project sidebar |
| `/project/:id` | Project detail — agent list + Kanban task board |
| `/agent/:id` | Agent detail — config panel + activity log |
| `/analytics` | Cost overview — token usage and cost charts |
| `/settings` | Theme, API key, OMO config path |

---

## API Reference

### Agents

```
GET    /api/agents           — List all agents
GET    /api/agents/:id        — Get single agent
PUT    /api/agents/:id        — Update agent config
DELETE /api/agents/:id        — Delete agent
```

**Update body example:**
```json
{
  "model": "gpt-4o",
  "temperature": 0.8,
  "top_p": 0.95,
  "max_tokens": 4096
}
```

### Projects

```
GET    /api/projects          — List all projects
POST   /api/projects          — Create project
GET    /api/projects/:id      — Get project with agents
PUT    /api/projects/:id       — Update project
DELETE /api/projects/:id       — Delete project
```

### Tasks

```
GET    /api/tasks              — List tasks (filter by project_id / agent_id / status)
POST   /api/tasks              — Create task
PUT    /api/tasks/:id          — Update task (status, position, title)
DELETE /api/tasks/:id           — Delete task
```

**Task statuses**: `backlog` | `in_progress` | `done` | `failed`

### Cost

```
GET    /api/cost              — Get cost summary
                                ?range=today|week|month|custom
                                &startDate=ISO8601
                                &endDate=ISO8601
```

**Response:**
```json
{
  "summary": {
    "total_input_tokens": 123456,
    "total_output_tokens": 78901,
    "total_tokens": 202357,
    "total_cost": 4.23,
    "total_api_calls": 50
  },
  "by_agent": [
    {
      "agent_id": 1,
      "agent_name": "Sisyphus",
      "model": "gpt-4o",
      "total_tokens": 100000,
      "total_cost": 2.00
    }
  ],
  "date_range": { "startDate": "...", "endDate": "..." }
}
```

### Activity Logs

```
GET    /api/activity-logs     — List activity logs
                                ?agent_id=1
                                &limit=20
                                &offset=0
```

---

## Architecture

```
Browser (React + Vite)
       │ WebSocket / REST
       ▼
Backend (Node.js + Express)
       │
       ├── SQLite Database (sql.js)
       ├── OMO Config Reader/Watcher (chokidar)
       └── WebSocket Server (ws)
```

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7, Tailwind CSS 4 |
| State | Zustand 5 |
| Backend | Express 5, ws, chokidar |
| Database | sql.js (SQLite in-browser/WASM) |
| Charts | Recharts |
| DnD | @dnd-kit |

---

## Configuration

By default, the dashboard reads your OMO config from:

```
~/.config/opencode/oh-my-opencode.jsonc
```

You can change this path in **Settings** (UI) or via the `OMO_CONFIG_PATH` environment variable:

```bash
OMO_CONFIG_PATH=/custom/path/config.jsonc npm run dev
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server on port 3001 |
| `npm run build` | Type-check and build for production |
| `npm start` | Run production server |
| `npm run preview` | Preview production build locally |

---

## Contributing

Contributions are welcome. Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## License

MIT
