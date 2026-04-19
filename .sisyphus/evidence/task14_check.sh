npm run server > .sisyphus/evidence/task-14-server.log 2>&1 &
SRV=$!
sleep 8

PARENT=$(curl -s -X POST http://localhost:3001/api/tasks -H 'Content-Type: application/json' -d '{"title":"Parent","priority":"high","assigned_agents":[14,8],"agent_id":14}')
PID=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["task"]["id"])' "$PARENT")

CHILD=$(curl -s -X POST http://localhost:3001/api/tasks -H 'Content-Type: application/json' -d '{"title":"Child","parent_task_id":'"$PID"',"depends_on":[]}')
ASSIGN=$(curl -s -X POST http://localhost:3001/api/tasks/"$PID"/assign -H 'Content-Type: application/json' -d '{"assignments":[{"agent_id":14,"role":"lead"},{"agent_id":8,"role":"worker"}]}')

BLOCKER=$(curl -s -X POST http://localhost:3001/api/tasks -H 'Content-Type: application/json' -d '{"title":"Blocker","status":"backlog"}')
BID=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["task"]["id"])' "$BLOCKER")
DEPADD=$(curl -s -X POST http://localhost:3001/api/tasks/"$PID"/dependencies -H 'Content-Type: application/json' -d '{"add":[{"depends_on_task_id":'"$BID"',"dependency_type":"blocks"}]}')

BLOCKED=$(curl -s -o /tmp/task14-blocked.json -w '%{http_code}' -X PUT http://localhost:3001/api/tasks/"$PID" -H 'Content-Type: application/json' -d '{"status":"in_progress"}')
curl -s -X PUT http://localhost:3001/api/tasks/"$BID" -H 'Content-Type: application/json' -d '{"status":"in_progress"}' >/dev/null
curl -s -X PUT http://localhost:3001/api/tasks/"$BID" -H 'Content-Type: application/json' -d '{"status":"done"}' >/dev/null
STARTOK=$(curl -s -o /tmp/task14-startok.json -w '%{http_code}' -X PUT http://localhost:3001/api/tasks/"$PID" -H 'Content-Type: application/json' -d '{"status":"in_progress"}')
INVALID=$(curl -s -o /tmp/task14-invalid.json -w '%{http_code}' -X PUT http://localhost:3001/api/tasks/"$PID" -H 'Content-Type: application/json' -d '{"status":"backlog"}')
DETAIL=$(curl -s http://localhost:3001/api/tasks/"$PID")
SUB=$(curl -s http://localhost:3001/api/tasks/"$PID"/subtasks)
FILTER=$(curl -s 'http://localhost:3001/api/tasks?priority=high&agent_id=14')

printf 'BLOCKED_STATUS=%s\nSTARTOK_STATUS=%s\nINVALID_STATUS=%s\nPARENT=%s\nCHILD=%s\nASSIGN=%s\nDEPADD=%s\nDETAIL=%s\nSUBTASKS=%s\nFILTER=%s\n' "$BLOCKED" "$STARTOK" "$INVALID" "$PARENT" "$CHILD" "$ASSIGN" "$DEPADD" "$DETAIL" "$SUB" "$FILTER" > .sisyphus/evidence/task-14-api-checks-atlas.txt
kill $SRV 2>/dev/null
wait $SRV 2>/dev/null || true
