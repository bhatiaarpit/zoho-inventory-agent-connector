import { afterEach, describe, expect, it, vi } from "vitest";

type StoredTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

let storedTokens: StoredTokens | null;

async function loadClient() {
  vi.resetModules();
  vi.stubEnv("ZOHO_CLIENT_ID", "test-client-id");
  vi.stubEnv("ZOHO_CLIENT_SECRET", "test-client-secret");
  vi.stubEnv("ZOHO_REDIRECT_URI", "http://localhost:3000/oauth/callback");
  vi.stubEnv("ZOHO_ACCOUNTS_BASE_URL", "https://accounts.zoho.in");
  vi.stubEnv("ZOHO_API_BASE_URL", "https://www.zohoapis.in/inventory/v1");
  vi.stubEnv("ZOHO_ORGANIZATION_ID", "test-organization");

  vi.doMock("../src/auth/tokenStore.js", () => ({
    getTokens: () => storedTokens,
    hasValidAccessToken: () =>
      storedTokens !== null && Date.now() < storedTokens.expiresAt - 60_000,
    setTokens: (tokens: StoredTokens) => {
      storedTokens = tokens;
    },
  }));

  return import("../src/zoho/client.js");
}

afterEach(() => {
  vi.useRealTimers();
  vi.doUnmock("../src/auth/tokenStore.js");
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.restoreAllMocks();
});

describe("zohoRequest", () => {
  it("preserves the Inventory API path and adds the organization ID", async () => {
    storedTokens = {
      accessToken: "test-access-token",
      refreshToken: "test-refresh-token",
      expiresAt: Date.now() + 3_600_000,
    };
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify({ items: [] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { zohoRequest } = await loadClient();
    await zohoRequest("/items", { method: "GET" }, { page: 2 });

    const [requestUrl, requestOptions] = fetchMock.mock.calls[0];
    const url = new URL(String(requestUrl));

    expect(url.origin).toBe("https://www.zohoapis.in");
    expect(url.pathname).toBe("/inventory/v1/items");
    expect(url.searchParams.get("organization_id")).toBe("test-organization");
    expect(url.searchParams.get("page")).toBe("2");
    expect(new Headers(requestOptions?.headers).get("authorization")).toBe(
      "Zoho-oauthtoken test-access-token",
    );
  });

  it("refreshes an expired token and retries a rate-limited request", async () => {
    storedTokens = {
      accessToken: "expired-access-token",
      refreshToken: "test-refresh-token",
      expiresAt: Date.now() - 1,
    };
    let itemRequests = 0;
    let refreshRequestBody: URLSearchParams | undefined;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));

      if (url.pathname.endsWith("/oauth/v2/token")) {
        refreshRequestBody = new URLSearchParams(String(init?.body));
        return new Response(
          JSON.stringify({ access_token: "refreshed-access-token", expires_in: 3600 }),
          { status: 200 },
        );
      }

      itemRequests += 1;

      if (itemRequests === 1) {
        return new Response("{}", {
          status: 429,
          headers: { "retry-after": "0" },
        });
      }

      return new Response(JSON.stringify({ items: [] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { zohoRequest } = await loadClient();
    await zohoRequest("items");

    expect(itemRequests).toBe(2);
    expect(refreshRequestBody?.get("grant_type")).toBe("refresh_token");
    expect(refreshRequestBody?.get("refresh_token")).toBe("test-refresh-token");
    expect(storedTokens?.accessToken).toBe("refreshed-access-token");
    expect(storedTokens?.refreshToken).toBe("test-refresh-token");
  });

  it("refreshes once after a 401 and retries the API request", async () => {
    storedTokens = {
      accessToken: "rejected-access-token",
      refreshToken: "test-refresh-token",
      expiresAt: Date.now() + 3_600_000,
    };
    let itemRequests = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));

      if (url.pathname.endsWith("/oauth/v2/token")) {
        return new Response(
          JSON.stringify({ access_token: "refreshed-access-token", expires_in: 3600 }),
          { status: 200 },
        );
      }

      itemRequests += 1;
      return itemRequests === 1
        ? new Response("{}", { status: 401 })
        : new Response(JSON.stringify({ items: [] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { zohoRequest } = await loadClient();
    await zohoRequest("items");

    expect(itemRequests).toBe(2);
    expect(storedTokens?.accessToken).toBe("refreshed-access-token");
  });

  it("returns a sanitized authentication error when refresh fails", async () => {
    storedTokens = {
      accessToken: "expired-access-token",
      refreshToken: "test-refresh-token",
      expiresAt: Date.now() - 1,
    };
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          error: "invalid_grant",
          error_description: "sensitive provider detail",
        }),
        { status: 400 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { zohoRequest } = await loadClient();
    const { ZohoAuthenticationError } = await import("../src/zoho/errors.js");
    const error = await zohoRequest("items").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ZohoAuthenticationError);
    expect((error as Error).message).toBe("Zoho token request failed.");
    expect((error as Error).message).not.toContain("sensitive provider detail");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses exponential backoff when Retry-After is absent", async () => {
    vi.useFakeTimers();
    storedTokens = {
      accessToken: "test-access-token",
      refreshToken: "test-refresh-token",
      expiresAt: Date.now() + 3_600_000,
    };
    let itemRequests = 0;
    const fetchMock = vi.fn(async () => {
      itemRequests += 1;
      return itemRequests === 1
        ? new Response("{}", { status: 429 })
        : new Response(JSON.stringify({ items: [] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { zohoRequest } = await loadClient();
    const request = zohoRequest("items");
    await vi.advanceTimersByTimeAsync(500);
    await request;

    expect(itemRequests).toBe(2);
  });

  it("stops after three retries for repeated 429 responses", async () => {
    storedTokens = {
      accessToken: "test-access-token",
      refreshToken: "test-refresh-token",
      expiresAt: Date.now() + 3_600_000,
    };
    const fetchMock = vi.fn(async () =>
      new Response("{}", { status: 429, headers: { "retry-after": "0" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { zohoRequest } = await loadClient();
    const { ZohoRateLimitError } = await import("../src/zoho/errors.js");
    const error = await zohoRequest("items").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ZohoRateLimitError);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect((error as Error).message).not.toContain("{}");
  });

  it("maps 404 responses to ZohoNotFoundError without exposing the body", async () => {
    storedTokens = {
      accessToken: "test-access-token",
      refreshToken: "test-refresh-token",
      expiresAt: Date.now() + 3_600_000,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ message: "private provider detail" }), {
          status: 404,
        }),
      ),
    );

    const { zohoRequest } = await loadClient();
    const { ZohoNotFoundError } = await import("../src/zoho/errors.js");
    const error = await zohoRequest("items/missing").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ZohoNotFoundError);
    expect((error as Error).message).toBe("The requested Zoho record was not found.");
    expect((error as Error).message).not.toContain("private provider detail");
  });

  it("maps malformed successful responses to ZohoApiError", async () => {
    storedTokens = {
      accessToken: "test-access-token",
      refreshToken: "test-refresh-token",
      expiresAt: Date.now() + 3_600_000,
    };
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not-json", { status: 200 })));

    const { zohoRequest } = await loadClient();
    const { ZohoApiError } = await import("../src/zoho/errors.js");
    const error = await zohoRequest("items").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ZohoApiError);
    expect((error as { status?: number }).status).toBe(200);
    expect((error as Error).message).not.toContain("not-json");
  });
});