import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./strapi", () => ({
  getSiteSettings: vi.fn(async () => ({
    siteName: "Ene Muebles",
    contactEmail: "contacto@ene-muebles.cl",
    whatsappNumber: "+569 9539 5339",
  })),
  REVALIDATE_SECONDS: 60,
  STRAPI_URL: "http://cms:1337",
}));

import {
  getLegalFallback,
  getLegalPage,
  getLegalSeed,
  getPublishedPrivacyVersion,
} from "./legal-pages";

const response = (data: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(data), { status }));

function legalRecord(code: "terms" | "privacy", overrides: Record<string, unknown> = {}) {
  const seed = getLegalSeed(code);
  return {
    ...seed,
    sections: seed.sections.map((section) => ({
      heading: section.heading,
      paragraphs: section.paragraphs.map((text) => ({ text })),
    })),
    ...overrides,
  };
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

describe("public legal reader", () => {
  it("returns one validated matching published document with source and version", async () => {
    const record = {
      ...getLegalSeed("terms"),
      sections: getLegalSeed("terms").sections.map((section) => ({
        heading: section.heading,
        paragraphs: section.paragraphs.map((text) => ({ text })),
      })),
    };
    vi.mocked(fetch).mockImplementation(() => response({ data: [record] }));
    const page = await getLegalPage("terms");
    expect(page.source).toBe("cms");
    expect(page.version).toBe("2026-01");
    expect(page.sections[0].paragraphs[0]).toContain("Ene Muebles");
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain("pagination%5BpageSize%5D=2");
  });

  it("drops malformed metadata independently without discarding valid legal body content", async () => {
    const record = legalRecord("terms", {
      metadataTitle: 42,
      metadataDescription: "Descripción legal válida",
    });
    vi.mocked(fetch).mockImplementation(() => response({ data: [record] }));

    const page = await getLegalPage("terms");
    expect(page.source).toBe("cms");
    expect(page.title).toBe(getLegalSeed("terms").title);
    expect(page.metadataTitle).toBeUndefined();
    expect(page.metadataDescription).toBe("Descripción legal válida");
  });

  it.each([
    ["zero", { data: [] }],
    ["multiple", { data: [getLegalSeed("terms"), getLegalSeed("terms")] }],
    ["malformed", { data: [{ code: "terms" }] }],
    ["unknown token", { data: [{ ...getLegalSeed("terms"), title: "{{unsafe}}" }] }],
  ])(
    "falls back atomically for %s records",
    async (_name: string, envelope: { data: unknown[] }) => {
      vi.mocked(fetch).mockImplementation(() => response(envelope));
      await expect(getLegalPage("terms")).resolves.toEqual(getLegalFallback("terms"));
    },
  );

  it.each([
    ["template token", "{{siteName}}"],
    ["brace syntax", "2026{01"],
    ["malformed identifier", "2026 01"],
  ])("falls back atomically for an invalid %s version", async (_name: string, version: string) => {
    vi.mocked(fetch).mockImplementation(() =>
      response({ data: [legalRecord("terms", { version })] }),
    );
    await expect(getLegalPage("terms")).resolves.toEqual(getLegalFallback("terms"));
  });

  it.each(["{{{siteName}}}", "Stray { brace", "Stray } brace"])(
    "rejects malformed legal template syntax (%s)",
    async (title: string) => {
      vi.mocked(fetch).mockImplementation(() =>
        response({ data: [legalRecord("terms", { title })] }),
      );
      await expect(getLegalPage("terms")).resolves.toEqual(getLegalFallback("terms"));
    },
  );

  it("falls back atomically on network and HTTP failures", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
    await expect(getLegalPage("privacy")).resolves.toEqual(getLegalFallback("privacy"));
    vi.mocked(fetch).mockImplementationOnce(() => response({ error: true }, 500));
    await expect(getLegalPage("privacy")).resolves.toEqual(getLegalFallback("privacy"));
  });

  it("keeps the other page independent when one page is invalid", async () => {
    vi.mocked(fetch)
      .mockImplementationOnce(() => response({ data: [{ code: "terms" }] }))
      .mockImplementationOnce(() =>
        response({
          data: [
            {
              ...getLegalSeed("privacy"),
              sections: getLegalSeed("privacy").sections.map((section) => ({
                heading: section.heading,
                paragraphs: section.paragraphs.map((text) => ({ text })),
              })),
            },
          ],
        }),
      );
    expect((await getLegalPage("terms")).source).toBe("fallback");
    expect((await getLegalPage("privacy")).source).toBe("cms");
  });
});

describe("privacy consent authority", () => {
  it("uses the exact fallback version only when no published document exists", async () => {
    vi.mocked(fetch).mockImplementation(() => response({ data: [] }));
    await expect(getPublishedPrivacyVersion()).resolves.toBe("2026-01");
  });

  it.each([
    ["multiple", { data: [getLegalSeed("privacy"), getLegalSeed("privacy")] }],
    ["malformed", { data: [{ code: "privacy", version: "2026-02" }] }],
  ])("fails closed for %s records", async (_name: string, envelope: { data: unknown[] }) => {
    vi.mocked(fetch).mockImplementation(() => response(envelope));
    await expect(getPublishedPrivacyVersion()).rejects.toThrow();
  });

  it.each(["{{siteName}}", "2026{01", "2026 01"])(
    "fails closed for invalid published privacy version %s",
    async (version: string) => {
      vi.mocked(fetch).mockImplementation(() =>
        response({ data: [legalRecord("privacy", { version })] }),
      );
      await expect(getPublishedPrivacyVersion()).rejects.toThrow("Malformed legal version");
    },
  );

  it("fails closed for network, HTTP, and invalid JSON failures", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
    await expect(getPublishedPrivacyVersion()).rejects.toThrow();
    vi.mocked(fetch).mockImplementationOnce(() => response({}, 500));
    await expect(getPublishedPrivacyVersion()).rejects.toThrow();
    vi.mocked(fetch).mockResolvedValueOnce(new Response("not json", { status: 200 }));
    await expect(getPublishedPrivacyVersion()).rejects.toThrow();
  });
});
