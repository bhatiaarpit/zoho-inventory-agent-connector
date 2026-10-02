import { describe, expect, it } from "vitest";

import { paginate, toPagination } from "../src/zoho/pagination.js";

interface TestPage {
  values: number[];
  page_context: {
    page: number;
    per_page: number;
    has_more_page: boolean;
  };
}

describe("paginate", () => {
  it("normalizes pagination metadata with request-value fallbacks", () => {
    expect(
      toPagination(
        { page: 2, per_page: 10, has_more_page: true },
        1,
        50,
      ),
    ).toEqual({ page: 2, per_page: 10, has_more: true });
    expect(toPagination(undefined, 3, 25)).toEqual({
      page: 3,
      per_page: 25,
      has_more: false,
    });
  });

  it("yields pages until has_more_page is false", async () => {
    const requestedPages: Array<[number, number]> = [];
    const responses: TestPage[] = [
      {
        values: [1],
        page_context: { page: 1, per_page: 25, has_more_page: true },
      },
      {
        values: [2],
        page_context: { page: 2, per_page: 25, has_more_page: true },
      },
      {
        values: [3],
        page_context: { page: 3, per_page: 25, has_more_page: false },
      },
    ];

    const pages = [];
    for await (const result of paginate(async (page, perPage) => {
      requestedPages.push([page, perPage]);
      return responses[page - 1];
    }, { perPage: 25 })) {
      pages.push(result.values[0]);
    }

    expect(pages).toEqual([1, 2, 3]);
    expect(requestedPages).toEqual([[1, 25], [2, 25], [3, 25]]);
  });

  it("honors the start page and maxPages bound", async () => {
    const requestedPages: number[] = [];

    for await (const _page of paginate(async (page, perPage) => {
      requestedPages.push(page);
      return {
        page_context: { page, per_page: perPage, has_more_page: true },
      };
    }, { page: 4, perPage: 10, maxPages: 2 })) {
      continue;
    }

    expect(requestedPages).toEqual([4, 5]);
  });

  it("rejects invalid pagination options before fetching", async () => {
    let fetchCalled = false;

    const pagination = paginate(async () => {
      fetchCalled = true;
      return { page_context: { page: 1, per_page: 50, has_more_page: false } };
    }, { page: 0 });

    await expect(pagination.next()).rejects.toThrow("page must be a positive integer");
    expect(fetchCalled).toBe(false);
  });
});
