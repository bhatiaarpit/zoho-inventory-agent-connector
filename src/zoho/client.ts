import "dotenv/config";
import { getTokens } from "../auth/tokenStore.js";

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

const apiBaseUrl = requiredEnv("ZOHO_API_BASE_URL");

export async function zohoRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const tokens = getTokens();

  if (!tokens?.accessToken) {
    throw new Error("Zoho authentication required");
  }

  const baseUrl = `${apiBaseUrl.replace(/\/+$/, "")}/`;
  const url = new URL(path.replace(/^\/+/, ""), baseUrl);
  const headers = new Headers(options.headers);
  headers.set("Accept", headers.get("Accept") ?? "application/json");
  headers.set("Authorization", `Zoho-oauthtoken ${tokens.accessToken}`);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(
      `Zoho API error ${response.status}: ${JSON.stringify(body)}`,
    );
  }

  return body as T;
}
