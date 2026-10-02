# Zoho Inventory Agent Connector

A local, read-only Zoho Inventory connector scaffold. The current app provides a health check, a Zoho OAuth authorization-code flow, and an organization lookup. MCP tools are not wired up yet.

## Requirements

- Node.js with npm
- A Zoho OAuth client configured with the local callback URL

## Setup

Install dependencies:

```sh
npm install
```

Create a local environment file from the example:

```sh
cp .env.example .env
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

Set `ZOHO_CLIENT_ID` and `ZOHO_CLIENT_SECRET` in `.env`. The configured redirect URI must match the redirect URI registered for the Zoho OAuth client:

```text
http://localhost:3000/oauth/callback
```

The example uses Zoho's India endpoints. Change the accounts and API base URLs if your Zoho account is in another data center. Never commit `.env`; it is excluded by `.gitignore`.

## Run

Start the development server:

```sh
npm run dev
```

The server listens on `http://localhost:3000` by default. Set `PORT` in `.env` to use a different port.

Check that the server is running:

```text
GET http://localhost:3000/health
```

Start OAuth by opening this URL in a browser:

```text
http://localhost:3000/oauth/start
```

After signing in to Zoho and accepting consent, Zoho redirects to `/oauth/callback`. The callback exchanges the authorization code, stores the returned tokens in memory, and requests the available organizations. A successful response includes the organization list and IDs.

The requested read-only scopes are:

- `ZohoInventory.settings.READ`
- `ZohoInventory.items.READ`
- `ZohoInventory.salesorders.READ`
- `ZohoInventory.contacts.READ`

## Verify Organizations

The standalone organization check reads `ZOHO_ACCESS_TOKEN` from `.env` and calls `GET /organizations` using the `Zoho-oauthtoken` authorization scheme:

```sh
npm run verify:organization
```

It prints each organization name and ID. Set `ZOHO_ORGANIZATION_ID` in `.env` to the ID you want to use for subsequent Inventory API requests.

## Development Commands

```sh
npm run typecheck
npm test
npm run test:watch
```

## Current Limitations

- Access and refresh tokens are stored only in memory by the running process; restarting the server loses them. Persistent encrypted token storage and automatic refresh are not implemented.
- OAuth state is also held in memory, so this flow is intended for a single local development process.
- `verify:organization` uses the access token from `.env`; the OAuth callback's in-memory token is not written to `.env`.
- The current scaffold does not yet expose MCP tools or use `ZOHO_ORGANIZATION_ID` in API requests.
