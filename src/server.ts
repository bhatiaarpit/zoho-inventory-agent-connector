import "dotenv/config";
import express from "express";

import {
  createAuthorizationUrl,
  exchangeCodeForTokens,
  validateState,
} from "./auth/oauth.js";

import { setTokens } from "./auth/tokenStore.js";
import { listItems } from "./zoho/items.js";
import { listOrganizations } from "./zoho/organizations.js";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "zoho-inventory-agent-connector",
  });
});

app.get("/oauth/start", (_req, res) => {
  const authorizationUrl = createAuthorizationUrl();

  res.redirect(authorizationUrl);
});

app.get("/oauth/callback", async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      return res.status(400).json({
        error,
        error_description,
      });
    }

    if (typeof code !== "string" || typeof state !== "string") {
      return res.status(400).json({
        error: "Missing OAuth code or state",
      });
    }

    if (!validateState(state)) {
      return res.status(400).json({
        error: "Invalid OAuth state",
      });
    }

    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.refresh_token) {
      throw new Error("Zoho did not return a refresh token");
    }

    setTokens({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + Number(tokens.expires_in) * 1000,
    });

    const organizations = await listOrganizations();

    return res.json({
      message: "Zoho authentication successful",
      organizations: organizations.organizations,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "OAuth authentication failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.get("/api/items", async (req, res) => {
  try {
    const result = await listItems({
      page: Number(req.query.page) || 1,
      perPage: Number(req.query.per_page) || 50,
      searchText:
        typeof req.query.search_text === "string"
          ? req.query.search_text
          : undefined,
    });

    return res.json(result);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Failed to fetch Zoho Inventory items",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
