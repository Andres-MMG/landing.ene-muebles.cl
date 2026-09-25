import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/og", () => ({
  ImageResponse: vi.fn(),
}));

const getSiteSettings = vi.hoisted(() => vi.fn());
vi.mock("@/lib/strapi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/strapi")>();
  return { ...actual, getSiteSettings };
});

import { ImageResponse } from "next/og";
import OpengraphImage, { size } from "./opengraph-image";

describe("OpengraphImage", () => {
  const imageResponse = vi.mocked(ImageResponse);

  beforeEach(() => {
    imageResponse.mockReset();
    getSiteSettings.mockResolvedValue({
      seoShareImageKicker: undefined,
      seoShareImageTitle: undefined,
      seoShareImageDescription: undefined,
      seoShareImageFooter: undefined,
    });
  });

  it("omits fonts so ImageResponse uses its default fallback when the font fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unavailable")));

    await OpengraphImage();

    expect(imageResponse).toHaveBeenCalledOnce();
    expect(imageResponse.mock.calls[0][1]).toEqual(size);
    expect(imageResponse.mock.calls[0][1]).not.toHaveProperty("fonts");
  });

  it("renders Site Setting share copy while retaining code-owned image geometry", async () => {
    getSiteSettings.mockResolvedValue({
      seoShareImageKicker: "Kicker CMS",
      seoShareImageTitle: "Título CMS",
      seoShareImageDescription: "Descripción CMS",
      seoShareImageFooter: "Pie CMS",
    });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unavailable")));

    await OpengraphImage();

    const tree = JSON.stringify(imageResponse.mock.calls[0][0]);
    expect(tree).toContain("Kicker CMS");
    expect(tree).toContain("Título CMS");
    expect(tree).toContain("Descripción CMS");
    expect(tree).toContain("Pie CMS");
    expect(imageResponse.mock.calls[0][1]).toEqual(size);
  });

  it("passes the brand font when it loads successfully", async () => {
    const data = new ArrayBuffer(8);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          text: async () => "src: url(https://fonts.gstatic.com/hanken.woff2)",
        })
        .mockResolvedValueOnce({ arrayBuffer: async () => data }),
    );

    await OpengraphImage();

    expect(imageResponse.mock.calls[0][1]).toMatchObject({
      ...size,
      fonts: [
        {
          name: "Hanken Grotesk",
          data,
          weight: 600,
          style: "normal",
        },
      ],
    });
  });
});
