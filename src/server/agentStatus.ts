import WebSocket from 'ws';
import type { AgentStatus } from '../types/index.js';
import { getDashboardSnapshot } from './opencode-reader.js';

interface AgentRuntimeStatus {
  agentId: string;
  status: AgentStatus;
  lastUpdate: string;
  sessionName?: string;
}

class AgentStatusMonitor {
  private status: Map<string, AgentRuntimeStatus> = new Map();
  private wsClients: Set<WebSocket> = new Set();
  
  updateStatus(agentId: string, status: AgentRuntimeStatus['status'], sessionName?: string) {
    this.status.set(agentId, {
      agentId,
      status,
      lastUpdate: new Date().toISOString(),
      sessionName,
    });
    this.broadcast();
  }
  
  getStatus() {
    return Array.from(this.status.values());
  }

  syncFromOpenCode() {
    const snapshot = getDashboardSnapshot({ limit: 200 });
    if (snapshot.error) {
      return;
    }

    this.status.clear();
    snapshot.sessions.forEach((session) => {
      const normalizedStatus: AgentStatus = (() => {
        if (session.status === 'active') {
          return 'thinking';
        }
        return session.status;
      })();
      this.status.set(session.id, {
        agentId: session.id,
        status: normalizedStatus,
        lastUpdate: session.updatedAt,
        sessionName: session.title,
      });
    });
    this.broadcast();
  }
  
  addClient(ws: WebSocket) {
    this.wsClients.add(ws);
  }
  
  removeClient(ws: WebSocket) {
    this.wsClients.delete(ws);
  }
  
  private broadcast() {
    const status = this.getStatus();
    const message = JSON.stringify({ type: 'agent_status', data: status });
    this.wsClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}

export const agentStatusMonitor = new AgentStatusMonitor();
