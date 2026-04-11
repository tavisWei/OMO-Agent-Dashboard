import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface Project {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  agent_count?: number;
}

const API_BASE = 'http://localhost:3001/api';

export function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const selectedId = location.pathname === '/'
    ? 'all'
    : location.pathname.startsWith('/project/')
      ? location.pathname.split('/project/')[1]
      : null;

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/projects`);
      if (!res.ok) throw new Error('Failed to fetch projects');
      const data = await res.json();
      setProjects(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const res = await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete project');
      setProjects(projects.filter(p => p.id !== id));
      if (selectedId === String(id)) {
        navigate('/');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete project');
    }
  };

  if (loading) {
    return (
      <div className="w-60 bg-zinc-900 text-zinc-400 p-4 flex items-center justify-center">
        <span className="animate-pulse">Loading...</span>
      </div>
    );
  }

  return (
    <div className="w-60 bg-zinc-900 text-zinc-100 flex flex-col h-full">
      <div className="p-4 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Projects</h2>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <button
          onClick={() => navigate('/')}
          className={`w-full text-left px-3 py-2 rounded-lg mb-1 flex items-center justify-between transition-colors ${
            selectedId === 'all'
              ? 'bg-indigo-600 text-white'
              : 'text-zinc-300 hover:bg-zinc-800'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            All Projects
          </span>
          <span className="text-xs bg-zinc-700 px-2 py-0.5 rounded-full">
            {projects.length}
          </span>
        </button>

        <div className="h-px bg-zinc-800 my-3" />
        {projects.map(project => (
          <button
            key={project.id}
            onClick={() => navigate(`/project/${project.id}`)}
            className={`w-full text-left px-3 py-2 rounded-lg mb-1 flex items-center justify-between group transition-colors ${
              selectedId === String(project.id)
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <span className="flex items-center gap-2 truncate">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span className="truncate">{project.name}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-xs bg-zinc-700 px-2 py-0.5 rounded-full">
                {project.agent_count ?? 0}
              </span>
              <button
                onClick={(e) => handleDeleteProject(e, project.id)}
                className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-opacity p-1"
                title="Delete project"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </span>
          </button>
        ))}

        {projects.length === 0 && (
          <p className="text-zinc-500 text-sm px-3 py-4 text-center">No projects yet</p>
        )}
      </nav>

      {error && (
        <div className="p-3 mx-3 mb-2 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}