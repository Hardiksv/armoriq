import 'dotenv/config';
import { prisma } from './src/database/client';

async function main() {
  await prisma.mcpServerConfig.upsert({
    where: { name: 'armoriq-custom-mcp' },
    update: {
      command: 'node',
      args: ['../custom-mcp-server/dist/index.js']
    },
    create: {
      name: 'armoriq-custom-mcp',
      type: 'stdio',
      command: 'node',
      args: ['../custom-mcp-server/dist/index.js']
    }
  });
  
  await prisma.mcpServerConfig.upsert({
    where: { name: 'memory-mcp-server' },
    update: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-memory']
    },
    create: {
      name: 'memory-mcp-server',
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-memory']
    }
  });

  console.log('Seeded both MCP servers successfully.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
