import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(process.cwd(), "apps/web/src/components/AdminHeader.tsx"), "utf8");

describe("AdminHeader", () => {
  it("links the brand to the canonical product-list route", () => {
    expect(source).toContain('href={"/admin/productos" as never}');
  });
});
