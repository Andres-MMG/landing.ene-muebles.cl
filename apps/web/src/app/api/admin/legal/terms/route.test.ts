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
  const seed = getLegalSeed("terms");
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
    documentId: "terms-doc",
    code: "terms",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...body(),
    ...overrides,
  };
}

function json(status: number, value: unknown): Promise<Response> {
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
    new Request("http://localhost/api/admin/legal/terms", {
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

describe("fixed terms admin proxy", () => {
  it("closes GET over the terms code and draft status", async () => {
    vi.mocked(fetch).mockImplementationOnce(() => json(200, { data: [record()] }));
    const { GET } = await import("./route");

    expect((await GET()).status).toBe(200);
    const url = String(vi.mocked(fetch).mock.calls[0][0]);
    expect(url).toContain("filters%5Bcode%5D%5B%24eq%5D=terms");
    expect(url).toContain("status=draft");
    expect(url).not.toContain("privacy");
  });

  it("publishes only the resolved terms document and never accepts body code authority", async () => {
    vi.mocked(fetch)
      .mockImplementationOnce(() => json(200, { data: [record()] }))
      .mockImplementationOnce(() => json(200, { data: record() }));

    expect((await put(body())).status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
    const write = vi.mocked(fetch).mock.calls[1];
    const writeUrl = new URL(String(write[0]));
    expect(writeUrl.pathname).toBe("/api/legal-pages/terms-doc");
    expect(writeUrl.searchParams.get("status")).toBe("published");
    expect(writeUrl.searchParams.get("populate[sections][populate][paragraphs]")).toBe("true");
    const sent = JSON.parse(String((write[1] as RequestInit).body)) as {
      data: Record<string, unknown>;
    };
    expect(sent.data).not.toHaveProperty("code");
    expect(sent.data).not.toHaveProperty("expectedUpdatedAt");
    expect(revalidateTag).toHaveBeenCalledWith("legal-pages", { expire: 0 });

    vi.mocked(fetch).mockClear();
    expect((await put({ ...body(), code: "privacy" })).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ["wrong code", record({ code: "privacy" })],
    ["missing document identity", record({ documentId: undefined })],
    ["blank document identity", record({ documentId: "   " })],
    ["incomplete content", record({ sections: [] })],
    [
      "malformed nested content",
      record({ sections: [{ heading: "Heading", paragraphs: [{ text: "" }] }] }),
    ],
  ])(
    "rejects a malformed draft 200 before writing: %s",
    async (_label: string, current: unknown) => {
      vi.mocked(fetch).mockImplementationOnce(() => json(200, { data: [current] }));

      expect((await put(body())).status).toBe(502);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(revalidateTag).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["wrong code", record({ code: "privacy" })],
    ["different document identity", record({ documentId: "other-doc" })],
    ["blank document identity", record({ documentId: " " })],
    ["incomplete record", { documentId: "terms-doc", code: "terms" }],
    ["null data", null],
  ])(
    "rejects a malformed or mismatched successful PUT response: %s",
    async (_label: string, saved: unknown) => {
      vi.mocked(fetch)
        .mockImplementationOnce(() => json(200, { data: [record()] }))
        .mockImplementationOnce(() => json(200, { data: saved }));

      expect((await put(body())).status).toBe(502);
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(revalidateTag).not.toHaveBeenCalled();
    },
  );
});
