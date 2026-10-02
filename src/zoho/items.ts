import { zohoRequest } from "./client.js";

export type ZohoLocation = {
  location_id: string;
  location_name: string;
  status?: string;
  is_primary?: boolean;
  location_stock_on_hand?: string;
  location_available_stock?: string;
  location_actual_available_stock?: string;
};

export type InventoryItem = {
  item_id: string;
  name: string;
  sku?: string;
  status?: string;
  item_type?: string;
  product_type?: string;
  rate?: number;
  purchase_rate?: number;
  reorder_level?: number;
  stock_on_hand?: number;
  track_inventory?: boolean;
  can_be_sold?: boolean;
  can_be_purchased?: boolean;
  unit?: string;
  description?: string;
  locations?: ZohoLocation[];
};

export type ListItemsParams = {
  page?: number;
  perPage?: number;
  searchText?: string;
  filterBy?: string;
  status?: "active" | "inactive";
  name?: string;
  nameStartsWith?: string;
  nameContains?: string;
  sku?: string;
  skuStartsWith?: string;
  skuContains?: string;
  sortColumn?: string;
  sortOrder?: "A" | "D";
};

export type ItemPageContext = {
  page: number;
  per_page: number;
  has_more_page: boolean;
  report_name?: string;
  applied_filter?: string;
  sort_column?: string;
  sort_order?: string;
};

export type ListItemsResponse = {
  code: number;
  message: string;
  items: InventoryItem[];
  page_context?: ItemPageContext;
};

export type GetItemResponse = {
  code: number;
  message: string;
  item: InventoryItem;
};

export async function listItems(
  params: ListItemsParams = {},
): Promise<ListItemsResponse> {
  return zohoRequest<ListItemsResponse>(
    "items",
    { method: "GET" },
    {
      page: params.page ?? 1,
      per_page: params.perPage ?? 50,
      search_text: params.searchText,
      filter_by: params.filterBy,
      status: params.status,
      name: params.name,
      name_startswith: params.nameStartsWith,
      name_contains: params.nameContains,
      sku: params.sku,
      sku_startswith: params.skuStartsWith,
      sku_contains: params.skuContains,
      sort_column: params.sortColumn,
      sort_order: params.sortOrder,
    },
  );
}

export async function getItem(itemId: string): Promise<GetItemResponse> {
  return zohoRequest<GetItemResponse>(
    `items/${encodeURIComponent(itemId)}`,
    { method: "GET" },
  );
}