import express from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../database/client';
import { PolicyEngine } from '../policy/PolicyEngine';
import { WebSocketManager } from '../websocket/socket';

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
  const rules = await prisma.rule.findMany();
  res.json(rules);
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { type, targetTool, config } = req.body;
    const rule = await prisma.rule.create({
      data: { type, targetTool, config }
    });
    
    await PolicyEngine.getInstance().invalidateCache();
    WebSocketManager.getInstance().emitRuleUpdated({ action: 'created', ruleId: rule.id });
    
    res.json(rule);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const rule = await prisma.rule.update({
      where: { id },
      data: { isActive }
    });
    
    await PolicyEngine.getInstance().invalidateCache();
    WebSocketManager.getInstance().emitRuleUpdated({ action: 'updated', ruleId: rule.id });
    
    res.json(rule);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.rule.delete({ where: { id } });
    await PolicyEngine.getInstance().invalidateCache();
    WebSocketManager.getInstance().emitRuleUpdated({ action: 'deleted', ruleId: id });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export const ruleRoutes = router;
