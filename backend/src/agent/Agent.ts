import { GoogleGenAI } from '@google/genai';
import { prisma } from '../database/client';
import { PolicyEngine } from '../policy/PolicyEngine';
import { McpRegistry } from '../mcp/McpRegistry';
import { WebSocketManager } from '../websocket/socket';

const MAX_ITERATIONS = 5;

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY environment variable is not set.");
  return new GoogleGenAI({ apiKey });
}

export class Agent {
  private static instance: Agent;

  private constructor() {}

  public static getInstance(): Agent {
    if (!Agent.instance) {
      Agent.instance = new Agent();
    }
    return Agent.instance;
  }

  /**
   * Main entry point for a user message.
   */
  public async handleUserMessage(conversationId: string, content: string) {
    await prisma.message.create({
      data: { conversationId, role: 'user', content }
    });

    return this.processLoop(conversationId, 0);
  }

  public async resumeAfterApproval(approvalId: string, isApproved: boolean) {
    const approval = await prisma.pendingApproval.findUnique({ where: { id: approvalId } });
    if (!approval) throw new Error("Approval not found");
    if (approval.status !== 'PENDING') throw new Error("Approval no longer pending");

    if (!isApproved) {
      await prisma.pendingApproval.update({ where: { id: approvalId }, data: { status: 'REJECTED' } });
      
      await prisma.message.create({
        data: {
          conversationId: approval.conversationId,
          role: 'tool',
          content: JSON.stringify({ error: `Execution of ${approval.toolName} was rejected by human.` })
        }
      });
      
      await prisma.toolExecution.create({
        data: {
          conversationId: approval.conversationId,
          toolName: approval.toolName,
          args: approval.args,
          status: 'BLOCKED_BY_POLICY',
          result: 'Rejected by human administrator'
        }
      });
    } else {
      await prisma.pendingApproval.update({ where: { id: approvalId }, data: { status: 'APPROVED' } });
      await this.executeTool(approval.conversationId, approval.toolName, approval.args);
    }

    // Resume the iterative loop regardless of outcome
    return this.processLoop(approval.conversationId, 0);
  }

  private async processLoop(conversationId: string, iteration: number): Promise<any> {
    if (iteration >= MAX_ITERATIONS) {
      const msg = "Agent loop stopped: Reached maximum iterations constraint.";
      await prisma.message.create({ data: { conversationId, role: 'agent', content: msg } });
      return { status: 'STOPPED', message: msg };
    }

    const history = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' }
    });

    const contents = history.map(m => {
        return { 
          role: m.role === 'tool' ? 'user' : m.role === 'agent' ? 'model' : 'user', 
          parts: [{ text: m.content }] 
        }
    });

    const availableTools = await McpRegistry.getInstance().getAvailableTools();
    const formattedTools = availableTools.map(t => ({
      name: t.name,
      description: t.description || '',
      parameters: t.inputSchema || { type: "object", properties: {} }
    }));

    try {
      const response = await getAiClient().models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          tools: formattedTools.length > 0 ? [{ functionDeclarations: formattedTools }] : undefined
        }
      });

      const functionCalls = response.functionCalls;

      if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0];
        const toolName = call.name;
        const args = call.args;

        await prisma.message.create({
          data: { conversationId, role: 'agent', content: `[Intent: Call Tool ${toolName} with args: ${JSON.stringify(args)}]` }
        });

        const estimatedTokens = 150; 
        const policyResult = await PolicyEngine.getInstance().evaluateIntent(conversationId, toolName, args, estimatedTokens);

        // STATE: APPROVAL_PENDING
        if (policyResult.action === 'REQUIRE_APPROVAL') {
          return { status: 'APPROVAL_PENDING', approvalId: policyResult.approvalId };
        } 
        
        else if (policyResult.action === 'BLOCK') {
          await prisma.message.create({
            data: { conversationId, role: 'tool', content: JSON.stringify({ error: policyResult.reason }) }
          });
          await prisma.toolExecution.create({
            data: { conversationId, toolName, args, status: 'BLOCKED_BY_POLICY', result: policyResult.reason }
          });
          return this.processLoop(conversationId, iteration + 1);
        } 
        
        else if (policyResult.action === 'ALLOW') {
          await this.executeTool(conversationId, toolName, args);
          return this.processLoop(conversationId, iteration + 1);
        }
      }

      const text = response.text || "";
      if (text) {
        await prisma.message.create({
          data: { conversationId, role: 'agent', content: text }
        });
        return { status: 'FINAL_RESPONSE', message: text };
      }

    } catch (error: any) {
      console.error("[Agent Loop] Error during generation:", error);
      
      const errorMsg = `LLM/API Failure: ${error.message}`;
      await prisma.message.create({ data: { conversationId, role: 'tool', content: JSON.stringify({ error: errorMsg }) }});
      
      return this.processLoop(conversationId, iteration + 1);
    }
  }

  private async executeTool(conversationId: string, toolName: string, args: any) {
    const startTime = Date.now();
    try {
      const toolDef = await prisma.discoveredTool.findFirst({
        where: { name: toolName },
        include: { server: true }
      });
      if (!toolDef) throw new Error(`Tool ${toolName} not found in active registry.`);

      const result = await McpRegistry.getInstance().callTool(toolDef.server.name, toolName, args);
      
      const resultStr = JSON.stringify(result);
      await prisma.toolExecution.create({
        data: { conversationId, toolName, args, status: 'SUCCESS', result: resultStr, executionTime: Date.now() - startTime }
      });
      await prisma.message.create({
        data: { conversationId, role: 'tool', content: resultStr }
      });

      WebSocketManager.getInstance().emitLogEntry({
        action: 'TOOL_EXEC',
        toolName,
        details: { result: 'Successfully executed' }
      });


    } catch (e: any) {
      const errorMsg = e.message || 'Unknown Execution Error';
      await prisma.toolExecution.create({
        data: { conversationId, toolName, args, status: 'ERROR', result: errorMsg, executionTime: Date.now() - startTime }
      });
      await prisma.message.create({
        data: { conversationId, role: 'tool', content: JSON.stringify({ error: errorMsg }) }
      });
    }
  }
}
