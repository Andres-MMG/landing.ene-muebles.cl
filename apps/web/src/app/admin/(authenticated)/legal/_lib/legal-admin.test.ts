import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getStrapiAdminToken = vi.hoisted(() => vi.fn(() => "service-token"));
vi.mock("@/lib/admin/strapi-admin", () => ({ getStrapiAdminToken }));

import { getLegalPageForAdmin } from "./legal-admin";

const ORIGINAL_ENV = { ...process.env };

function response(status: number, body: unknown): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function legalRecord(overrides: Record<string, unknown> = {}) {
  return {
    documentId: "legal-doc",
    code: "terms",
    eyebrow: "Legal",
    title: "Terms",
    intro: "Intro",
    tocLabel: "Content",
    updatedLabel: "Updated",
    effectiveDate: "2026-01-01",
    version: "2026-01",
    updatedAt: "2026-01-02T00:00:00.000Z",
    sections: [
      {
        id: 10,
        heading: "Heading",
        paragraphs: [{ id: 20, text: "Paragraph" }],
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...ORIGINAL_ENV, STRAPI_INTERNAL_URL: "http://cms:1337" };
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  vi.unstubAllGlobals();
});

describe("getLegalPageForAdmin", () => {
  it("uses the service token, draft status, nested populate, page size 2, and no-store", async () => {
    vi.mocked(fetch).mockImplementationOnce(() => response(200, { data: [legalRecord()] }));

    await expect(getLegalPageForAdmin("terms")).resolves.toEqual({
      metadataTitle: "",
      metadataDescription: "",
      eyebrow: "Legal",
      title: "Terms",
      intro: "Intro",
      tocLabel: "Content",
      updatedLabel: "Updated",
      effectiveDate: "2026-01-01",
      version: "2026-01",
      updatedAt: "2026-01-02T00:00:00.000Z",
      sections: [{ heading: "Heading", paragraphs: [{ text: "Paragraph" }] }],
    });

    expect(getStrapiAdminToken).toHaveBeenCalledOnce();
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain("filters%5Bcode%5D%5B%24eq%5D=terms");
    expect(url).toContain("status=draft");
    expect(url).toContain("pagination%5BpageSize%5D=2");
    expect(url).toContain("populate%5Bsections%5D%5Bpopulate%5D%5Bparagraphs%5D=true");
    expect(init.cache).toBe("no-store");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer service-token");
  });

  it.each([
    ["zero records", { data: [] }],
    ["multiple records", { data: [legalRecord(), { ...legalRecord(), documentId: "other" }] }],
    ["malformed envelope", { result: legalRecord() }],
    ["malformed section", { data: [{ ...legalRecord(), sections: [{ heading: "Bad" }] }] }],
    ["missing updatedAt", { data: [{ ...legalRecord(), updatedAt: undefined }] }],
    ["invalid updatedAt", { data: [{ ...legalRecord(), updatedAt: "not-a-timestamp" }] }],
  ])("fails closed for %s", async (_name: string, body: unknown) => {
    vi.mocked(fetch).mockImplementationOnce(() => response(200, body));
    await expect(getLegalPageForAdmin("terms")).rejects.toThrow();
  });

  it("fails closed for HTTP, network, and invalid JSON failures", async () => {
    vi.mocked(fetch).mockImplementationOnce(() => response(500, { error: true }));
    await expect(getLegalPageForAdmin("privacy")).rejects.toThrow("(500)");

    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
    await expect(getLegalPageForAdmin("privacy")).rejects.toThrow("offline");

    vi.mocked(fetch).mockResolvedValueOnce(new Response("not-json", { status: 200 }));
    await expect(getLegalPageForAdmin("privacy")).rejects.toThrow();
  });

  it.each([
    ["wrong fixed code", legalRecord({ code: "privacy" })],
    ["missing documentId", legalRecord({ documentId: undefined })],
    ["blank documentId", legalRecord({ documentId: "   " })],
    ["missing required title", legalRecord({ title: undefined })],
    ["blank required title", legalRecord({ title: "   " })],
    ["oversized required title", legalRecord({ title: "x".repeat(181) })],
    ["invalid effective date", legalRecord({ effectiveDate: "2026-02-30" })],
    ["invalid version", legalRecord({ version: "{{siteName}}" })],
    ["invalid optional metadata", legalRecord({ metadataTitle: 42 })],
    ["zero sections", legalRecord({ sections: [] })],
    [
      "too many sections",
      legalRecord({ sections: Array.from({ length: 21 }, () => legalRecord().sections[0]) }),
    ],
    [
      "blank section heading",
      legalRecord({ sections: [{ heading: " ", paragraphs: [{ text: "Paragraph" }] }] }),
    ],
    ["zero paragraphs", legalRecord({ sections: [{ heading: "Heading", paragraphs: [] }] })],
    [
      "too many paragraphs",
      legalRecord({
        sections: [
          {
            heading: "Heading",
            paragraphs: Array.from({ length: 7 }, () => ({ text: "Paragraph" })),
          },
        ],
      }),
    ],
    [
      "blank paragraph",
      legalRecord({ sections: [{ heading: "Heading", paragraphs: [{ text: " " }] }] }),
    ],
    [
      "oversized paragraph",
      legalRecord({ sections: [{ heading: "Heading", paragraphs: [{ text: "x".repeat(1201) }] }] }),
    ],
  ])("rejects a 200 response with %s", async (_name: string, record: unknown) => {
    vi.mocked(fetch).mockImplementationOnce(() => response(200, { data: [record] }));

    await expect(getLegalPageForAdmin("terms")).rejects.toThrow();
  });

  it("permits Strapi-owned record, component, and timestamp fields", async () => {
    vi.mocked(fetch).mockImplementationOnce(() =>
      response(200, {
        data: [
          legalRecord({
            id: 1,
            createdAt: "2026-01-01T00:00:00.000Z",
            publishedAt: null,
            sections: [
              {
                id: 10,
                heading: "Heading",
                paragraphs: [{ id: 20, text: "Paragraph" }],
              },
            ],
          }),
        ],
      }),
    );

    await expect(getLegalPageForAdmin("terms")).resolves.toMatchObject({
      title: "Terms",
      sections: [{ heading: "Heading", paragraphs: [{ text: "Paragraph" }] }],
    });
  });
});
