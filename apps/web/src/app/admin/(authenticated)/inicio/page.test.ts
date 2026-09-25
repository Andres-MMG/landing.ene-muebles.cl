import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { site as siteTokens } from "@ene/ui-tokens";

const ORIGINAL_ENV = { ...process.env };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.resetModules();
  process.env = {
    ...ORIGINAL_ENV,
    STRAPI_INTERNAL_URL: "http://localhost:1337",
    STRAPI_ADMIN_TOKEN: " admin-token ",
    STRAPI_API_TOKEN: "legacy-token",
  };
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = ORIGINAL_ENV;
});

describe("Admin /admin/inicio data loader", () => {
  it.each([
    [404, { error: { message: "Not found" } }],
    [200, { data: null }],
  ])(
    "uses the exact public fallback only for confirmed absence (%s)",
    async (status: number, body: unknown) => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(status, body));
      const { getHomePageForAdmin } = await import("./page");

      const page = await getHomePageForAdmin();

      expect(page.catalogEyebrow).toBe(siteTokens.catalogOverview);
      expect(page.catalogTitle).toBe("El catálogo se divide en dos líneas de fabricación.");
      expect(page.featuredTitle).toBe(siteTokens.featuredHeading);
    },
  );

  it.each([
    ["a partial record", { catalogTitle: "Título CMS" }],
    ["an empty legacy record", {}],
  ])(
    "keeps %s primary instead of filling missing fields",
    async (_label: string, data: Record<string, unknown>) => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { data }));
      const { getHomePageForAdmin } = await import("./page");

      const page = await getHomePageForAdmin();

      expect(page).toEqual(data);
      expect(page.featuredTitle).toBeUndefined();
    },
  );

  it("uses the trimmed admin-token precedence from getStrapiAdminToken", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { data: null }));
    const { getHomePageForAdmin } = await import("./page");

    await getHomePageForAdmin();

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:1337/api/home-page?status=draft",
      expect.objectContaining({
        headers: { Authorization: "Bearer admin-token" },
        cache: "no-store",
      }),
    );
  });

  it("falls back to the trimmed legacy API token when the admin token is blank", async () => {
    process.env.STRAPI_ADMIN_TOKEN = "";
    process.env.STRAPI_API_TOKEN = " legacy-token ";
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { data: null }));
    const { getHomePageForAdmin } = await import("./page");

    await getHomePageForAdmin();

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:1337/api/home-page?status=draft",
      expect.objectContaining({ headers: { Authorization: "Bearer legacy-token" } }),
    );
  });

  it("omits the Authorization header when both configured tokens are blank", async () => {
    process.env.STRAPI_ADMIN_TOKEN = "";
    process.env.STRAPI_API_TOKEN = "   ";
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { data: null }));
    const { getHomePageForAdmin } = await import("./page");

    await getHomePageForAdmin();

    const init = vi.mocked(fetch).mock.calls[0]?.[1];
    expect(init).not.toHaveProperty("headers");
  });

  it("fails closed for network errors", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const { getHomePageForAdmin } = await import("./page");

    await expect(getHomePageForAdmin()).rejects.toThrow("ECONNREFUSED");
  });

  it.each([401, 500])("fails closed for upstream HTTP %s", async (status: number) => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(status, { error: { message: "upstream failure" } }),
    );
    const { getHomePageForAdmin } = await import("./page");

    await expect(getHomePageForAdmin()).rejects.toThrow(String(status));
  });

  it("fails closed for non-JSON CMS payloads", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("not-json", { status: 200, headers: { "Content-Type": "text/plain" } }),
    );
    const { getHomePageForAdmin } = await import("./page");

    await expect(getHomePageForAdmin()).rejects.toThrow("inválida");
  });

  it.each([
    ["a missing data property", { other: null }],
    ["array data", { data: [] }],
    ["string data", { data: "wrong" }],
    ["numeric data", { data: 1 }],
    ["boolean data", { data: false }],
  ])("fails closed for malformed CMS payload: %s", async (_label: string, body: unknown) => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, body));
    const { getHomePageForAdmin } = await import("./page");

    await expect(getHomePageForAdmin()).rejects.toThrow("inválid");
  });
});
