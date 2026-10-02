import crypto from "node:crypto";
import "dotenv/config";
import { ZohoAuthenticationError } from "../zoho/errors.js";

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing Zoho OAuth environment variable: ${name}`);
  }

  return value;
}

const clientId = requiredEnv("ZOHO_CLIENT_ID");
const clientSecret = requiredEnv("ZOHO_CLIENT_SECRET");
const redirectUri = requiredEnv("ZOHO_REDIRECT_URI");
const accountsBaseUrl = requiredEnv("ZOHO_ACCOUNTS_BASE_URL");

export const ZOHO_SCOPES = [
  "ZohoInventory.settings.READ",
  "ZohoInventory.items.READ",
  "ZohoInventory.salesorders.READ",
  "ZohoInventory.contacts.READ",
];

const states = new Set<string>();

export function createAuthorizationUrl(): string {
  const state = crypto.randomBytes(32).toString("hex");

  states.add(state);

  const params = new URLSearchParams({
    scope: ZOHO_SCOPES.join(","),
    client_id: clientId,
    state,
    response_type: "code",
    redirect_uri: redirectUri,
    access_type: "offline",
    prompt: "consent",
  });

  return `${accountsBaseUrl.replace(/\/+$/, "")}/oauth/v2/auth?${params.toString()}`;
}

export function validateState(state: string): boolean {
  if (!states.has(state)) {
    return false;
  }

  states.delete(state);
  return true;
}

export interface ZohoTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

async function tokenRequest(params: URLSearchParams): Promise<ZohoTokenResponse> {
  const response = await fetch(
    `${accountsBaseUrl.replace(/\/+$/, "")}/oauth/v2/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    },
  );

  let body: unknown;

  try {
    body = await response.json();
  } catch (error) {
    throw new ZohoAuthenticationError(
      "Zoho returned a malformed OAuth response.",
      response.status,
      undefined,
      { cause: error },
    );
  }

  if (!response.ok) {
    const errorCode =
      typeof body === "object" && body !== null &&
      "error" in body && typeof body.error === "string"
        ? body.error
        : undefined;
    throw new ZohoAuthenticationError(
      "Zoho token request failed.",
      response.status,
      errorCode,
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("access_token" in body) ||
    typeof body.access_token !== "string" ||
    !("expires_in" in body) ||
    typeof body.expires_in !== "number"
  ) {
    throw new ZohoAuthenticationError(
      "Zoho returned an invalid token response.",
      response.status,
    );
  }

  return {
    access_token: body.access_token,
    refresh_token:
      "refresh_token" in body && typeof body.refresh_token === "string"
        ? body.refresh_token
        : undefined,
    expires_in: body.expires_in,
  };
}

  export async function exchangeCodeForTokens(
    code: string,
  ): Promise<ZohoTokenResponse> {
    const params = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    return tokenRequest(params);
  }

  export async function refreshAccessToken(
    refreshToken: string,
  ): Promise<ZohoTokenResponse> {
    const params = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    });

    return tokenRequest(params);
  }
