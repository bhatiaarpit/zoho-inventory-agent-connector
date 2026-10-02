import "dotenv/config";

import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";

import { registerContactTools } from "../tools/contactTools.js";
import { registerItemTools } from "../tools/itemTools.js";
import { registerSalesOrderTools } from "../tools/salesOrderTools.js";

export function createMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: "zoho-inventory-agent-connector",
      version: "1.0.0",
    },
    {
      instructions:
        "This server provides read-only access to inventory, sales-order, and contact data " +
        "from an authenticated Zoho Inventory organization. " +
        "It cannot create, update, delete, send, approve, or otherwise mutate merchant data. " +
        "Use search_items for item discovery, get_item for a specific item, " +
        "list_items for browsing, the sales-order tools for order lookup, " +
        "and the contact tools for customer lookup. " +
        "Do not assume that missing stock data means zero stock.",
    },
  );

  registerItemTools(server);
  registerSalesOrderTools(server);
  registerContactTools(server);

  return server;
}

void serveStdio(createMcpServer);

console.error("Zoho Inventory MCP server running over stdio");
