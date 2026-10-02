import { beforeEach, describe, expect, it, vi } from "vitest";
import type { McpServer } from "@modelcontextprotocol/server";

const zohoMocks = vi.hoisted(() => ({
  listItems: vi.fn(),
  getItem: vi.fn(),
  listSalesOrders: vi.fn(),
  getSalesOrder: vi.fn(),
  listContacts: vi.fn(),
  getContact: vi.fn(),
}));

vi.mock("../src/zoho/items.js", () => ({
  listItems: zohoMocks.listItems,
  getItem: zohoMocks.getItem,
}));
vi.mock("../src/zoho/salesOrders.js", () => ({
  listSalesOrders: zohoMocks.listSalesOrders,
  getSalesOrder: zohoMocks.getSalesOrder,
}));
vi.mock("../src/zoho/contacts.js", () => ({
  listContacts: zohoMocks.listContacts,
  getContact: zohoMocks.getContact,
}));

import { registerContactTools } from "../src/tools/contactTools.js";
import { registerItemTools } from "../src/tools/itemTools.js";
import { registerSalesOrderTools } from "../src/tools/salesOrderTools.js";
import { ZohoNotFoundError } from "../src/zoho/errors.js";

interface Registration {
  config: unknown;
  handler: unknown;
}

let registrations = new Map<string, Registration>();

const fakeServer = {
  registerTool(name: string, config: unknown, handler: unknown) {
    registrations.set(name, { config, handler });
  },
} as unknown as McpServer;

function registerAllTools(): void {
  registerItemTools(fakeServer);
  registerSalesOrderTools(fakeServer);
  registerContactTools(fakeServer);
}

function getInputSchema(name: string): { safeParse(input: unknown): { success: boolean } } {
  const registration = registrations.get(name);

  if (!registration) {
    throw new Error(`Tool not registered: ${name}`);
  }

  return (registration.config as { inputSchema: { safeParse(input: unknown): { success: boolean } } })
    .inputSchema;
}

function getHandler(name: string): (input: unknown) => Promise<unknown> {
  const registration = registrations.get(name);

  if (!registration) {
    throw new Error(`Tool not registered: ${name}`);
  }

  return registration.handler as (input: unknown) => Promise<unknown>;
}

beforeEach(() => {
  vi.clearAllMocks();
  registrations = new Map();
  registerAllTools();
});

describe("MCP tools", () => {
  it("registers the nine read-only primitives", () => {
    expect([...registrations.keys()].sort()).toEqual([
      "get_contact",
      "get_item",
      "get_sales_order",
      "list_contacts",
      "list_items",
      "list_sales_orders",
      "search_contacts",
      "search_items",
      "search_sales_orders",
    ]);
  });

  it("validates tool inputs with their Zod schemas", () => {
    expect(getInputSchema("search_items").safeParse({ query: "" }).success).toBe(false);
    expect(getInputSchema("search_items").safeParse({ query: "mouse" }).success).toBe(true);
    expect(getInputSchema("list_items").safeParse({ page: 0 }).success).toBe(false);
    expect(getInputSchema("get_contact").safeParse({ contactId: "" }).success).toBe(false);
  });

  it("returns focused structured item output", async () => {
    zohoMocks.listItems.mockResolvedValue({
      items: [
        {
          item_id: "item-1",
          name: "Demo Hub",
          sku: "DEMO-HUB-01",
          stock_on_hand: 4,
          reorder_level: 8,
        },
      ],
      page_context: { page: 1, per_page: 50, has_more_page: false },
    });

    const result = await getHandler("list_items")({ page: 1, perPage: 50 }) as {
      structuredContent: { items: Array<{ id: string; sku: string; stock_on_hand: number }> };
    };

    expect(result.structuredContent.items[0]).toMatchObject({
      id: "item-1",
      sku: "DEMO-HUB-01",
      stock_on_hand: 4,
    });
  });

  it("propagates typed errors without exposing upstream response bodies", async () => {
    const error = new ZohoNotFoundError("The requested Zoho record was not found.", 404);
    zohoMocks.getContact.mockRejectedValue(error);

    await expect(getHandler("get_contact")({ contactId: "missing" })).rejects.toBe(error);
    expect(error.message).not.toContain("response body");
  });
});
