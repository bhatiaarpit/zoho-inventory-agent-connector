import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

import {
  getItem,
  listItems,
  type InventoryItem,
} from "../zoho/items.js";
import { toPagination } from "../zoho/pagination.js";

function toAgentItem(item: InventoryItem) {
  return {
    id: item.item_id,
    name: item.name,
    sku: item.sku ?? null,
    status: item.status ?? null,
    item_type: item.item_type ?? null,
    product_type: item.product_type ?? null,
    selling_price: item.rate ?? null,
    purchase_price: item.purchase_rate ?? null,
    stock_on_hand: item.stock_on_hand ?? null,
    reorder_level: item.reorder_level ?? null,
    track_inventory: item.track_inventory ?? null,
    can_be_sold: item.can_be_sold ?? null,
    can_be_purchased: item.can_be_purchased ?? null,
    unit: item.unit ?? null,
    description: item.description ?? null,
    locations:
      item.locations?.map((location) => ({
        id: location.location_id,
        name: location.location_name,
        status: location.status ?? null,
        is_primary: location.is_primary ?? null,
        stock_on_hand: location.location_stock_on_hand ?? null,
        available_stock: location.location_available_stock ?? null,
      })) ?? [],
  };
}

export function registerItemTools(server: McpServer): void {
  server.registerTool(
    "list_items",
    {
      title: "List Inventory Items",
      description:
        "List items from the authenticated Zoho Inventory organization. " +
        "Use this for browsing inventory records. Results are paginated.",
      inputSchema: z.object({
        page: z.number().int().min(1).default(1).describe("Page number to retrieve."),
        perPage: z
          .number()
          .int()
          .min(1)
          .max(200)
          .default(50)
          .describe("Number of items to return."),
        status: z
          .enum(["active", "inactive"])
          .optional()
          .describe("Filter by item status."),
      }),
    },
    async ({ page, perPage, status }) => {
      const result = await listItems({ page, perPage, status });
      const output = {
        items: result.items.map(toAgentItem),
        pagination: toPagination(result.page_context, page, perPage),
      };

      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    },
  );

  server.registerTool(
    "search_items",
    {
      title: "Search Inventory Items",
      description:
        "Searches Zoho's searchable item text using the upstream search_text parameter. " +
        "Use this when the user is looking for a specific product or set of products.",
      inputSchema: z.object({
        query: z
          .string()
          .min(1)
          .max(200)
          .describe("Text to search across Zoho's searchable item fields."),
        page: z.number().int().min(1).default(1).describe("Page number to retrieve."),
        perPage: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(50)
          .describe("Maximum number of matching items to return."),
      }),
    },
    async ({ query, page, perPage }) => {
      const result = await listItems({ page, perPage, searchText: query });
      const output = {
        query,
        items: result.items.map(toAgentItem),
        pagination: toPagination(result.page_context, page, perPage),
      };

      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    },
  );

  server.registerTool(
    "get_item",
    {
      title: "Get Inventory Item",
      description:
        "Retrieve the complete details for one Zoho Inventory item using its item ID.",
      inputSchema: z.object({
        itemId: z.string().min(1).describe("Zoho Inventory item ID."),
      }),
    },
    async ({ itemId }) => {
      const result = await getItem(itemId);
      const output = { item: toAgentItem(result.item) };

      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    },
  );
}
