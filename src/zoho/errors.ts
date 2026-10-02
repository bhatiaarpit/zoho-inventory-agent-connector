export class ZohoApiError extends Error {
  readonly status?: number;
  readonly zohoCode?: number | string;

  constructor(
    message: string,
    status?: number,
    zohoCode?: number | string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = new.target.name;
    this.status = status;
    this.zohoCode = zohoCode;
  }
}

export class ZohoAuthenticationError extends ZohoApiError {}

export class ZohoNotFoundError extends ZohoApiError {}

export class ZohoRateLimitError extends ZohoApiError {
  readonly retryAfterMs?: number;

  constructor(message: string, status = 429, retryAfterMs?: number) {
    super(message, status);
    this.retryAfterMs = retryAfterMs;
  }
}
