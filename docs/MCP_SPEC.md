# MCP Tool Specification

All tools are read-only. Inputs are Zod-validated and outputs are focused structured content. List and search operations return one requested page; pagination metadata includes `has_more`. The reusable pagination iterator is available to consumers that explicitly need multi-page traversal.

| Tool | Resource | Operation | Side effects |
| --- | --- | --- | --- |
| `list_items` | Items | Read | None |
| `search_items` | Items | Read | None |
| `get_item` | Items | Read | None |
| `list_sales_orders` | Sales orders | Read | None |
| `search_sales_orders` | Sales orders | Read | None |
| `get_sales_order` | Sales orders | Read | None |
| `list_contacts` | Contacts | Read | None |
| `search_contacts` | Contacts | Read | None |
| `get_contact` | Contacts | Read | None |

## Inventory

### `list_items`

- **Purpose:** List inventory items, optionally filtered by status.
- **Input:** `page` (integer, default 1), `perPage` (integer 1-200, default 50), `status` (`active` or `inactive`, optional).
- **Upstream:** `GET /items`
- **Scope:** `ZohoInventory.items.READ`
- **Side effects:** None.
- **Output:** Focused item fields and pagination (`page`, `per_page`, `has_more`).

### `search_items`

- **Purpose:** Search Zoho's searchable item text. Upstream `search_text` can match text beyond name and SKU.
- **Input:** `query` (1-200 characters), `page` (integer, default 1), `perPage` (integer 1-100, default 50).
- **Upstream:** `GET /items` with `search_text`.
- **Scope:** `ZohoInventory.items.READ`
- **Side effects:** None.
- **Output:** Matching focused item fields and pagination.

### `get_item`

- **Purpose:** Retrieve one inventory item.
- **Input:** `itemId` (non-empty string).
- **Upstream:** `GET /items/{item_id}`
- **Scope:** `ZohoInventory.items.READ`
- **Side effects:** None.
- **Output:** Focused item details, including stock, reorder level, and locations when returned by Zoho.

## Sales Orders

### `list_sales_orders`

- **Purpose:** List sales orders.
- **Input:** `page` (integer, default 1), `perPage` (integer 1-200, default 50).
- **Upstream:** `GET /salesorders`
- **Scope:** `ZohoInventory.salesorders.READ`
- **Side effects:** None.
- **Output:** Focused order fields and pagination.

### `search_sales_orders`

- **Purpose:** Find orders by customer name, order number, or reference number.
- **Input:** `query` (1-100 characters), `page` (integer, default 1), `perPage` (integer 1-200, default 50).
- **Upstream:** `GET /salesorders`; connector filters the returned page locally. Zoho's list/get API is not represented as a native search endpoint here.
- **Scope:** `ZohoInventory.salesorders.READ`
- **Side effects:** None.
- **Output:** Matching focused order fields and pagination for the fetched page.

### `get_sales_order`

- **Purpose:** Retrieve one sales order and its line items.
- **Input:** `salesOrderId` (non-empty string).
- **Upstream:** `GET /salesorders/{salesorder_id}`
- **Scope:** `ZohoInventory.salesorders.READ`
- **Side effects:** None.
- **Output:** Focused order details and line-item summaries.

## Contacts

### `list_contacts`

- **Purpose:** List contacts, optionally filtered by Zoho status.
- **Input:** `page` (integer, default 1), `perPage` (integer 1-200, default 50), `status` (optional string).
- **Upstream:** `GET /contacts`
- **Scope:** `ZohoInventory.contacts.READ`
- **Side effects:** None.
- **Output:** Focused contact fields and pagination.

### `search_contacts`

- **Purpose:** Search contacts using Zoho's searchable contact text, which can include name, company, email, and phone.
- **Input:** `query` (1-100 characters), `page` (integer, default 1), `perPage` (integer 1-200, default 50).
- **Upstream:** `GET /contacts` with `search_text`.
- **Scope:** `ZohoInventory.contacts.READ`
- **Side effects:** None.
- **Output:** Focused contact fields and pagination.

### `get_contact`

- **Purpose:** Retrieve one contact by ID.
- **Input:** `contactId` (non-empty string).
- **Upstream:** `GET /contacts/{contact_id}`
- **Scope:** `ZohoInventory.contacts.READ`
- **Side effects:** None.
- **Output:** Focused contact details. Contact responses may include email and phone fields when present in Zoho.
