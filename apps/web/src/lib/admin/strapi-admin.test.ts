import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv, STRAPI_INTERNAL_URL: "http://cms:1337" };
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = originalEnv;
});

describe("getStrapiAdminToken", () => {
  it("falls back to STRAPI_API_TOKEN when STRAPI_ADMIN_TOKEN is empty", async () => {
    process.env.STRAPI_ADMIN_TOKEN = "";
    process.env.STRAPI_API_TOKEN = "api-token";

    const { getStrapiAdminToken } = await import("./strapi-admin");

    expect(getStrapiAdminToken()).toBe("api-token");
  });

  it("rejects admin writes when neither token is configured", async () => {
    delete process.env.STRAPI_ADMIN_TOKEN;
    delete process.env.STRAPI_API_TOKEN;

    const { updateAdminCategory } = await import("./strapi-admin");

    await expect(
      updateAdminCategory("category-document-id", { name: "Updated category" }),
    ).rejects.toThrow("STRAPI_ADMIN_TOKEN or STRAPI_API_TOKEN is not set");
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("readAdminLeads", () => {
  it("reads only the internal CMS with canonical filters and no cache", async () => {
    process.env.STRAPI_ADMIN_TOKEN = "admin-token";
    process.env.NEXT_PUBLIC_SITE_URL = "https://unreachable-public.invalid";
    const envelope = {
      data: [],
      meta: { pagination: { page: 3, pageSize: 100, pageCount: 3, total: 201 } },
    };
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(envelope)));
    const { readAdminLeads } = await import("./strapi-admin");

    expect(
      await readAdminLeads(new URLSearchParams("page=3&pageSize=500&status=new&q=a%26b")),
    ).toEqual({ status: 200, data: envelope });
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    const parsed = new URL(String(url));
    expect(parsed.origin).toBe("http://cms:1337");
    expect(parsed.pathname).toBe("/api/leads");
    expect(Object.fromEntries(parsed.searchParams)).toEqual({
      "pagination[page]": "3",
      "pagination[pageSize]": "100",
      "filters[status][$eq]": "new",
      "filters[$or][0][name][$containsi]": "a&b",
      "filters[$or][1][email][$containsi]": "a&b",
      "filters[$or][2][institution][$containsi]": "a&b",
      sort: "createdAt:desc",
    });
    expect(init).toMatchObject({
      cache: "no-store",
      headers: { Authorization: "Bearer admin-token" },
    });
  });

  it.each(["", "page=bad&pageSize=bad", "page=-3&pageSize=50"])(
    "preserves default pagination for %s",
    async (query: string) => {
      process.env.STRAPI_API_TOKEN = "fallback-token";
      delete process.env.STRAPI_ADMIN_TOKEN;
      vi.mocked(fetch).mockResolvedValueOnce(new Response("not-json"));
      const { readAdminLeads } = await import("./strapi-admin");
      expect(await readAdminLeads(new URLSearchParams(query))).toEqual({
        status: 200,
        data: { data: [], meta: { pagination: { page: 1, pageSize: 50, pageCount: 0, total: 0 } } },
      });
      expect(vi.mocked(fetch).mock.calls[0][1]).toMatchObject({
        headers: { Authorization: "Bearer fallback-token" },
      });
    },
  );

  it("rejects invalid statuses without fetching", async () => {
    const { readAdminLeads } = await import("./strapi-admin");
    expect(await readAdminLeads(new URLSearchParams("status=bogus"))).toEqual({
      status: 400,
      data: { error: "Status inválido: bogus" },
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns a gateway error for missing credentials without fetching", async () => {
    delete process.env.STRAPI_ADMIN_TOKEN;
    delete process.env.STRAPI_API_TOKEN;
    const { readAdminLeads } = await import("./strapi-admin");
    expect(await readAdminLeads(new URLSearchParams())).toMatchObject({
      status: 502,
      data: { error: expect.stringContaining("autenticación") },
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("maps upstream 401 to 502 but preserves other upstream failures", async () => {
    process.env.STRAPI_ADMIN_TOKEN = "admin-token";
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: "Forbidden" } }), { status: 403 }),
      );
    const { readAdminLeads } = await import("./strapi-admin");
    expect(await readAdminLeads(new URLSearchParams())).toMatchObject({ status: 502 });
    expect(await readAdminLeads(new URLSearchParams())).toEqual({
      status: 403,
      data: { error: { message: "Forbidden" } },
    });
  });
});
