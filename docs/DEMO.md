# Demo Run Sheet

**Target length:** 3-5 minutes

## Before Recording

- Start the local Express server with `npm run dev`.
- Confirm the local OAuth callback previously created `.data/tokens.json`.
- Start Inspector with `npx @modelcontextprotocol/inspector npx tsx src/mcp/server.ts` and connect to the stdio server.
- Confirm the demo organization contains the fictional demo items, `Demo Customer One`, and its sales orders.
- Keep `.env`, `.data/tokens.json`, Inspector auth tokens, and real account details out of the recording.

## Business Workflow

**Opening prompt:** “Help me investigate Demo Customer One's recent activity.”

1. Call `search_contacts` with `query: "Demo Customer One"`. Show that the contact is found; avoid exposing email or phone fields.
2. Call `get_contact` with the returned contact ID. Show identity and account context, not private contact fields.
3. Call `search_sales_orders` with `query: "Demo Customer One"`. Explain that this connector filters the requested page from Zoho's list endpoint.
4. Call `get_sales_order` with an order ID from the results. Show order status and line items.
5. Call `get_item` for one item from the order. Compare `stock_on_hand` with `reorder_level` and explain whether it is low.
6. Summarize the customer/order/inventory context in one merchant-facing response. Do not imply that the tools mutate Zoho data.

Use current live records and re-check quantities before recording. The demo organization is expected to contain fictional orders and products, but totals and stock may change.

## Engineering Reliability

Briefly show the automated tests for two paths without disrupting the live account:

- An expired access token triggers a refresh-token request, then the API request succeeds.
- A 429 response honors `Retry-After` when supplied, retries within the configured bound, and fails with a typed rate-limit error if retries are exhausted.

Run `npm test -- --run` and `npm run typecheck` before recording. Tests use mocked responses and do not require live Zoho calls.
