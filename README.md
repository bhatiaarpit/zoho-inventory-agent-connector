# Zoho Inventory Agent Connector

A read-only MCP connector that enables an AI agent to securely access inventory, sales orders, and contacts from Zoho Inventory.

## Features

- Zoho OAuth 2.0 authorization-code authentication with offline refresh tokens.
- Persistent local token storage for development.
- Nine read-only MCP tools for items, sales orders, and contacts.
- Shared async pagination iterator; tools return one requested page.
- 401 refresh/retry handling and bounded 429 retries.
- Sanitized typed API errors.
- Zod-validated tool inputs and structured outputs.
- Automated tests for authentication, errors, pagination, and MCP handlers.

## Architecture

The MCP stdio server calls resource-specific wrappers, which use the shared Zoho client for organization-scoped HTTP requests and token refresh. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the component and security overview.

## Setup

Requirements: Node.js 20+ and npm. The MCP Inspector currently requires Node.js 22.19+.

Install dependencies:

```sh
npm install
```

Create a local environment file:

```sh
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

## Environment Variables

Set the OAuth client values in `.env` and confirm the callback URL matches the URL registered in Zoho:

```text
ZOHO_CLIENT_ID=
ZOHO_CLIENT_SECRET=
ZOHO_REDIRECT_URI=http://localhost:3000/oauth/callback
```

The example uses Zoho's India data center. Set `ZOHO_ACCOUNTS_BASE_URL` and `ZOHO_API_BASE_URL` for the data center of your Zoho organization. After OAuth, set the organization identifier returned by Zoho:

```text
ZOHO_ORGANIZATION_ID=
```

Never paste `.env` or `.data/tokens.json` into logs, issues, or chat. Both are excluded from Git.

## Zoho OAuth Setup

Start the local callback server:

```sh
npm run dev
```

Check `http://localhost:3000/health`, then open `http://localhost:3000/oauth/start` and complete Zoho consent. The callback stores the access and refresh tokens in `.data/tokens.json` and lists available organizations. Copy the intended `organization_id` into `.env`, then restart the server so the setting is loaded.

The requested OAuth scopes are read-only:

- `ZohoInventory.settings.READ`
- `ZohoInventory.items.READ`
- `ZohoInventory.salesorders.READ`
- `ZohoInventory.contacts.READ`

## Running the MCP Server

In a separate terminal, start the MCP stdio process:

```sh
npm run mcp
```

Configure an MCP-compatible client to launch `npm run mcp` from the project directory. The server waits for MCP JSON-RPC over stdin/stdout; startup diagnostics go to stderr.

## MCP Inspector

With Node.js 22.19+, launch the Inspector against the local server:

```sh
npx @modelcontextprotocol/inspector npx tsx src/mcp/server.ts
```

Connect to the stdio server and use `tools/list` or the Inspector's Tools panel to call the tools. Keep the Inspector's local auth token private.

## Available Tools

| Tool | Purpose | Upstream operation |
| --- | --- | --- |
| `list_items` | Browse one page of inventory | `GET /items` |
| `search_items` | Search Zoho's searchable item text | `GET /items` with `search_text` |
| `get_item` | Retrieve one item | `GET /items/{item_id}` |
| `list_sales_orders` | Browse one page of orders | `GET /salesorders` |
| `search_sales_orders` | Filter a requested order page | `GET /salesorders` plus connector-side filtering |
| `get_sales_order` | Retrieve an order and line items | `GET /salesorders/{salesorder_id}` |
| `list_contacts` | Browse one page of contacts | `GET /contacts` |
| `search_contacts` | Search Zoho's searchable contact text | `GET /contacts` with `search_text` |
| `get_contact` | Retrieve one contact | `GET /contacts/{contact_id}` |

Full input, output, scope, and side-effect details are in [docs/MCP_SPEC.md](docs/MCP_SPEC.md).

## Example Queries

- “Find products matching USB.”
- “Show active inventory items on page 1.”
- “Find sales orders for Demo Customer One.”
- “Look up the contact Demo Customer One.”
- “Check the stock and reorder level for this item.”

## Pagination

List and search tools return a single requested page and expose `has_more`. The connector also provides a reusable async pagination iterator for consumers that explicitly need multi-page traversal. It does not automatically aggregate the entire dataset. Sales-order search filters only the requested page because Zoho's upstream API provides list/get endpoints rather than a dedicated search endpoint.

## Testing

```sh
npm run typecheck
npm test -- --run
```

Tests mock Zoho responses and do not require live OAuth credentials.

## Security

The MCP server is read-only: it cannot create, update, delete, send, approve, or otherwise mutate merchant data. OAuth uses read-only Zoho scopes. `.env` and `.data/` are gitignored. The development token store is plaintext and is not suitable for production; see [docs/LIMITATIONS.md](docs/LIMITATIONS.md).

## Limitations

The local token store and in-memory OAuth state are for development/demo use. Search and page coverage depend on Zoho's APIs; tools do not automatically traverse all pages. Read [docs/LIMITATIONS.md](docs/LIMITATIONS.md) before deploying or interpreting results.
