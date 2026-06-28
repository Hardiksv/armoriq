import express from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../database/client';
import { Agent } from '../agent/Agent';

const router = express.Router();

router.post('/init', async (req: Request, res: Response) => {
  const conv = await prisma.conversation.create({ data: {} });
  await prisma.budget.create({
    data: { conversationId: conv.id, maxTokens: 100000, usedTokens: 0 }
  });
  res.json(conv);
});

router.post('/message', async (req: Request, res: Response) => {
  try {
    const { conversationId, message } = req.body;
    const result = await Agent.getInstance().handleUserMessage(conversationId, message);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  const history = await prisma.message.findMany({
    where: { conversationId: req.params.id },
    orderBy: { createdAt: 'asc' }
  });
  res.json(history);
});

export const chatRoutes = router;
