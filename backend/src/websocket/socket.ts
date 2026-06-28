import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';

export class WebSocketManager {
  private static instance: WebSocketManager;
  private io: Server | null = null;

  private constructor() {}

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  public initialize(server: HttpServer) {
    this.io = new Server(server, {
      cors: { origin: '*' }
    });

    this.io.on('connection', (socket: Socket) => {
      console.log(`[WebSocket] Client connected: ${socket.id}`);
      
      socket.on('disconnect', () => {
        console.log(`[WebSocket] Client disconnected: ${socket.id}`);
      });
    });
  }

  public emitApprovalRequested(payload: any) {
    if (this.io) this.io.emit('approval_requested', payload);
  }

  public emitRuleUpdated(payload: any) {
    if (this.io) this.io.emit('rule_updated', payload);
  }

  public emitLogEntry(payload: any) {
    if (this.io) this.io.emit('log_emitted', payload);
  }
}
