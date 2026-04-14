import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Agent, CreateTaskInput, Task, TaskPriority } from '../types';

interface NewTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (task: CreateTaskInput) => void;
  agents: Agent[];
  tasks: Task[];
}

export function NewTaskDialog({ isOpen, onClose, onCreate, agents, tasks }: NewTaskDialogProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assignedAgents, setAssignedAgents] = useState<number[]>([]);
  const [dependsOn, setDependsOn] = useState<number[]>([]);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setAssignedAgents([]);
      setDependsOn([]);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate({
      title: title.trim(),
      description: description.trim(),
      priority,
      assigned_agents: assignedAgents,
      depends_on: dependsOn,
      status: 'backlog'
    });
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  const toggleAgent = (agentId: number) => {
    setAssignedAgents(prev => 
      prev.includes(agentId) 
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const toggleDependency = (taskId: number) => {
    setDependsOn(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onKeyDown={handleKeyDown}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-slate-900 border border-slate-700/50 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
          <h2 className="text-lg font-semibold text-slate-100">{t('tasks.new')}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          <form id="new-task-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="task-title" className="block text-sm font-medium text-slate-400 mb-1.5">
                {t('tasks.taskTitle')} <span className="text-red-400">*</span>
              </label>
              <input
                ref={titleInputRef}
                id="task-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('tasks.taskTitlePlaceholder')}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-colors"
                required
              />
            </div>

            <div>
              <label htmlFor="task-description" className="block text-sm font-medium text-slate-400 mb-1.5">
                {t('tasks.description')}
              </label>
              <textarea
                id="task-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('tasks.descriptionPlaceholder')}
                rows={3}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-colors resize-none"
              />
            </div>

            <div>
              <label htmlFor="task-priority" className="block text-sm font-medium text-slate-400 mb-1.5">
                {t('tasks.priority')}
              </label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-colors"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">
                {t('tasks.assignAgents')}
              </label>
              <div className="flex flex-wrap gap-2">
                {agents.map((agent) => (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => toggleAgent(agent.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors flex items-center gap-2
                      ${assignedAgents.includes(agent.id)
                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                        : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800 hover:border-slate-600'
                      }
                    `}
                  >
                    <span>🤖</span>
                    {agent.name}
                  </button>
                ))}
                {agents.length === 0 && (
                  <span className="text-sm text-slate-500">{t('tasks.noAgentsAvailable')}</span>
                )}
              </div>
            </div>

            {tasks.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">
                  {t('tasks.dependsOn')}
                </label>
                <div className="max-h-32 overflow-y-auto space-y-1 bg-slate-800/30 p-2 rounded-lg border border-slate-700/30">
                  {tasks.map((task) => (
                    <label key={task.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-800/50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dependsOn.includes(task.id)}
                        onChange={() => toggleDependency(task.id)}
                        className="rounded border-slate-600 bg-slate-700 text-purple-500 focus:ring-purple-500/50 focus:ring-offset-slate-900"
                      />
                      <span className="text-sm text-slate-300 truncate">{task.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-800 shrink-0 bg-slate-900">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            {t('tasks.cancel')}
          </button>
          <button
            type="submit"
            form="new-task-form"
            disabled={!title.trim()}
            className="px-4 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors"
          >
            {t('tasks.create')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default NewTaskDialog;
