import express from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../database/client';
import { Agent } from '../agent/Agent';

const router = express.Router();

router.get('/pending', async (req: Request, res: Response) => {
  const approvals = await prisma.pendingApproval.findMany({
    where: { status: 'PENDING' }
  });
  res.json(approvals);
});

router.post('/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; 
    
    if (status !== 'APPROVED' && status !== 'REJECTED') {
      return res.status(400).json({ error: "Invalid status. Must be APPROVED or REJECTED." });
    }

    const isApproved = status === 'APPROVED';
    const result = await Agent.getInstance().resumeAfterApproval(id, isApproved);
    
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export const approvalRoutes = router;
