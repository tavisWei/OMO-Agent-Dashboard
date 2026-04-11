import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';

const PORT = 3001;
const HEARTBEAT_INTERVAL = 30000;

let wss: WebSocketServer | null = null;
let heartbeatTimer: NodeJS.Timeout | null = null;
const clients = new Set<WebSocket>();

export type WSServerMessageType = 'agent_update' | 'task_update' | 'heartbeat' | 'config_change';
export type WSMessageType = WSServerMessageType | 'welcome';

export interface WSMessage {
  type: WSMessageType;
  payload: any;
  timestamp: number;
}

export interface WelcomeMessage extends WSMessage {
  type: 'welcome';
  payload: {
    version: string;
    connectedAt: number;
    stats: { agents: number; tasks: number; projects: number };
  };
}

interface HeartbeatMessage extends WSMessage {
  type: 'heartbeat';
  payload: { pong: true };
}

export function initializeWebSocketServer(expressServer?: any): WebSocketServer {
  if (wss) return wss;

  if (!expressServer) {
    const http = require('http').createServer();
    wss = new WebSocketServer({ server: http });
    http.listen(PORT, () => console.log(`[WS] Listening on ${PORT}`));
  } else {
    wss = new WebSocketServer({ noServer: true });
    expressServer.on('upgrade', (req: IncomingMessage, socket: any, head: any) => {
      wss!.handleUpgrade(req, socket, head, (ws) => {
        wss!.emit('connection', ws, req);
      });
    });
  }

  wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
    clients.add(ws);
    console.log(`[WS] Client connected (${clients.size} total)`);

    (ws as any).isAlive = true;

    const welcome: WelcomeMessage = {
      type: 'welcome',
      payload: { version: '1.0.0', connectedAt: Date.now(), stats: { agents: 0, tasks: 0, projects: 0 } },
      timestamp: Date.now()
    };
    ws.send(JSON.stringify(welcome));

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as WSMessage;
        if (message.type === 'heartbeat') {
          const pong: HeartbeatMessage = { type: 'heartbeat', payload: { pong: true }, timestamp: Date.now() };
          ws.send(JSON.stringify(pong));
        } else {
          broadcast(message, ws);
        }
      } catch {}
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log(`[WS] Client disconnected (${clients.size} total)`);
    });

    ws.on('error', () => clients.delete(ws));
    ws.on('pong', () => { (ws as any).isAlive = true; });
  });

  startHeartbeat();
  return wss;
}

function startHeartbeat(): void {
  if (heartbeatTimer) clearInterval(heartbeatTimer);

  heartbeatTimer = setInterval(() => {
    if (clients.size === 0) return;

    const ping: WSMessage = { type: 'heartbeat', payload: { ping: true }, timestamp: Date.now() };

    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        (client as any).isAlive = false;
        client.ping();
        client.send(JSON.stringify(ping));
      }
    });

    setTimeout(() => {
      clients.forEach((client) => {
        if ((client as any).isAlive === false) {
          client.terminate();
          clients.delete(client);
        }
      });
    }, 5000);
  }, HEARTBEAT_INTERVAL);
}

export function stopHeartbeat(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

export function broadcast(message: WSMessage, exclude?: WebSocket): void {
  const data = JSON.stringify(message);
  clients.forEach((client) => {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

export function broadcastAll(message: WSMessage): void {
  const data = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

export function getClientCount(): number {
  return clients.size;
}

export function getClients(): Set<WebSocket> {
  return clients;
}

export function isClientConnected(ws: WebSocket): boolean {
  return clients.has(ws) && ws.readyState === WebSocket.OPEN;
}

export function closeWebSocketServer(): void {
  stopHeartbeat();
  clients.forEach((c) => c.close());
  clients.clear();
  if (wss) {
    wss.close();
    wss = null;
  }
}

export function getWebSocketServer(): WebSocketServer | null {
  return wss;
}

export function createWSMessage(type: WSMessage['type'], payload: any): WSMessage {
  return { type, payload, timestamp: Date.now() };
}

export function sendToClient(ws: WebSocket, message: WSMessage): boolean {
  if (ws.readyState !== WebSocket.OPEN) return false;
  ws.send(JSON.stringify(message));
  return true;
}
