import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const strapiAuthFailure = vi.hoisted(() =>
  vi.fn(() => Response.json({ error: "Strapi authentication failed" }, { status: 502 })),
);

vi.mock("@/lib/admin/require-admin", () => ({
  requireAdmin: vi.fn().mockResolvedValue({ documentId: "admin-1", active: true }),
  strapiAuthFailure,
}));

vi.mock("@/lib/admin/strapi-admin", () => ({
  getStrapiAdminToken: vi.fn().mockReturnValue("mock-strapi-token"),
}));

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}));

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV };
  process.env.STRAPI_INTERNAL_URL = "http://localhost:1337";
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = ORIGINAL_ENV;
});

const mockFetch = (status: number, body: unknown) => {
  (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
};

const readJson = async (res: Response) => (await res.json()) as unknown;

const putBody = async (init: { body?: string }): Promise<unknown> => {
  const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
  const init0 = calls[0]?.[1] as RequestInit | undefined;
  const raw = init.body ?? (init0?.body as string | undefined);
  return raw ? JSON.parse(raw) : null;
};

const callGet = async () => {
  const { GET } = await import("./route");
  return GET();
};

const callPut = async (payload: unknown) => {
  const { PUT } = await import("./route");
  const req = new Request("http://localhost/api/admin/site-setting", {
    method: "PUT",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });
  return PUT(req as unknown as Parameters<typeof PUT>[0]);
};

describe("PUT /api/admin/site-setting — validation", () => {
  it("rejects empty siteName with 400 and structured Zod issues", async () => {
    const res = await callPut({ siteName: "", rut: "76.123.456-7", whatsappDefaultMessage: "hi" });
    expect(res.status).toBe(400);
    const body = (await readJson(res)) as {
      error?: string;
      details?: { issues?: Array<{ path?: string[]; message?: string }> };
    };
    expect(body.error).toBe("Datos inválidos");
    expect(Array.isArray(body.details?.issues)).toBe(true);
    const issueMessages = (body.details?.issues ?? []).map((i) => i.message ?? "");
    expect(issueMessages.join(" ")).toMatch(/sitio|vacío/i);
  });

  it("rejects whitespace-only siteName with 400", async () => {
    const res = await callPut({
      siteName: "   ",
      rut: "76.123.456-7",
      whatsappDefaultMessage: "hi",
    });
    expect(res.status).toBe(400);
    const body = (await readJson(res)) as { details?: { issues?: unknown[] } };
    expect((body.details?.issues ?? []).length).toBeGreaterThan(0);
  });

  it("rejects whitespace-only rut and whatsappDefaultMessage", async () => {
    const res = await callPut({
      siteName: "Ene Muebles",
      rut: "   ",
      whatsappDefaultMessage: "\t\n ",
    });
    expect(res.status).toBe(400);
    const body = (await readJson(res)) as {
      details?: { issues?: Array<{ path?: Array<string | number>; message?: string }> };
    };
    const paths = (body.details?.issues ?? []).flatMap((i) => i.path ?? []);
    expect(paths).toContain("rut");
    expect(paths).toContain("whatsappDefaultMessage");
  });

  it("forwards a trimmed body when input has surrounding whitespace", async () => {
    mockFetch(200, { data: { siteName: "Ene Muebles" } });
    const res = await callPut({
      siteName: "  Ene Muebles  ",
      rut: "\t76.123.456-7\n",
      whatsappDefaultMessage: " Hola ",
      tagline: "  Muebles a medida  ",
    });
    expect(res.status).toBe(200);
    const body = (await putBody({})) as { data?: Record<string, unknown> };
    expect(body.data).toBeDefined();
    expect(body.data?.siteName).toBe("Ene Muebles");
    expect(body.data?.rut).toBe("76.123.456-7");
    expect(body.data?.whatsappDefaultMessage).toBe("Hola");
    expect(body.data?.tagline).toBe("Muebles a medida");
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:1337/api/site-setting?status=published",
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("always sends trimmed required fields and packed socialLinks", async () => {
    mockFetch(200, { data: { ok: true } });
    await callPut({
      siteName: "Ene Muebles",
      rut: "76.123.456-7",
      whatsappDefaultMessage: "Hola",
      socialLinks: {
        instagram: "  https://instagram.com/enemuebles  ",
        // Empty-after-trim handles are dropped by the route — the form
        // sends `null` to signal "clear this previously saved handle",
        // which is tested separately.
        facebook: "",
        linkedin: "",
        tiktok: "",
      },
    });
    const body = (await putBody({})) as { data?: { socialLinks?: Record<string, unknown> } };
    const social = body.data?.socialLinks as Record<string, unknown>;
    expect(social.instagram).toBe("https://instagram.com/enemuebles");
    expect("facebook" in social).toBe(false);
    expect("linkedin" in social).toBe(false);
    expect("tiktok" in social).toBe(false);
  });

  it("propagates an explicit null to Strapi for clearing a social field", async () => {
    mockFetch(200, { data: { ok: true } });
    await callPut({
      siteName: "Ene Muebles",
      rut: "76.123.456-7",
      whatsappDefaultMessage: "Hola",
      socialLinks: {
        instagram: null,
        facebook: "https://facebook.com/enemuebles",
        linkedin: null,
        tiktok: null,
      },
    });
    const body = (await putBody({})) as { data?: { socialLinks?: Record<string, unknown> } };
    expect(body.data?.socialLinks).toEqual({
      instagram: null,
      facebook: "https://facebook.com/enemuebles",
      linkedin: null,
      tiktok: null,
    });
  });

  it("omits optional scalar fields when blank", async () => {
    mockFetch(200, { data: { ok: true } });
    await callPut({
      siteName: "Ene Muebles",
      rut: "76.123.456-7",
      whatsappDefaultMessage: "Hola",
      tagline: "",
      contactPhone: "   ",
    });
    const body = (await putBody({})) as { data?: Record<string, unknown> };
    expect("tagline" in (body.data ?? {})).toBe(false);
    expect("contactPhone" in (body.data ?? {})).toBe(false);
  });

  it("accepts dispatchCoverage, addressCity, and addressRegion and forwards them", async () => {
    mockFetch(200, { data: { ok: true } });
    const res = await callPut({
      siteName: "Ene Muebles",
      rut: "76.123.456-7",
      whatsappDefaultMessage: "Hola",
      dispatchCoverage: "  Regiones: desde la Región de Valparaíso hasta la Región de Los Lagos  ",
      addressCity: "Temuco",
      addressRegion: "La Araucanía",
    });
    expect(res.status).toBe(200);
    const body = (await putBody({})) as { data?: Record<string, unknown> };
    expect(body.data).toMatchObject({
      dispatchCoverage: "Regiones: desde la Región de Valparaíso hasta la Región de Los Lagos",
      addressCity: "Temuco",
      addressRegion: "La Araucanía",
    });
  });

  it("trims and forwards every global navigation and product-action field", async () => {
    mockFetch(200, { data: { ok: true } });
    const res = await callPut({
      navigationHomeLabel: "  Portada  ",
      navigationCatalogLabel: "  Productos  ",
      navigationAboutLabel: "  La empresa  ",
      navigationContactLabel: "  Escríbenos  ",
      headerWhatsappLabel: "  Cotizar  ",
      mobileWhatsappLabel: "  Cotizar por WhatsApp  ",
      whatsappProductMessageTemplate: "  Necesito cotizar {productName}.  ",
      productCardDetailLabel: "  Ver ficha  ",
      productCardWhatsappLabel: "  Cotizar  ",
      productDetailWhatsappLabel: "  Cotizar por WhatsApp  ",
      productDetailContactLabel: "  Contactar  ",
    });

    expect(res.status).toBe(200);
    const body = (await putBody({})) as { data?: Record<string, unknown> };
    expect(body.data).toMatchObject({
      navigationHomeLabel: "Portada",
      navigationCatalogLabel: "Productos",
      navigationAboutLabel: "La empresa",
      navigationContactLabel: "Escríbenos",
      headerWhatsappLabel: "Cotizar",
      mobileWhatsappLabel: "Cotizar por WhatsApp",
      whatsappProductMessageTemplate: "Necesito cotizar {productName}.",
      productCardDetailLabel: "Ver ficha",
      productCardWhatsappLabel: "Cotizar",
      productDetailWhatsappLabel: "Cotizar por WhatsApp",
      productDetailContactLabel: "Contactar",
    });
  });

  it("maps blank global/action copy to null so saved values are cleared", async () => {
    mockFetch(200, { data: { ok: true } });
    const res = await callPut({
      navigationHomeLabel: "   ",
      whatsappProductMessageTemplate: "",
      productDetailContactLabel: null,
    });

    expect(res.status).toBe(200);
    await expect(putBody({})).resolves.toEqual({
      data: {
        navigationHomeLabel: null,
        whatsappProductMessageTemplate: null,
        productDetailContactLabel: null,
      },
    });
  });

  it("requires exactly one literal {productName} in a nonblank product template", async () => {
    expect((await callPut({ whatsappProductMessageTemplate: "Cotizar un producto" })).status).toBe(
      400,
    );
    expect(
      (
        await callPut({
          whatsappProductMessageTemplate: "{productName} y otra vez {productName}",
        })
      ).status,
    ).toBe(400);
    expect((await callPut({ whatsappProductMessageTemplate: "x".repeat(1001) })).status).toBe(400);

    mockFetch(200, { data: { ok: true } });
    expect(
      (
        await callPut({
          whatsappProductMessageTemplate: "Cotizar {productName}",
        })
      ).status,
    ).toBe(200);
  });

  it("enforces the WU4A navigation and action label bounds", async () => {
    expect((await callPut({ navigationHomeLabel: "x".repeat(25) })).status).toBe(400);
    expect((await callPut({ mobileWhatsappLabel: "x".repeat(81) })).status).toBe(400);
    expect((await callPut({ productCardDetailLabel: "x".repeat(61) })).status).toBe(400);
    expect((await callPut({ productDetailContactLabel: "x".repeat(81) })).status).toBe(400);
  });

  it("forwards trimmed commercial terms", async () => {
    mockFetch(200, { data: { ok: true } });
    const res = await callPut({
      paymentTermsText: "  Pago contra orden de compra  ",
      warrantyText: "  Garantía de 12 meses  ",
      quoteResponseTimeText: "  Respuesta en 2 días hábiles  ",
    });
    expect(res.status).toBe(200);
    const body = (await putBody({})) as { data?: Record<string, unknown> };
    expect(body.data).toMatchObject({
      paymentTermsText: "Pago contra orden de compra",
      warrantyText: "Garantía de 12 meses",
      quoteResponseTimeText: "Respuesta en 2 días hábiles",
    });
  });

  it("omits blank commercial terms but forwards explicit null to clear", async () => {
    mockFetch(200, { data: { ok: true } });
    const res = await callPut({
      paymentTermsText: "   ",
      warrantyText: null,
      quoteResponseTimeText: "",
    });
    expect(res.status).toBe(200);
    const body = (await putBody({})) as { data?: Record<string, unknown> };
    expect(body.data).toEqual({ warrantyText: null });
  });

  it("rejects malformed commercial terms and unknown keys", async () => {
    const res = await callPut({
      paymentTermsText: 42,
      warrantyText: "x".repeat(2001),
      quoteResponseTimeText: "x".repeat(281),
      unknownCommercialField: "not allowed",
    });
    expect(res.status).toBe(400);
    const body = (await readJson(res)) as {
      details?: { issues?: Array<{ path?: Array<string | number> }> };
    };
    const paths = (body.details?.issues ?? []).map((issue) => issue.path?.join("."));
    expect(paths).toContain("paymentTermsText");
    expect(paths).toContain("warrantyText");
    expect(paths).toContain("quoteResponseTimeText");
  });
  it("forwards a bounded foundedYear and explicit null, and rejects out-of-range years", async () => {
    mockFetch(200, { data: { ok: true } });
    const saved = await callPut({ foundedYear: 1996 });
    expect(saved.status).toBe(200);
    await expect(putBody({})).resolves.toEqual({ data: { foundedYear: 1996 } });

    mockFetch(200, { data: { ok: true } });
    const cleared = await callPut({ foundedYear: null });
    expect(cleared.status).toBe(200);
    const calls = vi.mocked(fetch).mock.calls;
    expect(JSON.parse(String((calls[1]?.[1] as RequestInit).body))).toEqual({
      data: { foundedYear: null },
    });

    expect((await callPut({ foundedYear: 1799 })).status).toBe(400);
    expect((await callPut({ foundedYear: 2101 })).status).toBe(400);
  });

  it("maps upstream Strapi 401 responses through strapiAuthFailure", async () => {
    mockFetch(401, { error: { message: "Unauthorized" } });
    const response = await callGet();
    expect(response.status).toBe(502);
    expect(strapiAuthFailure).toHaveBeenCalledOnce();
  });

  it("returns explicit JSON when Strapi returns an unparseable successful response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("not-json", { status: 200 }));
    const response = await callGet();
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "El servidor de contenido devolvió una respuesta inválida.",
    });
  });

  it("forwards a non-OK Strapi response with the upstream status", async () => {
    mockFetch(400, {
      error: {
        status: 400,
        name: "ValidationError",
        message: "whatsappDefaultMessage must be a `string`",
        details: {
          errors: [{ path: ["whatsappDefaultMessage"], message: "must be a `string`" }],
        },
      },
    });
    const res = await callPut({
      siteName: "Ene Muebles",
      rut: "76.123.456-7",
      whatsappDefaultMessage: "Hola",
    });
    expect(res.status).toBe(400);
    const body = (await readJson(res)) as {
      error?: { message?: string; details?: { errors?: unknown[] } };
    };
    expect(body.error?.message).toMatch(/string/);
    expect(body.error?.details?.errors?.length).toBe(1);
  });

  it("forwards an upstream 500 with its status", async () => {
    mockFetch(500, { error: { message: "cms down" } });
    const res = await callPut({
      siteName: "Ene Muebles",
      rut: "76.123.456-7",
      whatsappDefaultMessage: "Hola",
    });
    expect(res.status).toBe(500);
  });

  it("returns 401 when the admin guard rejects the session", async () => {
    const { requireAdmin } = await import("@/lib/admin/require-admin");
    vi.mocked(requireAdmin).mockResolvedValueOnce(null);
    const res = await callPut({
      siteName: "Ene Muebles",
      rut: "76.123.456-7",
      whatsappDefaultMessage: "Hola",
    });
    expect(res.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects an inactive admin on both GET and PUT before contacting Strapi", async () => {
    const { requireAdmin } = await import("@/lib/admin/require-admin");
    vi.mocked(requireAdmin).mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    const getResponse = await callGet();
    const putResponse = await callPut({ siteName: "Ene Muebles" });
    expect(getResponse.status).toBe(401);
    expect(putResponse.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("allows an active admin on GET", async () => {
    mockFetch(200, { data: { siteName: "Ene Muebles" } });
    const response = await callGet();
    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({ data: { siteName: "Ene Muebles" } });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:1337/api/site-setting?populate=*&status=draft",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("accepts the full URL each social network expects (bug-report scenario)", async () => {
    // After the form normalizes handles → full URLs (see
    // `normalizeSocialHandle` in `SiteSettingForm.tsx`), the proxy
    // must accept them and forward them verbatim to Strapi. This
    // proves the "Invalid url" rejection no longer fires for the
    // exact input combo the operator typed in the bug screenshot.
    mockFetch(200, { data: { ok: true } });
    const res = await callPut({
      siteName: "Ene Muebles",
      rut: "76.123.456-7",
      whatsappDefaultMessage: "Hola",
      socialLinks: {
        instagram: "https://www.instagram.com/enemuebles",
        facebook: "https://www.facebook.com/enemuebles.cl",
        linkedin: "https://www.linkedin.com/in/ene-muebles",
        tiktok: "https://tiktok.com/@enemuebles",
      },
    });
    expect(res.status).toBe(200);
    const body = (await putBody({})) as { data?: { socialLinks?: Record<string, unknown> } };
    expect(body.data?.socialLinks).toEqual({
      instagram: "https://www.instagram.com/enemuebles",
      facebook: "https://www.facebook.com/enemuebles.cl",
      linkedin: "https://www.linkedin.com/in/ene-muebles",
      tiktok: "https://tiktok.com/@enemuebles",
    });
  });

  it("accepts a bare social handle (route schema is permissive)", async () => {
    // The route's social-string schema is permissive by design: the
    // form normally does the URL prefix, but if a caller hands us a
    // handle directly we still forward it. Strapi may still reject
    // it; the route's job is to surface the request unchanged.
    mockFetch(200, { data: { ok: true } });
    const res = await callPut({
      siteName: "Ene Muebles",
      rut: "76.123.456-7",
      whatsappDefaultMessage: "Hola",
      socialLinks: { instagram: "enemuebles" },
    });
    expect(res.status).toBe(200);
    const body = (await putBody({})) as { data?: { socialLinks?: Record<string, unknown> } };
    expect(body.data?.socialLinks).toEqual({ instagram: "enemuebles" });
  });

  it("rejects a social value with internal whitespace and names the field", async () => {
    // Whitespace inside a URL/handle is always a typo — surface a
    // clear Zod issue naming the offending path so the admin can
    // fix it instead of forwarding garbage to Strapi.
    const res = await callPut({
      siteName: "Ene Muebles",
      rut: "76.123.456-7",
      whatsappDefaultMessage: "Hola",
      socialLinks: { instagram: "ene muebles" },
    });
    expect(res.status).toBe(400);
    const body = (await readJson(res)) as {
      error?: string;
      details?: { issues?: Array<{ path?: Array<string | number>; message?: string }> };
    };
    expect(body.error).toBe("Datos inválidos");
    const issues = body.details?.issues ?? [];
    expect(issues.length).toBeGreaterThan(0);
    const offending = issues.find((i) => Array.isArray(i.path) && i.path.includes("instagram"));
    expect(offending?.message).toMatch(/espacios/i);
  });

  it("trims surrounding whitespace from a social URL", async () => {
    mockFetch(200, { data: { ok: true } });
    const res = await callPut({
      siteName: "Ene Muebles",
      rut: "76.123.456-7",
      whatsappDefaultMessage: "Hola",
      socialLinks: { instagram: "  https://instagram.com/enemuebles  " },
    });
    expect(res.status).toBe(200);
    const body = (await putBody({})) as { data?: { socialLinks?: Record<string, unknown> } };
    expect(body.data?.socialLinks).toEqual({
      instagram: "https://instagram.com/enemuebles",
    });
  });

  it("purges the site-settings cache tag after a successful update", async () => {
    mockFetch(200, { data: { ok: true } });
    const { revalidateTag } = await import("next/cache");
    const res = await callPut({
      siteName: "Ene Muebles",
      rut: "76.123.456-7",
      whatsappDefaultMessage: "Hola",
    });
    expect(res.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith("site-settings", { expire: 0 });
  });

  it("does not purge the cache when the Strapi update fails", async () => {
    mockFetch(400, { error: { message: "ValidationError" } });
    const { revalidateTag } = await import("next/cache");
    // The mock accumulates calls from earlier successful PUT tests in
    // this file (no global mock clear), so reset the spy locally.
    vi.mocked(revalidateTag).mockClear();
    const res = await callPut({
      siteName: "Ene Muebles",
      rut: "76.123.456-7",
      whatsappDefaultMessage: "Hola",
    });
    expect(res.status).toBe(400);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
