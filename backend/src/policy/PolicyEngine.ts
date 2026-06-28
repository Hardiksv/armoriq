import { prisma } from '../database/client';
import { WebSocketManager } from '../websocket/socket';

export type PolicyResult = {
  action: 'ALLOW' | 'BLOCK' | 'REQUIRE_APPROVAL';
  reason?: string;
  approvalId?: string;
};

export class PolicyEngine {
  private rulesCache: any[] = [];
  private static instance: PolicyEngine;

  private constructor() {}

  public static getInstance(): PolicyEngine {
    if (!PolicyEngine.instance) {
      PolicyEngine.instance = new PolicyEngine();
    }
    return PolicyEngine.instance;
  }

  public async initialize() {
    await this.invalidateCache();
  }

  public async invalidateCache() {
    this.rulesCache = await prisma.rule.findMany({ where: { isActive: true } });
    console.log(`[Policy Engine] Cache invalidated. Loaded ${this.rulesCache.length} active rules.`);
  }

  public async evaluateIntent(
    conversationId: string, 
    toolName: string, 
    args: any, 
    estimatedTokens: number
  ): Promise<PolicyResult> {
    const budget = await prisma.budget.findUnique({ where: { conversationId } });
    if (budget && (budget.usedTokens + estimatedTokens > budget.maxTokens)) {
      await this.logAudit(conversationId, 'POLICY_BLOCK', toolName, args, 'Token budget exceeded');
      return { action: 'BLOCK', reason: 'Token budget exceeded' };
    }

    const relevantRules = this.rulesCache.filter(r => r.targetTool === toolName || r.targetTool === '*');

    const blockRule = relevantRules.find(r => r.type === 'BLOCK');
    if (blockRule) {
      await this.logAudit(conversationId, 'POLICY_BLOCK', toolName, args, `Blocked by rule ${blockRule.id}`);
      return { action: 'BLOCK', reason: 'Execution blocked by administrator policy' };
    }

    const validationRules = relevantRules.filter(r => r.type === 'VALIDATION');
    for (const rule of validationRules) {
      const config = rule.config as any;
      if (config && config.arg && config.pattern) {
        const argValue = args[config.arg];
        if (argValue !== undefined && argValue !== null) {
          const regex = new RegExp(config.pattern);
          if (!regex.test(String(argValue))) {
            await this.logAudit(conversationId, 'POLICY_BLOCK', toolName, args, `Failed input validation on arg '${config.arg}'`);
            return { action: 'BLOCK', reason: `Input validation failed for argument: ${config.arg}` };
          }
        }
      }
    }

    const approvalRule = relevantRules.find(r => r.type === 'APPROVAL');
    if (approvalRule) {
      const pendingApproval = await prisma.pendingApproval.create({
        data: {
          conversationId,
          toolName,
          args,
          status: 'PENDING'
        }
      });
      await this.logAudit(conversationId, 'APPROVAL_REQUEST', toolName, args, `Approval requested for rule ${approvalRule.id}`);
      
      WebSocketManager.getInstance().emitApprovalRequested({
        approvalId: pendingApproval.id,
        conversationId,
        toolName,
        args
      });
      
      return { action: 'REQUIRE_APPROVAL', reason: 'Action requires human approval', approvalId: pendingApproval.id };
    }

    await this.logAudit(conversationId, 'TOOL_EXEC_ALLOWED', toolName, args, 'Passed all policies');
    return { action: 'ALLOW' };
  }

  private async logAudit(conversationId: string, action: string, toolName: string, details: any, reason: string) {
    try {
      const log = await prisma.auditLog.create({
        data: {
          conversationId,
          action,
          toolName,
          details: { args: details, reason }
        }
      });
      WebSocketManager.getInstance().emitLogEntry(log);
    } catch (e) {
      console.error('[Policy Engine] Failed to write audit log', e);
    }
  }
}
