import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const ORIGINAL_ENV = { ...process.env };

const STRAPI = "http://localhost:1337";

const VALID_BODY = {
  name: "Ana Pérez",
  institution: "Colegio San Andrés",
  email: "ana@colegio.cl",
  phone: "+56912345678",
  region: "Metropolitana",
  message: "Necesitamos cotizar 40 sillas para la sala de clases.",
  consent: true,
  consentVersion: "2026-01",
  idempotencyKey: "idem-test-0001",
};

const callPost = async (body: unknown, ip = "203.0.113.7", headers: Record<string, string> = {}) => {
  const { POST } = await import("./route");
  const raw = JSON.stringify(body);
  const req = new Request("http://localhost/api/leads", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      // Real clients (browsers, curl) always send a content-length;
      // the route rejects requests without one (chunked) with 413.
      "content-length": String(Buffer.byteLength(raw)),
      "x-forwarded-for": ip,
      ...headers,
    },
    body: raw,
  });
  return POST(req as unknown as Parameters<typeof POST>[0]);
};

/**
 * Stub the global fetch with a Strapi-shaped responder. The route
 * performs two upstream calls per accepted submission: the
 * idempotency GET (empty result) and the create POST (created doc).
 */
const stubStrapiFetch = () => {
  const fetchMock = vi.fn(async (_input: string | URL, init?: RequestInit) => {
    const isCreate = init?.method === "POST";
    const body = isCreate
      ? JSON.stringify({ data: { documentId: "lead-abc123" } })
      : JSON.stringify({ data: [] });
    return new Response(body, { status: 200, headers: { "content-type": "application/json" } });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  process.env = {
    ...ORIGINAL_ENV,
    STRAPI_INTERNAL_URL: STRAPI,
    STRAPI_API_TOKEN: "test-token",
  };
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("POST /api/leads — validation", () => {
  it("rejects a submission without consent with a field-level error", async () => {
    const fetchMock = stubStrapiFetch();

    const res = await callPost({ ...VALID_BODY, consent: false });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      ok: false,
      errors: { consent: expect.stringMatching(/pol[ií]tica de privacidad/) },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid email with a field-level error", async () => {
    const fetchMock = stubStrapiFetch();

    const res = await callPost({ ...VALID_BODY, email: "not-an-email" });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      ok: false,
      errors: { email: expect.stringMatching(/correo/) },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a missing message with a field-level error", async () => {
    const fetchMock = stubStrapiFetch();

    const res = await callPost({ ...VALID_BODY, message: "   " });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      ok: false,
      errors: { message: expect.any(String) },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON without persisting", async () => {
    const fetchMock = stubStrapiFetch();
    const { POST } = await import("./route");
    const raw = "{not json";
    const req = new Request("http://localhost/api/leads", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(Buffer.byteLength(raw)),
        "x-forwarded-for": "203.0.113.7",
      },
      body: raw,
    });

    const res = await POST(req as unknown as Parameters<typeof POST>[0]);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ ok: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects requests without a content-length header (chunked) before reading the body", async () => {
    const fetchMock = stubStrapiFetch();
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.7" },
      body: JSON.stringify(VALID_BODY),
    });
    expect(req.headers.get("content-length")).toBeNull();

    const res = await POST(req as unknown as Parameters<typeof POST>[0]);

    expect(res.status).toBe(413);
    await expect(res.json()).resolves.toMatchObject({ ok: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects oversized bodies without persisting", async () => {
    const fetchMock = stubStrapiFetch();

    const res = await callPost({ ...VALID_BODY, message: "x".repeat(20_000) });

    expect(res.status).toBe(413);
    await expect(res.json()).resolves.toMatchObject({ ok: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/leads — honeypot", () => {
  it("silently accepts a bot submission and creates nothing", async () => {
    const fetchMock = stubStrapiFetch();

    const res = await callPost({ ...VALID_BODY, website: "https://spam.example" });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/leads — rate limiting", () => {
  it("allows 5 submissions per minute and rejects the 6th with Retry-After", async () => {
    const fetchMock = stubStrapiFetch();

    for (let i = 0; i < 5; i += 1) {
      const res = await callPost({ ...VALID_BODY, idempotencyKey: `idem-key-${i}` });
      expect(res.status).toBe(201);
    }

    const res = await callPost({ ...VALID_BODY, idempotencyKey: "idem-key-6" });

    expect(res.status).toBe(429);
    const retryAfter = Number(res.headers.get("Retry-After"));
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    await expect(res.json()).resolves.toMatchObject({ ok: false });

    // 5 accepted submissions × (idempotency GET + create POST) = 10 calls.
    expect(fetchMock).toHaveBeenCalledTimes(10);
  });

  it("enforces the configured daily cap", async () => {
    process.env.LEAD_DAILY_LIMIT = "2";
    vi.resetModules();
    stubStrapiFetch();

    const res1 = await callPost({ ...VALID_BODY, idempotencyKey: "daily-key-1" });
    expect(res1.status).toBe(201);
    const res2 = await callPost({ ...VALID_BODY, idempotencyKey: "daily-key-2" });
    expect(res2.status).toBe(201);

    const res3 = await callPost({ ...VALID_BODY, idempotencyKey: "daily-key-3" });
    expect(res3.status).toBe(429);
    expect(res3.headers.get("Retry-After")).toBeTruthy();
  });

  it("rate-limits by the LAST x-forwarded-for entry (trusted proxy-appended IP)", async () => {
    // Traefik APPENDS the real client IP, so the first entries are
    // client-spoofable; the last entry must be the one that counts.
    const fetchMock = stubStrapiFetch();

    for (let i = 0; i < 5; i += 1) {
      const res = await callPost(
        { ...VALID_BODY, idempotencyKey: `spoofed-key-${i}` },
        undefined,
        { "x-forwarded-for": "6.6.6.6, 203.0.113.99" },
      );
      expect(res.status).toBe(201);
    }

    // The 6th request from the same trailing IP is blocked even though
    // the spoofed prefix differs.
    const blocked = await callPost(
      { ...VALID_BODY, idempotencyKey: "spoofed-key-6" },
      undefined,
      { "x-forwarded-for": "6.6.6.6, 203.0.113.99" },
    );
    expect(blocked.status).toBe(429);

    // A different trailing IP is NOT affected by the spoofed prefix.
    const other = await callPost(
      { ...VALID_BODY, idempotencyKey: "other-ip" },
      undefined,
      { "x-forwarded-for": "6.6.6.6, 203.0.113.100" },
    );
    expect(other.status).toBe(201);
    expect(fetchMock).toHaveBeenCalled();
  });
});

describe("POST /api/leads — persistence", () => {
  it("persists to Strapi and returns 201 only after the create succeeds", async () => {
    const fetchMock = stubStrapiFetch();

    const res = await callPost(VALID_BODY);

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({ ok: true });

    const createCall = fetchMock.mock.calls.find(
      ([, init]: [unknown, RequestInit?]) => init?.method === "POST",
    );
    expect(createCall).toBeTruthy();
    const [url, init] = createCall!;
    expect(String(url)).toBe(`${STRAPI}/api/leads`);
    expect(init!.headers).toMatchObject({
      Authorization: "Bearer test-token",
      "Content-Type": "application/json",
    });
    const payload = JSON.parse(String(init!.body));
    expect(payload.data).toMatchObject({
      name: "Ana Pérez",
      email: "ana@colegio.cl",
      consent: true,
      consentVersion: "2026-01",
      source: "contact-form",
      status: "new",
      idempotencyKey: "idem-test-0001",
    });
  });

  it("deduplicates a retried submission via idempotencyKey", async () => {
    const fetchMock = vi.fn(async (_input: string | URL, init?: RequestInit) => {
      const isCreate = init?.method === "POST";
      const body = isCreate
        ? JSON.stringify({ data: { documentId: "lead-abc123" } })
        : JSON.stringify({ data: [{ documentId: "lead-existing" }] });
      return new Response(body, { status: 200, headers: { "content-type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await callPost(VALID_BODY);

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({ ok: true });
    const createCalls = fetchMock.mock.calls.filter(
      ([, init]: [unknown, RequestInit?]) => init?.method === "POST",
    );
    expect(createCalls).toHaveLength(0);
  });

  it("returns 503 without crashing when the token is missing", async () => {
    delete process.env.STRAPI_API_TOKEN;
    delete process.env.STRAPI_ADMIN_TOKEN;
    vi.resetModules();
    const fetchMock = stubStrapiFetch();

    const res = await callPost(VALID_BODY);

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({ ok: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a recoverable 503 when Strapi rejects the create", async () => {
    const fetchMock = vi.fn(async (_input: string | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        return new Response(JSON.stringify({ error: { message: "boom" } }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await callPost(VALID_BODY);

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({
      ok: false,
      errors: { form: expect.any(String) },
    });
  });
});
