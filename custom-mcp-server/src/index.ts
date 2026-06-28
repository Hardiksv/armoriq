import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from 'url';

const server = new Server(
  {
    name: "armoriq-custom-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SANDBOX_DIR = path.join(__dirname, "../sandbox");

// Ensure sandbox exists
fs.mkdir(SANDBOX_DIR, { recursive: true }).catch(console.error);

// 1. Tool Listing (Dynamic Discovery Support)
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "read_file",
        description: "Read the contents of a file from the sandbox.",
        inputSchema: {
          type: "object",
          properties: {
            filename: { type: "string", description: "Name of the file to read" },
          },
          required: ["filename"],
        },
      },
      {
        name: "write_file",
        description: "Write content to a file in the sandbox.",
        inputSchema: {
          type: "object",
          properties: {
            filename: { type: "string", description: "Name of the file" },
            content: { type: "string", description: "Content to write" },
          },
          required: ["filename", "content"],
        },
      },
      {
        name: "delete_file",
        description: "Delete a file from the sandbox.",
        inputSchema: {
          type: "object",
          properties: {
            filename: { type: "string", description: "Name of the file to delete" },
          },
          required: ["filename"],
        },
      },
      {
        name: "list_directory",
        description: "List all files in the sandbox directory.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "calculate_hash",
        description: "Calculate the SHA256 hash of a string.",
        inputSchema: {
          type: "object",
          properties: {
            text: { type: "string", description: "Text to hash" },
          },
          required: ["text"],
        },
      },
    ],
  };
});

// 2. Tool Execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "read_file") {
      const filename = String(args?.filename);
      const filePath = path.join(SANDBOX_DIR, filename);
      if (!filePath.startsWith(SANDBOX_DIR)) throw new Error("Path traversal blocked");
      const content = await fs.readFile(filePath, "utf-8");
      return { content: [{ type: "text", text: content }] };
    }

    if (name === "write_file") {
      const filename = String(args?.filename);
      const content = String(args?.content);
      const filePath = path.join(SANDBOX_DIR, filename);
      if (!filePath.startsWith(SANDBOX_DIR)) throw new Error("Path traversal blocked");
      await fs.writeFile(filePath, content, "utf-8");
      return { content: [{ type: "text", text: `Successfully wrote to ${filename}` }] };
    }

    if (name === "delete_file") {
      const filename = String(args?.filename);
      const filePath = path.join(SANDBOX_DIR, filename);
      if (!filePath.startsWith(SANDBOX_DIR)) throw new Error("Path traversal blocked");
      await fs.unlink(filePath);
      return { content: [{ type: "text", text: `Successfully deleted ${filename}` }] };
    }

    if (name === "list_directory") {
      const files = await fs.readdir(SANDBOX_DIR);
      return { content: [{ type: "text", text: files.join("\n") }] };
    }

    if (name === "calculate_hash") {
      const text = String(args?.text);
      const hash = crypto.createHash("sha256").update(text).digest("hex");
      return { content: [{ type: "text", text: hash }] };
    }

    throw new Error(`Tool not found: ${name}`);
  } catch (error: any) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error executing tool ${name}: ${error.message}` }],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Stdio servers should log to stderr to avoid corrupting the stdio IPC pipe
  console.error("Custom MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
