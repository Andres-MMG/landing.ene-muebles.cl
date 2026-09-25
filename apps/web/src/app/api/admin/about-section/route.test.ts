import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  strapiAuthFailure: vi.fn(),
}));

const cache = vi.hoisted(() => ({
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/admin/require-admin", () => auth);
vi.mock("@/lib/admin/strapi-admin", () => ({
  getStrapiAdminToken: vi.fn().mockReturnValue("mock-strapi-token"),
}));
vi.mock("next/cache", () => cache);

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  auth.requireAdmin.mockReset();
  auth.strapiAuthFailure.mockReset();
  cache.revalidateTag.mockReset();
  auth.requireAdmin.mockResolvedValue({ documentId: "admin-1", active: true });
  auth.strapiAuthFailure.mockImplementation(
    () =>
      new Response(JSON.stringify({ error: "Strapi auth failure" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }),
  );
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

function mockRaw(status: number, body: string) {
  (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
    new Response(body, {
      status,
      headers: { "Content-Type": "text/plain" },
    }),
  );
}

async function callPut(payload: unknown) {
  const { PUT } = await import("./route");
  const request = new Request("http://localhost/api/admin/about-section", {
    method: "PUT",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });
  return PUT(request as unknown as Parameters<typeof PUT>[0]);
}

async function callGet() {
  const { GET } = await import("./route");
  return GET();
}

function sentData(): Record<string, unknown> {
  const init = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as
    | RequestInit
    | undefined;
  const parsed = init?.body ? (JSON.parse(String(init.body)) as { data?: unknown }) : {};
  return (parsed.data ?? {}) as Record<string, unknown>;
}

const requiredCopy = {
  eyebrow: "Datos",
  title: "Sobre nosotros",
};

describe("PUT /api/admin/about-section", () => {
  it("uses the active-admin guard before forwarding a write", async () => {
    auth.requireAdmin.mockResolvedValueOnce(null);

    const response = await callPut(requiredCopy);

    expect(response.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("trims bounded page copy and forwards explicit null clears", async () => {
    mockJson(200, { data: { documentId: "about" } });

    const response = await callPut({
      ...requiredCopy,
      pageEyebrow: "  Sobre nosotros  ",
      pageTitle: "  Nuestra historia  ",
      yearsInBusinessLabel: " Años en el rubro ",
      productCountLabel: " Productos activos ",
      productLineCountLabel: " Líneas activas ",
      coverageLabel: " Cobertura ",
      warrantyLabel: " Garantía ",
      projectCtaTitle: " ¿Cotizamos? ",
      projectCtaBody: " Envíanos tu requerimiento. ",
      projectCtaLabel: null,
    });

    expect(response.status).toBe(200);
    expect(sentData()).toMatchObject({
      pageEyebrow: "Sobre nosotros",
      pageTitle: "Nuestra historia",
      yearsInBusinessLabel: "Años en el rubro",
      productCountLabel: "Productos activos",
      productLineCountLabel: "Líneas activas",
      coverageLabel: "Cobertura",
      warrantyLabel: "Garantía",
      projectCtaTitle: "¿Cotizamos?",
      projectCtaBody: "Envíanos tu requerimiento.",
      projectCtaLabel: null,
    });
  });

  it("normalizes direct blank SEO fields to explicit null clears", async () => {
    mockJson(200, { data: { documentId: "about" } });

    const response = await callPut({
      ...requiredCopy,
      seoTitle: "   ",
      seoDescription: "\t ",
    });

    expect(response.status).toBe(200);
    expect(sentData()).toMatchObject({
      seoTitle: null,
      seoDescription: null,
    });
  });
  it("rejects over-limit and unknown fields without calling Strapi", async () => {
    const tooLong = await callPut({
      ...requiredCopy,
      pageEyebrow: "x".repeat(81),
    });
    expect(tooLong.status).toBe(400);

    vi.resetModules();
    const unknown = await callPut({
      ...requiredCopy,
      notAField: "no",
    });
    expect(unknown.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects a fifth value row without writing upstream", async () => {
    const response = await callPut({
      ...requiredCopy,
      values: Array.from({ length: 5 }, (_, index) => ({
        title: `Valor ${index + 1}`,
        body: `Descripción ${index + 1}`,
      })),
    });

    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
    expect(cache.revalidateTag).not.toHaveBeenCalled();
  });

  it("maps an upstream network failure to explicit JSON without invalidating cache", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const response = await callPut(requiredCopy);
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(502);
    expect(body.error).toMatch(/conectar con el servidor de contenido/iu);
    expect(cache.revalidateTag).not.toHaveBeenCalled();
  });

  it("invalidates section reads only after a successful upstream write", async () => {
    mockJson(200, { data: { ok: true } });
    await callPut(requiredCopy);
    expect(cache.revalidateTag).toHaveBeenCalledWith("sections", { expire: 0 });

    vi.resetModules();
    cache.revalidateTag.mockClear();
    mockJson(500, { error: { message: "cms down" } });
    const failed = await callPut(requiredCopy);
    expect(failed.status).toBe(500);
    expect(cache.revalidateTag).not.toHaveBeenCalled();
  });

  it("maps an upstream Strapi 401 without logging out the valid panel session", async () => {
    mockJson(401, { error: { message: "invalid token" } });

    const response = await callPut(requiredCopy);

    expect(response.status).toBe(502);
    expect(auth.strapiAuthFailure).toHaveBeenCalledTimes(1);
    expect(cache.revalidateTag).not.toHaveBeenCalled();
  });

  it.each<[number, number]>([
    [200, 502],
    [500, 500],
  ])(
    "returns explicit JSON when an upstream %s response cannot be parsed",
    async (upstreamStatus: number, expectedStatus: number) => {
      mockRaw(upstreamStatus, "<html>broken</html>");

      const response = await callPut(requiredCopy);
      const body = (await response.json()) as { error?: string };

      expect(response.status).toBe(expectedStatus);
      expect(body.error).toMatch(/respuesta inválida/iu);
      expect(cache.revalidateTag).not.toHaveBeenCalled();
    },
  );
});

describe("GET /api/admin/about-section", () => {
  it("uses the active-admin guard before reading", async () => {
    auth.requireAdmin.mockResolvedValueOnce(null);

    const response = await callGet();

    expect(response.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("forwards the populated singleton response", async () => {
    mockJson(200, { data: { pageTitle: "CMS" } });

    const response = await callGet();
    const body = (await response.json()) as { data?: { pageTitle?: string } };
    const url = String((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] ?? "");

    expect(response.status).toBe(200);
    expect(body.data?.pageTitle).toBe("CMS");
    expect(url).toContain("/api/about-section?populate=*");
  });

  it("maps upstream authentication failures and malformed bodies explicitly", async () => {
    mockJson(401, { error: { message: "invalid token" } });
    const unauthorized = await callGet();
    expect(unauthorized.status).toBe(502);
    expect(auth.strapiAuthFailure).toHaveBeenCalledTimes(1);

    vi.resetModules();
    mockRaw(500, "not-json");
    const malformed = await callGet();
    const body = (await malformed.json()) as { error?: string };
    expect(malformed.status).toBe(500);
    expect(body.error).toMatch(/respuesta inválida/iu);
  });
  it("maps an upstream network failure to explicit JSON", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const response = await callGet();
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(502);
    expect(body.error).toMatch(/conectar con el servidor de contenido/iu);
  });
});
