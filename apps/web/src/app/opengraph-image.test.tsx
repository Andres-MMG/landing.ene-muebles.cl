import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/og", () => ({
  ImageResponse: vi.fn(),
}));

import { ImageResponse } from "next/og";
import OpengraphImage, { size } from "./opengraph-image";

describe("OpengraphImage", () => {
  const imageResponse = vi.mocked(ImageResponse);

  beforeEach(() => {
    imageResponse.mockReset();
  });

  it("omits fonts so ImageResponse uses its default fallback when the font fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unavailable")));

    await OpengraphImage();

    expect(imageResponse).toHaveBeenCalledOnce();
    expect(imageResponse.mock.calls[0][1]).toEqual(size);
    expect(imageResponse.mock.calls[0][1]).not.toHaveProperty("fonts");
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
        .mockResolvedValueOnce({ arrayBuffer: async () => data })
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
