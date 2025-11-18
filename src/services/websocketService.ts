import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { CallStatus } from '../types';
import url from 'url';

// Storing active WebSocket connections by call_id
const connections = new Map<string, Set<WebSocket>>();

// Initializing WebSocket server
export const initializeWebSocketServer = (server: Server): WebSocketServer => {
  const wss = new WebSocketServer({ noServer: true });
  
  // Handle upgrade requests
  server.on('upgrade', (request, socket, head) => {
    const pathname = url.parse(request.url || '').pathname;
    
    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });
  
  // Handle new WebSocket connections
  wss.on('connection', (ws: WebSocket, request) => {
    const params = new url.URL(request.url || '', `http://${request.headers.host}`).searchParams;
    const callId = params.get('call_id');
    
    if (!callId) {
      ws.close(1008, 'Missing call_id parameter');
      return;
    }
    
    console.log(`WebSocket connected for call: ${callId}`);
    
    // Adding COnnection to the map
    if (!connections.has(callId)) {
      connections.set(callId, new Set());
    }
    connections.get(callId)?.add(ws);
    
    // Send initial connection success message
    ws.send(JSON.stringify({
      type: 'connected',
      call_id: callId,
      message: 'Connected to call updates'
    }));
    
    // Handle disconnection
    ws.on('close', () => {
      console.log(`WebSocket disconnected for call: ${callId}`);
      const callConnections = connections.get(callId);
      if (callConnections) {
        callConnections.delete(ws);
        if (callConnections.size === 0) {
          connections.delete(callId);
        }
      }
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error(`WebSocket error for call ${callId}:`, error);
    });
  });
  
  console.log('✅ WebSocket server initialized');
  
  return wss;
};

// Broadcast state update to all clients listening to a specific call
export const broadcastCallUpdate = (callId: string, status: CallStatus): void => {
  const callConnections = connections.get(callId);
  
  if (!callConnections || callConnections.size === 0) {
    return;
  }
  
  const message = JSON.stringify({
    call_id: callId,
    status,
    timestamp: new Date().toISOString()
  });
  
  // Send to all connected clients for this call
  callConnections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
  
  console.log(`Broadcasted ${status} update for call ${callId} to ${callConnections.size} client(s)`);
};

// Get count of active connections
export const getActiveConnectionsCount = (): number => {
  let count = 0;
  connections.forEach((clientSet) => {
    count += clientSet.size;
  });
  return count;
};