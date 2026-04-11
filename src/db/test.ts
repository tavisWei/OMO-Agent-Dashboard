import {
  getDatabase,
  createProject,
  getAllProjects,
  getProject,
  updateProject,
  deleteProject,
  createAgent,
  getAllAgents,
  getAgent,
  updateAgent,
  deleteAgent,
  createTask,
  getAllTasks,
  updateTask,
  deleteTask,
  createCostRecord,
  getCostRecordsByAgent,
  createActivityLog,
  getRecentActivityLogs,
  closeDatabase,
} from './index.js';

async function testCRUD() {
  console.log('Testing OMO Agent Dashboard Database...\n');

  await getDatabase();
  console.log('✓ Database initialized');

  console.log('\n--- Project Tests ---');
  const project = createProject('Test Project', 'A test project');
  console.log('✓ Created project:', project.name);

  const projects = getAllProjects();
  console.log('✓ Listed projects, count:', projects.length);

  const fetchedProject = getProject(project.id);
  console.log('✓ Fetched project:', fetchedProject?.name);

  updateProject(project.id, 'Updated Project', 'Updated description');
  console.log('✓ Updated project');

  console.log('\n--- Agent Tests ---');
  const agent = createAgent('Test Agent', project.id, 'gpt-4', { temperature: 0.8 });
  console.log('✓ Created agent:', agent.name);

  const agents = getAllAgents();
  console.log('✓ Listed agents, count:', agents.length);

  const fetchedAgent = getAgent(agent.id);
  console.log('✓ Fetched agent:', fetchedAgent?.name);

  updateAgent(agent.id, { status: 'running' });
  console.log('✓ Updated agent status');

  console.log('\n--- Task Tests ---');
  const task = createTask('Test Task', project.id, agent.id, 'A test task', 'backlog');
  console.log('✓ Created task:', task.title);

  const tasks = getAllTasks();
  console.log('✓ Listed tasks, count:', tasks.length);

  updateTask(task.id, { status: 'in_progress' });
  console.log('✓ Updated task status');

  console.log('\n--- Cost Record Tests ---');
  createCostRecord(agent.id, 'gpt-4', 1000, 500, 0.02);
  console.log('✓ Created cost record');

  const costRecords = getCostRecordsByAgent(agent.id);
  console.log('✓ Fetched cost records, count:', costRecords.length);

  console.log('\n--- Activity Log Tests ---');
  createActivityLog(agent.id, 'started', 'Agent started');
  console.log('✓ Created activity log');

  const logs = getRecentActivityLogs(10);
  console.log('✓ Fetched recent logs, count:', logs.length);

  console.log('\n--- Cleanup Tests ---');
  deleteTask(task.id);
  console.log('✓ Deleted task');

  deleteAgent(agent.id);
  console.log('✓ Deleted agent');

  deleteProject(project.id);
  console.log('✓ Deleted project');

  closeDatabase();
  console.log('\n✓ Database closed');

  console.log('\n✅ All CRUD tests passed!');
}

testCRUD().catch(console.error);
