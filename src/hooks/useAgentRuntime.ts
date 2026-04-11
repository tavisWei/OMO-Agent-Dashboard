import { useEffect } from 'react';
import { useAgentRuntimeStore } from '../stores/agentRuntimeStore';

const WS_URL = `ws://${window.location.hostname}:3001`;

export function useAgentRuntime() {
  const { setWsConnected, setAgents } = useAgentRuntimeStore();
  
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    
    const connect = () => {
      try {
        ws = new WebSocket(WS_URL);
        
        ws.onopen = () => {
          console.log('[AgentRuntime] WebSocket connected');
          setWsConnected(true);
        };
        
        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'agent_status') {
              setAgents(message.data);
            }
          } catch (e) {
            console.error('[AgentRuntime] Failed to parse message:', e);
          }
        };
        
        ws.onclose = () => {
          console.log('[AgentRuntime] WebSocket disconnected');
          setWsConnected(false);
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
  }, [setWsConnected, setAgents]);
}