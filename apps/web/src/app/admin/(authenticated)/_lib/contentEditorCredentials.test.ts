import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

interface ContentEditor {
  route: string;
  endpoint: string;
  load: () => Promise<unknown>;
}

const editors: ContentEditor[] = [
  {
    route: "inicio",
    endpoint: "/api/home-page?status=draft",
    load: async () => (await import("../inicio/page")).getHomePageForAdmin(),
  },
  {
    route: "pagina-catalogo",
    endpoint: "/api/catalog-page?status=draft",
    load: async () => (await import("../pagina-catalogo/page")).getCatalogPageForAdmin(),
  },
  {
    route: "about",
    endpoint: "/api/about-section?populate=*&status=draft",
    load: async () => (await import("../about/page")).getAboutSectionForAdmin(),
  },
  {
    route: "hero",
    endpoint: "/api/hero-section?populate=*",
    load: async () => (await import("../hero/page")).getHeroSection(),
  },
  {
    route: "contacto-cta",
    endpoint: "/api/contact-cta-section",
    load: async () => (await import("../contacto-cta/page")).getContactCtaSection(),
  },
  {
    route: "pagina-contacto",
    endpoint: "/api/contact-page?status=draft",
    load: async () => (await import("../pagina-contacto/page")).getContactPageForAdmin(),
  },
  {
    route: "footer",
    endpoint: "/api/footer-block?status=draft",
    load: async () => (await import("../footer/page")).getFooterBlockForAdmin(),
  },
  {
    route: "ajustes",
    endpoint: "/api/site-setting?populate=*&status=draft",
    load: async () => (await import("../ajustes/page")).getSiteSetting(),
  },
];

beforeEach(() => {
  vi.resetModules();
  process.env = {
    ...ORIGINAL_ENV,
    STRAPI_INTERNAL_URL: "http://localhost:1337",
    STRAPI_ADMIN_TOKEN: " admin-token ",
    STRAPI_API_TOKEN: " legacy-token ",
  };
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = ORIGINAL_ENV;
});

function mockResponse(status = 200) {
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(JSON.stringify(status === 200 ? { data: {} } : { error: "Forbidden" }), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function expectRequest(endpoint: string, token?: string) {
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith(`http://localhost:1337${endpoint}`, {
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    cache: "no-store",
  });
}

describe.each(editors)("Admin /admin/$route credentials", ({ endpoint, load }: ContentEditor) => {
  it("prefers the trimmed admin token over the public API token", async () => {
    mockResponse();

    await load();

    expectRequest(endpoint, "admin-token");
  });

  it("uses the admin token when the public API token is absent", async () => {
    delete process.env.STRAPI_API_TOKEN;
    mockResponse();

    await load();

    expectRequest(endpoint, "admin-token");
  });

  it.each([undefined, ""])(
    "falls back to the API token when the admin token is %s",
    async (token: string | undefined) => {
      if (token === undefined) delete process.env.STRAPI_ADMIN_TOKEN;
      else process.env.STRAPI_ADMIN_TOKEN = token;
      mockResponse();

      await load();

      expectRequest(endpoint, "legacy-token");
    },
  );

  it("omits Authorization when neither token is configured", async () => {
    delete process.env.STRAPI_ADMIN_TOKEN;
    delete process.env.STRAPI_API_TOKEN;
    mockResponse();

    await load();

    expectRequest(endpoint);
  });

  it("omits Authorization when the selected token is only whitespace", async () => {
    process.env.STRAPI_ADMIN_TOKEN = "   ";
    process.env.STRAPI_API_TOKEN = "";
    mockResponse();

    await load();

    expectRequest(endpoint);
  });

  it("fails closed on 403 without retrying published content or returning editable defaults", async () => {
    mockResponse(403);

    await expect(load()).rejects.toThrow("403");

    expectRequest(endpoint, "admin-token");
  });
});
