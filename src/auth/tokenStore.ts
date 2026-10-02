export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

let tokenData: TokenData | null = null;

export function setTokens(tokens: TokenData) {
  tokenData = tokens;
}

export function getTokens(): TokenData | null {
  return tokenData;
}

export function clearTokens() {
  tokenData = null;
}

export function hasValidAccessToken(): boolean {
  if (!tokenData) {
    return false;
  }

  return Date.now() < tokenData.expiresAt - 60_000;
}
