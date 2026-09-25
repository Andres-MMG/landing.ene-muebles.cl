import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV, STRAPI_INTERNAL_URL: "http://localhost:1337" };
  delete process.env.STRAPI_API_TOKEN;
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

describe("Admin /admin/contacto-cta data loader", () => {
  it("returns the exact public fallback only when Strapi responds with data: null", async () => {
    mockJson(200, { data: null });

    const { getContactCtaSection } = await import("./page");
    const section = await getContactCtaSection();

    expect(section).toMatchObject({
      eyebrow: "Hablemos",
      title: expect.any(String),
      buttonLabel: expect.any(String),
      emailLabel: "Correo",
    });
  });

  it("returns the exact public fallback for an explicit Strapi not-found response", async () => {
    mockJson(404, { error: { message: "Not Found" } });

    const { getContactCtaSection } = await import("./page");
    const section = await getContactCtaSection();

    expect(section.eyebrow).toBe("Hablemos");
    expect(section.emailLabel).toBe("Correo");
  });

  it("keeps an empty real document as the primary value", async () => {
    mockJson(200, { data: {} });

    const { getContactCtaSection } = await import("./page");

    await expect(getContactCtaSection()).resolves.toEqual({});
  });

  it("keeps a partial real document without filling missing fields from fallback", async () => {
    mockJson(200, {
      data: {
        eyebrow: "Proyectos",
        title: "Hablemos de tu proyecto",
        emailLabel: "Escríbenos",
      },
    });

    const { getContactCtaSection } = await import("./page");
    const section = await getContactCtaSection();

    expect(section.eyebrow).toBe("Proyectos");
    expect(section.title).toBe("Hablemos de tu proyecto");
    expect(section.emailLabel).toBe("Escríbenos");
    expect(section.body).toBeUndefined();
    expect(section.buttonLabel).toBeUndefined();
  });

  it("fails closed when Strapi returns a non-not-found error", async () => {
    mockJson(503, { error: { message: "Unavailable" } });

    const { getContactCtaSection } = await import("./page");

    await expect(getContactCtaSection()).rejects.toThrow("(503)");
  });

  it("fails closed when the upstream request throws", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("network unavailable"),
    );

    const { getContactCtaSection } = await import("./page");

    await expect(getContactCtaSection()).rejects.toThrow("network unavailable");
  });

  it("fails closed when Strapi returns malformed JSON", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response("not-json", { status: 200 }),
    );

    const { getContactCtaSection } = await import("./page");

    await expect(getContactCtaSection()).rejects.toThrow();
  });

  it("fails closed when the response envelope omits data", async () => {
    mockJson(200, { meta: {} });

    const { getContactCtaSection } = await import("./page");

    await expect(getContactCtaSection()).rejects.toThrow("respuesta inválida");
  });

  it("fails closed when data is not an object or null", async () => {
    mockJson(200, { data: [] });

    const { getContactCtaSection } = await import("./page");

    await expect(getContactCtaSection()).rejects.toThrow("contenido inválido");
  });

  it("omits the Authorization header when the read token is absent", async () => {
    mockJson(200, { data: null });

    const { getContactCtaSection } = await import("./page");
    await getContactCtaSection();

    const init = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(init.headers).has("authorization")).toBe(false);
  });

  it("omits the Authorization header when the read token is whitespace", async () => {
    process.env.STRAPI_API_TOKEN = "   ";
    mockJson(200, { data: null });

    const { getContactCtaSection } = await import("./page");
    await getContactCtaSection();

    const init = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(init.headers).has("authorization")).toBe(false);
  });

  it("sends the Authorization header when a non-empty read token exists", async () => {
    process.env.STRAPI_API_TOKEN = "read-token";
    mockJson(200, { data: null });

    const { getContactCtaSection } = await import("./page");
    await getContactCtaSection();

    const init = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer read-token");
  });
});
