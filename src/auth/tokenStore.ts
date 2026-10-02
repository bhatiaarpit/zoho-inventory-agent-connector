import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const dataDir = path.resolve(dirname, "../../.data");
const tokenFile = path.join(dataDir, "tokens.json");

function isTokenData(value: unknown): value is TokenData {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "accessToken" in value &&
    typeof value.accessToken === "string" &&
    "refreshToken" in value &&
    typeof value.refreshToken === "string" &&
    "expiresAt" in value &&
    typeof value.expiresAt === "number"
  );
}

export function setTokens(tokens: TokenData): void {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(tokenFile, JSON.stringify(tokens, null, 2), {
    encoding: "utf8",
    mode: 0o600,
  });
}

export function getTokens(): TokenData | null {
  try {
    const raw = fs.readFileSync(tokenFile, "utf8");
    const tokens: unknown = JSON.parse(raw);

    return isTokenData(tokens) ? tokens : null;
  } catch {
    return null;
  }
}

export function clearTokens(): void {
  try {
    fs.unlinkSync(tokenFile);
  } catch (error) {
    if (!isFileNotFoundError(error)) {
      throw error;
    }
  }
}

export function hasValidAccessToken(): boolean {
  const tokens = getTokens();

  return tokens !== null && Date.now() < tokens.expiresAt - 60_000;
}

function isFileNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
