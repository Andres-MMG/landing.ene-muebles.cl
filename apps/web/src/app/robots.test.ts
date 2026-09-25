import { afterEach, describe, expect, it } from "vitest";
import robots from "./robots";

const original = process.env.NEXT_PUBLIC_SITE_URL;
afterEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = original;
});

describe("robots", () => {
  it("keeps exact code-owned directives and resolves host/sitemap from the shared origin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:4780/";
    expect(robots()).toEqual({
      rules: [{ userAgent: "*", allow: "/", disallow: ["/admin/", "/api/"] }],
      sitemap: "http://localhost:4780/sitemap.xml",
      host: "http://localhost:4780",
    });
  });
});
