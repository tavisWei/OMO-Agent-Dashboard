import { useEffect } from 'react';
import { useAgentRuntimeStore } from '../stores/agentRuntimeStore';
import { useDashboardStore } from '../stores/dashboardStore';
import { useActivityStore } from '../stores/activityStore';

const WS_URL = `ws://${window.location.hostname}:3001`;

export function useAgentRuntime() {
  const { setWsConnected, setAgents } = useAgentRuntimeStore();
  const { applySnapshot, fetchSessions, fetchConfig, setWsConnected: setDashboardWsConnected } = useDashboardStore();
  const fetchLogs = useActivityStore((state) => state.fetchLogs);
  
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    
    const connect = () => {
      try {
        ws = new WebSocket(WS_URL);
        
        ws.onopen = () => {
          console.log('[AgentRuntime] WebSocket connected');
          setWsConnected(true);
          setDashboardWsConnected(true);
          fetchSessions();
          fetchConfig();
        };
        
        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'agent_status') {
              setAgents(message.data);
            }
            if (message.type === 'session_update' && message.payload) {
              applySnapshot({
                sessions: message.payload.sessions,
                projects: message.payload.projects,
                overview: message.payload.overview,
                tree: message.payload.tree,
              });
              fetchLogs(true);
            }
            if (message.type === 'config_change') {
              fetchConfig();
              fetchLogs(true);
            }
          } catch (e) {
            console.error('[AgentRuntime] Failed to parse message:', e);
          }
        };
        
        ws.onclose = () => {
          console.log('[AgentRuntime] WebSocket disconnected');
          setWsConnected(false);
          setDashboardWsConnected(false);
          reconnectTimeout = setTimeout(connect, 3000);
        };
        
        ws.onerror = (error) => {
          console.error('[AgentRuntime] WebSocket error:', error);
        };
      } catch (e) {
        console.error('[AgentRuntime] Failed to create WebSocket:', e);
        reconnectTimeout = setTimeout(connect, 5000);
      }
    };
    
    connect();
    
    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [setWsConnected, setAgents, applySnapshot, fetchSessions, fetchConfig, setDashboardWsConnected, fetchLogs]);
}
