import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { ruleRoutes } from './routes/rules';
import { mcpRoutes } from './routes/mcp';
import { chatRoutes } from './routes/chat';
import { approvalRoutes } from './routes/approvals';
import { WebSocketManager } from './websocket/socket';
import { PolicyEngine } from './policy/PolicyEngine';
import { McpRegistry } from './mcp/McpRegistry';
// Env loaded via import 'dotenv/config'

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/rules', ruleRoutes);
app.use('/api/mcp', mcpRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/approvals', approvalRoutes);

const server = http.createServer(app);
WebSocketManager.getInstance().initialize(server);

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  console.log('Verifying environment variables...');
  if (!process.env.DATABASE_URL) {
    console.error('FATAL ERROR: DATABASE_URL is not set in .env');
    process.exit(1);
  }
  if (!process.env.GEMINI_API_KEY) {
    console.error('FATAL ERROR: GEMINI_API_KEY is not set in .env');
    process.exit(1);
  }

  console.log('Initializing Policy Engine Cache...');
  await PolicyEngine.getInstance().initialize();
  
  console.log('Initializing MCP Registry connections...');
  await McpRegistry.getInstance().initialize();
  
  server.listen(PORT, () => {
    console.log(`Backend API & WebSocket listening on port ${PORT}`);
  });
}

bootstrap().catch(console.error);
