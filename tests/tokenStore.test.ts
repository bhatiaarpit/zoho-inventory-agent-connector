import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFileSystem = vi.hoisted(() => ({
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

vi.mock("node:fs", () => ({ default: mockFileSystem }));

import {
  clearTokens,
  getTokens,
  hasValidAccessToken,
  setTokens,
} from "../src/auth/tokenStore.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("tokenStore", () => {
  it("persists and reads token data from disk", () => {
    const tokens = {
      accessToken: "test-access-token",
      refreshToken: "test-refresh-token",
      expiresAt: Date.now() + 3_600_000,
    };

    setTokens(tokens);

    expect(mockFileSystem.mkdirSync).toHaveBeenCalledWith(
      expect.any(String),
      { recursive: true },
    );
    expect(mockFileSystem.writeFileSync).toHaveBeenCalledWith(
      expect.any(String),
      JSON.stringify(tokens, null, 2),
      { encoding: "utf8", mode: 0o600 },
    );

    mockFileSystem.readFileSync.mockReturnValue(JSON.stringify(tokens));
    expect(getTokens()).toEqual(tokens);
  });

  it("treats missing or malformed token files as unauthenticated", () => {
    mockFileSystem.readFileSync.mockImplementation(() => {
      throw new Error("missing file");
    });
    expect(getTokens()).toBeNull();
    expect(hasValidAccessToken()).toBe(false);

    mockFileSystem.readFileSync.mockReturnValue("not-json");
    expect(getTokens()).toBeNull();
  });

  it("removes the persisted token file", () => {
    clearTokens();
    expect(mockFileSystem.unlinkSync).toHaveBeenCalledWith(expect.any(String));
  });
});