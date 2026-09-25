import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireAdmin = vi.hoisted(() => vi.fn());
const strapiAuthFailure = vi.hoisted(() =>
  vi.fn(() => Response.json({ error: "Strapi authentication failed" }, { status: 502 })),
);

vi.mock("@/lib/admin/require-admin", () => ({ requireAdmin, strapiAuthFailure }));
vi.mock("@/lib/admin/strapi-admin", () => ({
  getStrapiAdminToken: vi.fn().mockReturnValue("mock-strapi-token"),
}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

const ORIGINAL_ENV = { ...process.env };

const payload = {
  heroEyebrow: "  Hablemos  ",
  heroTitle: "  Hablemos de tu proyecto.  ",
  heroBody: "  Texto principal.  ",
  whatsappCtaLabel: "  Hablar por WhatsApp  ",
  emailCtaLabel: "  Correo  ",
  alternateContactEyebrow: "  Si prefieres  ",
  phoneContactLabel: "  Teléfono  ",
  whatsappContactLabel: "  WhatsApp  ",
  businessHoursLabel: "  Horario  ",
  addressLabel: "  Dirección  ",
  formEyebrow: "  Formulario  ",
  formTitle: "  Envíanos tu requerimiento.  ",
  formBody: "  Texto de apoyo.  ",
  nameFieldLabel: "  Nombre  ",
  institutionFieldLabel: "  Institución o empresa  ",
  emailFieldLabel: "  Correo  ",
  phoneFieldLabel: "  Teléfono  ",
  productFieldLabel: "  ¿Sobre qué producto nos escribes?  ",
  generalInquiryLabel: "  Pregunta general  ",
  regionFieldLabel: "  Región  ",
  regionPlaceholder: "  Selecciona una región  ",
  messageFieldLabel: "  Cuéntanos qué necesitas  ",
  consentBeforeLink: "  Acepto la  ",
  consentPrivacyLinkLabel: "  política de privacidad  ",
  consentAfterLink: "  y autorizo el uso de mis datos.  ",
  responseTimeText: "  Respondemos en 24 h hábiles  ",
  submitLabel: "  Enviar mensaje  ",
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
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

async function callPut(body: unknown) {
  const { PUT } = await import("./route");
  return PUT(
    new Request("http://localhost/api/admin/contact-page", {
      method: "PUT",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }) as unknown as Parameters<typeof PUT>[0],
  );
}

describe("/api/admin/contact-page", () => {
  it("requires an active local admin before contacting Strapi", async () => {
    requireAdmin.mockResolvedValueOnce(null);
    const { GET } = await import("./route");
    const response = await GET();
    expect(response.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("forwards a complete strictly-trimmed payload", async () => {
    mockJson(200, { data: { ok: true } });
    const response = await callPut(payload);
    expect(response.status).toBe(200);
    const init = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit;
    const sent = JSON.parse(String(init.body)) as { data: Record<string, string> };
    expect(Object.keys(sent.data)).toEqual(Object.keys(payload));
    expect(Object.values(sent.data).every((value) => value === value.trim())).toBe(true);
  });

  it("rejects missing, blank, overlong and unknown content before Strapi", async () => {
    expect((await callPut({ ...payload, formTitle: " " })).status).toBe(400);
    expect((await callPut({ ...payload, heroTitle: "x".repeat(181) })).status).toBe(400);
    expect((await callPut({ ...payload, unknown: "value" })).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("maps upstream 401 through strapiAuthFailure", async () => {
    mockJson(401, { error: { message: "Unauthorized" } });
    const { GET } = await import("./route");
    expect((await GET()).status).toBe(502);
    expect(strapiAuthFailure).toHaveBeenCalledOnce();
  });

  it("returns explicit JSON for network and unparseable upstream failures", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network"));
    const { GET } = await import("./route");
    const network = await GET();
    expect(network.status).toBe(502);
    await expect(network.json()).resolves.toEqual({
      error: "No se pudo conectar con el servidor de contenido.",
    });

    vi.mocked(fetch).mockResolvedValueOnce(new Response("not-json", { status: 200 }));
    const invalid = await GET();
    expect(invalid.status).toBe(502);
    await expect(invalid.json()).resolves.toEqual({
      error: "El servidor de contenido devolvió una respuesta inválida.",
    });
  });

  it("invalidates only after a successful write", async () => {
    mockJson(200, { data: { ok: true } });
    await callPut(payload);
    const cache = await import("next/cache");
    const { STRAPI_CACHE_TAGS } = await import("@/lib/strapi");
    expect(cache.revalidateTag).toHaveBeenCalledWith(STRAPI_CACHE_TAGS.contactPage, { expire: 0 });

    vi.mocked(cache.revalidateTag).mockClear();
    mockJson(400, { error: { message: "invalid" } });
    await callPut(payload);
    expect(cache.revalidateTag).not.toHaveBeenCalled();
  });
});
