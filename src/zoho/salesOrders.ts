import { zohoRequest } from "./client.js";

export interface SalesOrder {
  salesorder_id: string | number;
  salesorder_number: string;
  customer_id?: string | number;
  customer_name?: string;
  status?: string;
  date?: string;
  shipment_date?: string;
  reference_number?: string;
  quantity?: number;
  quantity_invoiced?: number;
  quantity_packed?: number;
  quantity_shipped?: number;
  currency_code?: string;
  total?: number;
  created_time?: string;
  last_modified_time?: string;
  is_emailed?: boolean;
  is_drop_shipment?: boolean;
  is_backorder?: boolean;
  sales_channel?: string;
}

export interface ListSalesOrdersResponse {
  code: number;
  message: string;
  salesorders: SalesOrder[];
  page_context?: {
    page: number;
    per_page: number;
    has_more_page: boolean;
  };
}

export interface GetSalesOrderResponse {
  code: number;
  message: string;
  salesorder: SalesOrder & {
    line_items?: Array<{
      item_id?: string | number;
      line_item_id?: string | number;
      name?: string;
      quantity?: number;
      rate?: number;
      item_total?: number;
      unit?: string;
    }>;
  };
}

export interface ListSalesOrdersParams {
  page?: number;
  perPage?: number;
}

export async function listSalesOrders(
  params: ListSalesOrdersParams = {},
): Promise<ListSalesOrdersResponse> {
  return zohoRequest<ListSalesOrdersResponse>(
    "salesorders",
    { method: "GET" },
    {
      page: params.page ?? 1,
      per_page: params.perPage ?? 50,
    },
  );
}

export async function getSalesOrder(
  salesOrderId: string,
): Promise<GetSalesOrderResponse> {
  return zohoRequest<GetSalesOrderResponse>(
    `salesorders/${encodeURIComponent(salesOrderId)}`,
    { method: "GET" },
  );
}
