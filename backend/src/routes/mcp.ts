import express from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../database/client';
import { McpRegistry } from '../mcp/McpRegistry';

const router = express.Router();

router.get('/servers', async (req: Request, res: Response) => {
  const servers = await prisma.mcpServerConfig.findMany();
  res.json(servers);
});

router.get('/tools', async (req: Request, res: Response) => {
  const tools = await McpRegistry.getInstance().getAvailableTools();
  res.json(tools);
});

router.post('/servers', async (req: Request, res: Response) => {
  try {
    const { name, type, command, url, args } = req.body;
    const server = await prisma.mcpServerConfig.create({
      data: { name, type, command, url, args }
    });
    
    await McpRegistry.getInstance().addServerDynamically(server.id);
    
    res.json(server);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export const mcpRoutes = router;
