import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

import {
  getSalesOrder,
  listSalesOrders,
  type SalesOrder,
} from "../zoho/salesOrders.js";
import { toPagination } from "../zoho/pagination.js";

function toAgentSalesOrder(order: SalesOrder) {
  return {
    id: String(order.salesorder_id),
    order_number: order.salesorder_number,
    customer: {
      id: order.customer_id ? String(order.customer_id) : null,
      name: order.customer_name ?? null,
    },
    status: order.status ?? null,
    date: order.date ?? null,
    shipment_date: order.shipment_date ?? null,
    reference_number: order.reference_number ?? null,
    quantity: order.quantity ?? null,
    quantity_invoiced: order.quantity_invoiced ?? null,
    quantity_packed: order.quantity_packed ?? null,
    quantity_shipped: order.quantity_shipped ?? null,
    currency: order.currency_code ?? null,
    total: order.total ?? null,
    sales_channel: order.sales_channel ?? null,
    is_backorder: order.is_backorder ?? null,
    is_drop_shipment: order.is_drop_shipment ?? null,
    created_at: order.created_time ?? null,
    updated_at: order.last_modified_time ?? null,
  };
}

export function registerSalesOrderTools(server: McpServer): void {
  server.registerTool(
    "list_sales_orders",
    {
      title: "List Sales Orders",
      description:
        "List sales orders from the authenticated Zoho Inventory organization. " +
        "Results are paginated and read-only.",
      inputSchema: z.object({
        page: z.number().int().min(1).default(1),
        perPage: z.number().int().min(1).max(200).default(50),
      }),
    },
    async ({ page, perPage }) => {
      const result = await listSalesOrders({ page, perPage });
      const output = {
        orders: result.salesorders.map(toAgentSalesOrder),
        pagination: toPagination(result.page_context, page, perPage),
      };

      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    },
  );

  server.registerTool(
    "search_sales_orders",
    {
      title: "Search Sales Orders",
      description:
        "Find sales orders by customer name, order number, or reference number. " +
        "Zoho provides a paginated list endpoint, not a dedicated search endpoint; " +
        "this tool filters the requested page of orders.",
      inputSchema: z.object({
        query: z
          .string()
          .min(1)
          .max(100)
          .describe("Customer name, sales order number, or reference number."),
        page: z.number().int().min(1).default(1),
        perPage: z.number().int().min(1).max(200).default(50),
      }),
    },
    async ({ query, page, perPage }) => {
      const result = await listSalesOrders({ page, perPage });
      const normalizedQuery = query.toLowerCase();
      const matches = result.salesorders.filter((order) =>
        [order.customer_name, order.salesorder_number, order.reference_number]
          .some((value) => value?.toLowerCase().includes(normalizedQuery)),
      );
      const output = {
        query,
        orders: matches.map(toAgentSalesOrder),
        pagination: toPagination(result.page_context, page, perPage),
      };

      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    },
  );

  server.registerTool(
    "get_sales_order",
    {
      title: "Get Sales Order",
      description:
        "Retrieve detailed information about one sales order by its Zoho Inventory ID.",
      inputSchema: z.object({
        salesOrderId: z.string().min(1).describe("Zoho Inventory sales order ID."),
      }),
    },
    async ({ salesOrderId }) => {
      const result = await getSalesOrder(salesOrderId);
      const order = result.salesorder;
      const output = {
        order: {
          ...toAgentSalesOrder(order),
          line_items:
            order.line_items?.map((item) => ({
              item_id: item.item_id ? String(item.item_id) : null,
              line_item_id: item.line_item_id ? String(item.line_item_id) : null,
              name: item.name ?? null,
              quantity: item.quantity ?? null,
              rate: item.rate ?? null,
              item_total: item.item_total ?? null,
              unit: item.unit ?? null,
            })) ?? [],
        },
      };

      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    },
  );
}
