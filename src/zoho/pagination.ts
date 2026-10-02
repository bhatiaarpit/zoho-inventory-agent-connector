export interface ZohoPageContext {
  page: number;
  per_page: number;
  has_more_page: boolean;
}

export interface PaginatedResponse {
  page_context?: ZohoPageContext;
}

export interface PaginationOptions {
  page?: number;
  perPage?: number;
  maxPages?: number;
}

export interface PaginationSummary {
  page: number;
  per_page: number;
  has_more: boolean;
}

export function toPagination(
  context: ZohoPageContext | undefined,
  requestedPage: number,
  requestedPerPage: number,
): PaginationSummary {
  return {
    page: context?.page ?? requestedPage,
    per_page: context?.per_page ?? requestedPerPage,
    has_more: context?.has_more_page ?? false,
  };
}

export async function* paginate<TResponse extends PaginatedResponse>(
  fetchPage: (page: number, perPage: number) => Promise<TResponse>,
  options: PaginationOptions = {},
): AsyncGenerator<TResponse> {
  const perPage = options.perPage ?? 50;
  const maxPages = options.maxPages ?? Number.POSITIVE_INFINITY;
  let page = options.page ?? 1;

  if (!Number.isInteger(page) || page < 1) {
    throw new RangeError("page must be a positive integer");
  }

  if (!Number.isInteger(perPage) || perPage < 1) {
    throw new RangeError("perPage must be a positive integer");
  }

  if (maxPages !== Number.POSITIVE_INFINITY &&
      (!Number.isInteger(maxPages) || maxPages < 1)) {
    throw new RangeError("maxPages must be a positive integer");
  }

  for (let pagesFetched = 0; pagesFetched < maxPages; pagesFetched += 1) {
    const response = await fetchPage(page, perPage);
    yield response;

    const pageContext = response.page_context;

    if (!pageContext?.has_more_page) {
      return;
    }

    page = Math.max(page, pageContext.page) + 1;
  }
}
