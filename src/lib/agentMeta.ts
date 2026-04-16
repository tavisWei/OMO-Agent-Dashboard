export interface AgentMeta {
  name: string;
  description: string;
}

export interface CategoryMeta {
  name: string;
  description: string;
}

const AGENT_META_MAP: Record<string, AgentMeta> = {
  sisyphus: { name: 'Sisyphus', description: '主任务编排器，负责规划、委派专家并推动任务完成。' },
  'sisyphus-junior': { name: 'Sisyphus Junior', description: '按任务类别自动选择模型的执行器。' },
  prometheus: { name: 'Prometheus', description: '战略规划师，在编码前明确范围并制定详细计划。' },
  atlas: { name: 'Atlas', description: '待办执行器，将计划分发给各专业子代理执行。' },
  oracle: { name: 'Oracle', description: '只读架构顾问，负责设计决策、代码审查与复杂调试。' },
  librarian: { name: 'Librarian', description: '文档与开源代码搜索专家，查找库 API 与实现示例。' },
  explore: { name: 'Explore', description: '快速代码搜索代理，用于代码导航与模式发现。' },
  metis: { name: 'Metis', description: '预规划缺口分析器，在计划定稿前补全遗漏。' },
  momus: { name: 'Momus', description: '严苛计划审查员，验证计划的清晰度与可执行性。' },
  hephaestus: { name: 'Hephaestus', description: '自主深度工作者，端到端探索代码库并执行任务。' },
  'multimodal-looker': { name: 'Multimodal Looker', description: '视觉内容专家，分析图片、PDF 与图表提取信息。' },
  coder: { name: 'Coder', description: '基础编码代理，执行日常代码编写与修改。' },
  summarizer: { name: 'Summarizer', description: '内容总结代理，提炼对话与文档要点。' },
  task: { name: 'Task', description: '任务执行代理，处理具体原子级工作项。' },
  title: { name: 'Title', description: '标题生成代理，为会话或文档生成简洁标题。' },
};

const CATEGORY_META_MAP: Record<string, CategoryMeta> = {
  'visual-engineering': { name: 'Visual Engineering', description: '处理 UI、样式、布局、动画和前端视觉实现。' },
  artistry: { name: 'Artistry', description: '处理非常规、创造性较强的问题求解。' },
  ultrabrain: { name: 'Ultrabrain', description: '处理高复杂度逻辑、算法和架构推理任务。' },
  deep: { name: 'Deep', description: '执行需要深入研究与端到端处理的复杂任务。' },
  quick: { name: 'Quick', description: '处理单文件、小范围、低复杂度的快速修改。' },
  'unspecified-low': { name: 'Unspecified Low', description: '处理低工作量但未归入特定领域的任务。' },
  'unspecified-high': { name: 'Unspecified High', description: '处理高工作量但未归入特定领域的任务。' },
  writing: { name: 'Writing', description: '处理文档、技术写作和说明类任务。' },
};

function normalizeLookupKey(label: string): { key: string; normalizedKey: string; compactKey: string } {
  const key = label.trim().toLowerCase();
  const normalizedKey = key.replace(/[\s_]+/g, '-');
  const compactKey = normalizedKey.replace(/-/g, '');

  return { key, normalizedKey, compactKey };
}

function findMeta<T>(lookup: Record<string, T>, label: string | null | undefined): T | null {
  if (!label) return null;

  const { key, normalizedKey, compactKey } = normalizeLookupKey(label);

  if (lookup[key]) return lookup[key];
  if (lookup[normalizedKey]) return lookup[normalizedKey];

  return Object.entries(lookup).find(([candidateKey]) => {
    const normalizedCandidate = candidateKey.toLowerCase();
    const compactCandidate = normalizedCandidate.replace(/-/g, '');

    return (
      normalizedKey === normalizedCandidate ||
      compactKey === compactCandidate ||
      normalizedKey.includes(normalizedCandidate) ||
      normalizedCandidate.includes(normalizedKey) ||
      compactKey.includes(compactCandidate) ||
      compactCandidate.includes(compactKey)
    );
  })?.[1] ?? null;
}

export function getAgentMeta(label: string | null | undefined): AgentMeta | null {
  return findMeta(AGENT_META_MAP, label);
}

export function getCategoryMeta(label: string | null | undefined): CategoryMeta | null {
  return findMeta(CATEGORY_META_MAP, label);
}
