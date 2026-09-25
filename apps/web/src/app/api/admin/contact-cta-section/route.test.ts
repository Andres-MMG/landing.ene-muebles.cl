import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireAdmin = vi.hoisted(() => vi.fn());
const strapiAuthFailure = vi.hoisted(() =>
  vi.fn(() =>
    Response.json({ error: "El servidor de contenido rechazó la autenticación." }, { status: 502 }),
  ),
);

vi.mock("@/lib/admin/require-admin", () => ({ requireAdmin, strapiAuthFailure }));
vi.mock("@/lib/admin/strapi-admin", () => ({
  getStrapiAdminToken: vi.fn().mockReturnValue("mock-strapi-token"),
}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

const ORIGINAL_ENV = { ...process.env };

const payload = {
  eyebrow: "  Proyectos  ",
  title: "  Hablemos de tu proyecto.  ",
  body: "  Cuéntanos qué necesitas.  ",
  buttonLabel: "  Hablar por WhatsApp  ",
  buttonHref: "  https://wa.me/56912345678  ",
  emailLabel: "  Escríbenos  ",
};

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue({ documentId: "admin-1", active: true });
  process.env = { ...ORIGINAL_ENV, STRAPI_INTERNAL_URL: "http://localhost:1337" };
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = ORIGINAL_ENV;
});

function mockJson(status: number, body: unknown) {
  (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function mockText(status: number, body = "not-json") {
  (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
    new Response(body, { status, headers: { "Content-Type": "text/plain" } }),
  );
}

async function callPut(body: unknown) {
  const { PUT } = await import("./route");
  const request = new Request("http://localhost/api/admin/contact-cta-section", {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
  return PUT(request as unknown as Parameters<typeof PUT>[0]);
}

async function callGet() {
  const { GET } = await import("./route");
  return GET();
}

function sentRequestInit(): RequestInit {
  return (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as RequestInit;
}

describe("GET /api/admin/contact-cta-section", () => {
  it("allows an active admin to read the singleton with the admin token", async () => {
    mockJson(200, { data: payload });

    const response = await callGet();

    expect(response.status).toBe(200);
    expect(requireAdmin).toHaveBeenCalledOnce();
    expect(String((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0])).toContain(
      "/api/contact-cta-section",
    );
    expect(new Headers(sentRequestInit().headers).get("authorization")).toBe(
      "Bearer mock-strapi-token",
    );
  });

  it("returns 401 without contacting Strapi when the admin is inactive", async () => {
    requireAdmin.mockResolvedValueOnce(null);

    const response = await callGet();

    expect(response.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("maps an upstream 401 to the Strapi authentication gateway response", async () => {
    mockJson(401, { error: { message: "Unauthorized" } });

    const response = await callGet();

    expect(response.status).toBe(502);
    expect(strapiAuthFailure).toHaveBeenCalledOnce();
  });

  it.each([200, 503])(
    "returns explicit JSON when upstream status %s is not JSON",
    async (status: number) => {
      mockText(status);

      const response = await callGet();

      expect(response.status).toBe(status === 200 ? 502 : status);
      await expect(response.json()).resolves.toMatchObject({ error: expect.any(String) });
    },
  );
});

describe("PUT /api/admin/contact-cta-section", () => {
  it("forwards trimmed legacy fields and the new optional labels", async () => {
    mockJson(200, { data: { ok: true } });

    const response = await callPut(payload);

    expect(response.status).toBe(200);
    expect(JSON.parse(String(sentRequestInit().body))).toEqual({
      data: {
        eyebrow: "Proyectos",
        title: "Hablemos de tu proyecto.",
        body: "Cuéntanos qué necesitas.",
        buttonLabel: "Hablar por WhatsApp",
        buttonHref: "https://wa.me/56912345678",
        emailLabel: "Escríbenos",
      },
    });
  });

  it("forwards explicit null for blank new optional labels", async () => {
    mockJson(200, { data: { ok: true } });

    await callPut({ ...payload, eyebrow: null, emailLabel: null });

    expect(JSON.parse(String(sentRequestInit().body))).toMatchObject({
      data: { eyebrow: null, emailLabel: null },
    });
  });

  it.each([
    ["eyebrow", "x".repeat(81)],
    ["emailLabel", "x".repeat(61)],
    ["title", "x".repeat(201)],
    ["body", "x".repeat(1001)],
    ["buttonLabel", "x".repeat(61)],
    ["buttonHref", "x".repeat(301)],
  ])(
    "rejects %s values over the configured bound",
    async (field: keyof typeof payload, value: string) => {
      const response = await callPut({ ...payload, [field]: value });

      expect(response.status).toBe(400);
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("rejects blank required fields before contacting Strapi", async () => {
    const response = await callPut({ ...payload, title: " ", buttonLabel: "" });

    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns 401 without validating or contacting Strapi when the admin is inactive", async () => {
    requireAdmin.mockResolvedValueOnce(null);

    const response = await callPut(payload);

    expect(response.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("maps an upstream 401 to the Strapi authentication gateway response", async () => {
    mockJson(401, { error: { message: "Unauthorized" } });

    const response = await callPut(payload);

    expect(response.status).toBe(502);
    expect(strapiAuthFailure).toHaveBeenCalledOnce();
    const cache = await import("next/cache");
    expect(cache.revalidateTag).not.toHaveBeenCalled();
  });

  it("returns explicit JSON for a non-JSON upstream failure", async () => {
    mockText(500);

    const response = await callPut(payload);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ error: expect.any(String) });
  });

  it("invalidates the sections tag only after a successful write", async () => {
    mockJson(200, { data: { ok: true } });
    await callPut(payload);

    const cache = await import("next/cache");
    const { STRAPI_CACHE_TAGS } = await import("@/lib/strapi");
    expect(cache.revalidateTag).toHaveBeenCalledWith(STRAPI_CACHE_TAGS.sections, { expire: 0 });
  });

  it("does not invalidate the sections tag after a failed write", async () => {
    mockJson(400, { error: { message: "invalid" } });
    await callPut(payload);

    const cache = await import("next/cache");
    expect(cache.revalidateTag).not.toHaveBeenCalled();
  });
});
