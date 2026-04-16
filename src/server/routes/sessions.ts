import { Router } from 'express';
import {
  getDashboardSnapshot,
  getOpenCodeSessionById,
  getOpenCodeSessionMessages,
  getOpenCodeSessionTodos,
  getOpenCodeSessionTree,
} from '../opencode-reader.js';

const router = Router();

router.get('/', (req, res) => {
  const activeOnly = req.query.active === 'true';
  const directory = typeof req.query.project === 'string' ? req.query.project : undefined;
  const days = typeof req.query.days === 'string' ? Number.parseInt(req.query.days, 10) : undefined;
  const snapshot = getDashboardSnapshot({
    activeOnly,
    directory,
    days: Number.isFinite(days) ? days : undefined,
    limit: 200,
  });

  if (snapshot.error) {
    return res.json({ sessions: [], error: snapshot.error.message });
  }

  return res.json(snapshot.sessions);
});

router.get('/overview', (_req, res) => {
  const snapshot = getDashboardSnapshot({ limit: 200 });
  if (snapshot.error) {
    return res.json({ overview: null, projects: [], error: snapshot.error.message });
  }

  return res.json({
    overview: snapshot.overview,
    projects: snapshot.projects,
    tree: snapshot.tree,
  });
});

router.get('/:id', (req, res) => {
  const session = getOpenCodeSessionById(req.params.id);
  if (session.error) {
    return res.json({ session: null, error: session.error.message });
  }

  if (!session.data) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const todos = getOpenCodeSessionTodos(req.params.id);
  const messages = getOpenCodeSessionMessages(req.params.id, 20);

  return res.json({
    session: session.data,
    todos: todos.data,
    messages: messages.data,
  });
});

router.get('/:id/tree', (req, res) => {
  const tree = getOpenCodeSessionTree(req.params.id);
  if (tree.error) {
    return res.json({ tree: [], error: tree.error.message });
  }

  return res.json(tree.data);
});

router.get('/:id/messages', (req, res) => {
  const limit = typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : 20;
  const messages = getOpenCodeSessionMessages(req.params.id, Number.isFinite(limit) ? limit : 20);
  if (messages.error) {
    return res.json({ messages: [], error: messages.error.message });
  }

  return res.json(messages.data);
});

export default router;
