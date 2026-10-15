#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { AuthClient } from "./auth.js";
import { ApiClient } from "./apiClient.js";
import { registerTools } from "./tools.js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente ${name} é obrigatória.`);
  }
  return value;
}

const userPoolId = requireEnv("KANBAN_USER_POOL_ID");
const clientId = requireEnv("KANBAN_USER_POOL_CLIENT_ID");
const username = requireEnv("KANBAN_MCP_USERNAME");
const password = requireEnv("KANBAN_MCP_PASSWORD");
const apiUrl = requireEnv("KANBAN_API_URL").replace(/\/$/, "");

const auth = new AuthClient({ userPoolId, clientId, username, password });
const api = new ApiClient(apiUrl, auth);

const server = new McpServer({
  name: "kanban-mcp",
  version: "1.0.0",
});

registerTools(server, api);

const transport = new StdioServerTransport();
await server.connect(transport);
