# Limitations

## Read-only

The connector cannot:

- Create records.
- Update records.
- Delete records.
- Send messages.
- Approve orders.
- Modify inventory.

Only list, search, and get tools are exposed. The OAuth scopes are read-only.

## Pagination

List and search tools return the requested page and expose `has_more`. They do not automatically fetch the entire dataset. A reusable async pagination iterator is available for consumers that explicitly need multi-page traversal.

## Search

Search behavior depends on Zoho's upstream searchable fields. Item `search_text` may match content beyond item name and SKU. Sales-order search is a connector-side filter over one requested page, so a match on a later page requires requesting that page. Contact search delegates to Zoho's `search_text` behavior.

## Token Storage

The local token store persists credentials as plaintext in `.data/tokens.json`. It is gitignored and intended only for development/demo use. Production should use encrypted, tenant-scoped credential storage, such as a KMS-backed secret store and an appropriately protected database.

## Tenant Scope

Requests use the `ZOHO_ORGANIZATION_ID` configured for the authenticated Zoho account. The connector does not provide cross-organization discovery or tenant switching in the MCP tools.

## Runtime State

OAuth state is held in process memory. Start the Express OAuth server as one local process and complete the callback in the same process. Access tokens are refreshed automatically when expired or after a 401; if refresh fails, the user must reauthorize.

## Data

The demo scenario uses fictional merchant products, customers, and sales orders. Do not use real customer data in demo fixtures, screenshots, recordings, or sample outputs.
