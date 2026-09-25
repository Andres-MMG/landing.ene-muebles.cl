import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireAdmin = vi.hoisted(() => vi.fn());
const strapiAuthFailure = vi.hoisted(() =>
  vi.fn(() => Response.json({ error: "Strapi auth" }, { status: 502 })),
);

vi.mock("@/lib/admin/require-admin", () => ({ requireAdmin, strapiAuthFailure }));
vi.mock("@/lib/admin/strapi-admin", () => ({ getStrapiAdminToken: () => "token" }));
const revalidateTag = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ revalidateTag }));

import { getLegalSeed } from "@/lib/legal-pages";

const ORIGINAL_ENV = { ...process.env };

function body() {
  const seed = getLegalSeed("privacy");
  return {
    eyebrow: seed.eyebrow,
    title: seed.title,
    intro: seed.intro,
    tocLabel: seed.tocLabel,
    updatedLabel: seed.updatedLabel,
    effectiveDate: seed.effectiveDate,
    version: seed.version,
    expectedUpdatedAt: "2026-01-02T00:00:00.000Z",
    sections: seed.sections.map((section) => ({
      heading: section.heading,
      paragraphs: section.paragraphs.map((text) => ({ text })),
    })),
  };
}

function record(overrides: Record<string, unknown> = {}) {
  return {
    documentId: "privacy-doc",
    code: "privacy",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...body(),
    ...overrides,
  };
}

function json(status: number, value: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(value), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

async function put(value: unknown) {
  const { PUT } = await import("./route");
  return PUT(
    new Request("http://localhost/api/admin/legal/privacy", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    }) as never,
  );
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue({ active: true });
  process.env = { ...ORIGINAL_ENV, STRAPI_INTERNAL_URL: "http://cms:1337" };
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  vi.unstubAllGlobals();
});

