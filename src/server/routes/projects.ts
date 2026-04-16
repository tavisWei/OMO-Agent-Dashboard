import { Router } from 'express';
import { getDashboardSnapshot } from '../opencode-reader.js';

const router = Router();

router.get('/', (_req, res) => {
  try {
    const snapshot = getDashboardSnapshot({ limit: 200 });
    if (snapshot.error) {
      return res.json({ projects: [], error: snapshot.error.message });
    }
    res.json(snapshot.projects);
  } catch (error) {
    console.error('Error getting projects:', error);
    res.status(500).json({ error: 'Failed to get projects' });
  }
});

router.post('/', (_req, res) => res.status(405).json({ error: 'Projects are derived from OpenCode sessions and cannot be created here' }));

router.get('/:id', (req, res) => {
  try {
    const snapshot = getDashboardSnapshot({ limit: 200 });
    if (snapshot.error) {
      return res.json({ project: null, error: snapshot.error.message });
    }
    const project = snapshot.projects.find((entry) => entry.id === req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    console.error('Error getting project:', error);
    res.status(500).json({ error: 'Failed to get project' });
  }
});

router.put('/:id', (_req, res) => res.status(405).json({ error: 'Projects are read-only derived data' }));

router.delete('/:id', (_req, res) => res.status(405).json({ error: 'Projects are read-only derived data' }));

export default router;
