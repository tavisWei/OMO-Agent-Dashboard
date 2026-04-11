import WebSocket from 'ws';

interface AgentRuntimeStatus {
  agentId: string;
  status: 'idle' | 'running' | 'thinking' | 'error' | 'offline';
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