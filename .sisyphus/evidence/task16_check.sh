npm run server > .sisyphus/evidence/task-16-server.log 2>&1 &
SRV=$!
sleep 8
node --input-type=module <<'NODE' > .sisyphus/evidence/task-16-events.txt
import WebSocket from 'ws';
const events = [];
const ws = new WebSocket('ws://localhost:3001');
ws.on('message', (data) => {
  try {
    const msg = JSON.parse(data.toString());
    if (['task_created','task_updated','task_deleted'].includes(msg.type)) events.push(msg.type);
  } catch {}
});
await new Promise((resolve) => ws.on('open', resolve));
await new Promise((r) => setTimeout(r, 500));
const createRes = await fetch('http://localhost:3001/api/tasks', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({title:'WS Task'})});
const created = await createRes.json();
const id = created.task.id;
await fetch(`http://localhost:3001/api/tasks/${id}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({status:'in_progress'})});
await fetch(`http://localhost:3001/api/tasks/${id}`, {method:'DELETE'});
await new Promise((r) => setTimeout(r, 1000));
console.log(JSON.stringify(events));
ws.close();
NODE
kill $SRV 2>/dev/null
wait $SRV 2>/dev/null || true
