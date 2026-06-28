import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { prisma } from '../database/client';

export class McpRegistry {
  private clients: Map<string, Client> = new Map();
  private static instance: McpRegistry;

  private constructor() {}

  public static getInstance(): McpRegistry {
    if (!McpRegistry.instance) {
      McpRegistry.instance = new McpRegistry();
    }
    return McpRegistry.instance;
  }

  public async initialize() {
    const servers = await prisma.mcpServerConfig.findMany({ where: { isActive: true } });
    for (const server of servers) {
      await this.connectServer(server);
    }
  }

  public async connectServer(config: any) {
    let transport;
    try {
      if (config.type === 'stdio') {
        transport = new StdioClientTransport({
          command: config.command,
          args: config.args ? (config.args as string[]) : [],
        });
      } else if (config.type === 'sse') {
        transport = new SSEClientTransport(new URL(config.url));
      } else {
        throw new Error(`Unsupported transport type: ${config.type}`);
      }

      const client = new Client(
        { name: 'armoriq-agent', version: '1.0.0' },
        { capabilities: {} }
      );

      await client.connect(transport);
      this.clients.set(config.name, client);

      await this.syncTools(config.id, config.name, client);

      await prisma.mcpServerConfig.update({
        where: { id: config.id },
        data: { status: 'CONNECTED', lastHealthCheck: new Date() }
      });
      console.log(`[MCP Registry] Connected to server: ${config.name}`);
    } catch (error) {
      console.error(`[MCP Registry] Failed to connect to ${config.name}:`, error);
      await prisma.mcpServerConfig.update({
        where: { id: config.id },
        data: { status: 'ERROR', lastHealthCheck: new Date() }
      });
    }
  }

  private async syncTools(serverId: string, serverName: string, client: Client) {
    try {
      const response = await client.listTools();
      
      await prisma.discoveredTool.deleteMany({ where: { serverId } });
      
      const toolRecords = response.tools.map(tool => ({
        serverId,
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema as any,
        lastSeen: new Date()
      }));

      if (toolRecords.length > 0) {
        await prisma.discoveredTool.createMany({ data: toolRecords });
      }
      console.log(`[MCP Registry] Synced ${toolRecords.length} tools from ${serverName}`);
    } catch (error) {
      console.error(`[MCP Registry] Failed to sync tools for ${serverName}:`, error);
    }
  }

  public async addServerDynamically(serverId: string) {
    const config = await prisma.mcpServerConfig.findUnique({ where: { id: serverId } });
    if (config) {
      await this.connectServer(config);
    }
  }

  public async getAvailableTools() {
    return prisma.discoveredTool.findMany({
      include: { server: true }
    });
  }

  public async callTool(serverName: string, toolName: string, args: any) {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`MCP Server ${serverName} is not connected or was disconnected.`);
    }

    const timeoutMs = 15000;
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('MCP Tool Execution Timeout (15s)')), timeoutMs)
    );

    const executionPromise = client.callTool({
      name: toolName,
      arguments: args
    });

    try {
      return await Promise.race([executionPromise, timeoutPromise]);
    } catch (error) {
      console.error(`[MCP Registry] Tool Execution Failed for ${toolName}:`, error);
      throw error;
    }
  }
}