describe("fixed privacy admin proxy", () => {
  it("requires an active admin and performs an exact draft query", async () => {
    requireAdmin.mockResolvedValueOnce(null);
    const { GET } = await import("./route");
    expect((await GET()).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();

    requireAdmin.mockResolvedValueOnce({ active: true });
    vi.mocked(fetch).mockImplementationOnce(() => json(200, { data: [record()] }));
    expect((await GET()).status).toBe(200);
    const url = String(vi.mocked(fetch).mock.calls[0][0]);
    expect(url).toContain("filters%5Bcode%5D%5B%24eq%5D=privacy");
    expect(url).toContain("status=draft");
    expect(url).toContain("pagination%5BpageSize%5D=2");
  });

  it("rejects stale tabs and unknown tokens before writing", async () => {
    vi.mocked(fetch).mockImplementationOnce(() => json(200, { data: [record()] }));
    expect((await put({ ...body(), expectedUpdatedAt: "2025-01-01T00:00:00.000Z" })).status).toBe(
      409,
    );
    expect(fetch).toHaveBeenCalledTimes(1);

    vi.mocked(fetch).mockClear();
    expect((await put({ ...body(), title: "{{unknown}}" })).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("requires a valid expectedUpdatedAt before reading or writing", async () => {
    const missing = { ...body() } as Record<string, unknown>;
    delete missing.expectedUpdatedAt;

    expect((await put(missing)).status).toBe(400);
    expect((await put({ ...body(), expectedUpdatedAt: "not-a-timestamp" })).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(["{{siteName}}", "2026{01", "2026 01"])(
    "rejects the invalid legal version %s before reading or writing",
    async (version: string) => {
      expect((await put({ ...body(), version })).status).toBe(400);
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it.each(["{{{siteName}}}", "Stray { brace", "Stray } brace"])(
    "rejects malformed template syntax %s before reading or writing",
    async (title: string) => {
      expect((await put({ ...body(), title })).status).toBe(400);
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("requires a new version for material privacy changes but permits a pure no-op", async () => {
    vi.mocked(fetch)
      .mockImplementationOnce(() => json(200, { data: [record()] }))
      .mockImplementationOnce(() => json(200, { data: [record()] }));
    expect((await put({ ...body(), intro: "Changed privacy copy" })).status).toBe(409);

    vi.mocked(fetch).mockClear();
    vi.mocked(fetch)
      .mockImplementationOnce(() => json(200, { data: [record()] }))
      .mockImplementationOnce(() => json(200, { data: [record()] }))
      .mockImplementationOnce(() => json(200, { data: record() }));
    expect((await put(body())).status).toBe(200);
    const write = vi.mocked(fetch).mock.calls[2];
    const writeUrl = new URL(String(write[0]));
    expect(writeUrl.pathname).toBe("/api/legal-pages/privacy-doc");
    expect(writeUrl.searchParams.get("status")).toBe("published");
    expect(writeUrl.searchParams.get("populate[sections][populate][paragraphs]")).toBe("true");
    const sent = JSON.parse(String((write[1] as RequestInit).body)) as {
      data: Record<string, unknown>;
    };
    expect(sent.data).not.toHaveProperty("code");
    expect(sent.data).not.toHaveProperty("expectedUpdatedAt");
    expect(JSON.stringify(sent.data)).not.toContain('"id"');
    expect(revalidateTag).toHaveBeenCalledWith("legal-pages", { expire: 0 });
  });

  it("permits metadata-only privacy edits without a version bump while retaining concurrency", async () => {
    vi.mocked(fetch)
      .mockImplementationOnce(() => json(200, { data: [record()] }))
      .mockImplementationOnce(() => json(200, { data: [record()] }))
      .mockImplementationOnce(() => json(200, { data: record() }));

    const response = await put({ ...body(), metadataTitle: "Privacidad SEO" });
    expect(response.status).toBe(200);
    const write = vi.mocked(fetch).mock.calls[2];
    const sent = JSON.parse(String((write[1] as RequestInit).body)) as {
      data: Record<string, unknown>;
    };
    expect(sent.data.metadataTitle).toBe("Privacidad SEO");
    expect(sent.data.version).toBe(body().version);
  });

  it("fails closed when the draft concurrency timestamp is absent", async () => {
    vi.mocked(fetch).mockImplementationOnce(() =>
      json(200, { data: [record({ updatedAt: undefined })] }),
    );

    const { GET } = await import("./route");
    expect((await GET()).status).toBe(502);
  });

  it("maps Strapi 401 and invalid cardinality fail closed", async () => {
    vi.mocked(fetch).mockImplementationOnce(() => json(401, {}));
    const { GET } = await import("./route");
    expect((await GET()).status).toBe(502);
    expect(strapiAuthFailure).toHaveBeenCalledOnce();

    vi.mocked(fetch).mockImplementationOnce(() =>
      json(200, { data: [record(), record({ documentId: "other" })] }),
    );
    expect((await GET()).status).toBe(502);
  });

  it("requires draft and published privacy rows to share one document identity", async () => {
    vi.mocked(fetch)
      .mockImplementationOnce(() => json(200, { data: [record()] }))
      .mockImplementationOnce(() => json(200, { data: [record({ documentId: "other-doc" })] }));

    expect((await put(body())).status).toBe(502);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it.each([
    ["wrong code", record({ code: "terms" })],
    ["missing identity", record({ documentId: undefined })],
    ["malformed content", record({ sections: [{ heading: "Heading", paragraphs: [] }] })],
  ])(
    "rejects malformed published privacy content before writing: %s",
    async (_label: string, published: unknown) => {
      vi.mocked(fetch)
        .mockImplementationOnce(() => json(200, { data: [record()] }))
        .mockImplementationOnce(() => json(200, { data: [published] }));

      expect((await put(body())).status).toBe(502);
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(revalidateTag).not.toHaveBeenCalled();
    },
  );
});
