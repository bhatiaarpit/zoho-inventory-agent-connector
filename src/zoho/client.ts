import "dotenv/config";
import { refreshAccessToken } from "../auth/oauth.js";
import {
  ZohoApiError,
  ZohoAuthenticationError,
  ZohoNotFoundError,
  ZohoRateLimitError,
} from "./errors.js";
import {
  getTokens,
  hasValidAccessToken,
  setTokens,
} from "../auth/tokenStore.js";

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

const apiBaseUrl = requiredEnv("ZOHO_API_BASE_URL");

function buildUrl(
  path: string,
  params?: Record<string, string | number | undefined>,
): URL {
  const normalizedBase = `${apiBaseUrl.replace(/\/+$/, "")}/`;
  const normalizedPath = path.replace(/^\/+/, "");
  const url = new URL(normalizedPath, normalizedBase);
  const organizationId = process.env.ZOHO_ORGANIZATION_ID?.trim();

  if (organizationId) {
    url.searchParams.set("organization_id", organizationId);
  } else if (normalizedPath !== "organizations") {
    throw new Error("ZOHO_ORGANIZATION_ID is not configured");
  }

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

async function refreshTokens(): Promise<string> {
  const tokens = getTokens();

  if (!tokens?.refreshToken) {
    throw new ZohoAuthenticationError(
      "Zoho authentication required. Visit /oauth/start.",
    );
  }

  try {
    const refreshed = await refreshAccessToken(tokens.refreshToken);
    const refreshToken = refreshed.refresh_token ?? tokens.refreshToken;

    setTokens({
      accessToken: refreshed.access_token,
      refreshToken,
      expiresAt: Date.now() + refreshed.expires_in * 1000,
    });

    return refreshed.access_token;
  } catch (error) {
    if (error instanceof ZohoAuthenticationError) {
      throw error;
    }

    throw new ZohoAuthenticationError(
      "Zoho access token could not be refreshed.",
      401,
      undefined,
      { cause: error },
    );
  }
}

async function ensureAccessToken(): Promise<string> {
  if (hasValidAccessToken()) {
    const tokens = getTokens();

    if (tokens) {
      return tokens.accessToken;
    }
  }

  return refreshTokens();
}

function getRetryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");

  if (retryAfter) {
    const seconds = Number(retryAfter);

    if (Number.isFinite(seconds)) {
      return Math.min(Math.max(seconds, 0) * 1000, 10_000);
    }

    const retryAt = Date.parse(retryAfter);

    if (!Number.isNaN(retryAt)) {
      return Math.min(Math.max(retryAt - Date.now(), 0), 10_000);
    }
  }

  return Math.min(500 * 2 ** attempt, 5_000);
}

function parseBody(text: string, status: number): unknown {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new ZohoApiError(
      "Zoho returned a malformed JSON response.",
      status,
    );
  }
}

function getZohoCode(body: unknown): number | string | undefined {
  if (typeof body !== "object" || body === null || !("code" in body)) {
    return undefined;
  }

  return typeof body.code === "number" || typeof body.code === "string"
    ? body.code
    : undefined;
}

function isZohoFailureCode(code: number | string | undefined): boolean {
  return code !== undefined && code !== 0 && code !== "0" && code !== "success";
}

function requestHeaders(options: RequestInit, accessToken: string): Headers {
  const headers = new Headers(options.headers);
  headers.set("Accept", headers.get("Accept") ?? "application/json");
  headers.set("Authorization", `Zoho-oauthtoken ${accessToken}`);
  return headers;
}

interface RetryState {
  authenticationRetried: boolean;
  rateLimitRetries: number;
}

const MAX_RATE_LIMIT_RETRIES = 3;

async function requestWithRetries<T>(
  path: string,
  options: RequestInit,
  params: Record<string, string | number | undefined> | undefined,
  state: RetryState,
  accessToken?: string,
): Promise<T> {
  const url = buildUrl(path, params);
  const token = accessToken ?? await ensureAccessToken();
  const response = await fetch(url, {
    ...options,
    headers: requestHeaders(options, token),
  });

  if (response.status === 429) {
    const delayMs = getRetryDelay(response, state.rateLimitRetries);

    if (state.rateLimitRetries < MAX_RATE_LIMIT_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return requestWithRetries<T>(path, options, params, {
        ...state,
        rateLimitRetries: state.rateLimitRetries + 1,
      });
    }

    throw new ZohoRateLimitError(
      "Zoho rate limit exceeded after retries.",
      429,
      delayMs,
    );
  }

  if (response.status === 401) {
    if (!state.authenticationRetried) {
      const refreshedToken = await refreshTokens();
      return requestWithRetries<T>(
        path,
        options,
        params,
        { ...state, authenticationRetried: true },
        refreshedToken,
      );
    }

    throw new ZohoAuthenticationError(
      "Zoho authentication failed after token refresh.",
      401,
    );
  }

  if (response.status === 404) {
    throw new ZohoNotFoundError("The requested Zoho record was not found.", 404);
  }

  if (!response.ok) {
    throw new ZohoApiError(
      `Zoho API request failed with HTTP ${response.status}.`,
      response.status,
    );
  }

  const body = parseBody(await response.text(), response.status);
  const zohoCode = getZohoCode(body);

  if (isZohoFailureCode(zohoCode)) {
    throw new ZohoApiError("Zoho returned an API error.", response.status, zohoCode);
  }

  return body as T;
}

export async function zohoRequest<T>(
  path: string,
  options: RequestInit = {},
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  return requestWithRetries<T>(path, options, params, {
    authenticationRetried: false,
    rateLimitRetries: 0,
  });
}
