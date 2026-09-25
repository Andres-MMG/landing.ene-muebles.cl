import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appRoot = new URL("./", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, appRoot), "utf8");

const owners = [
  {
    proxy: "api/admin/home-page/route.ts",
    loader: "admin/(authenticated)/inicio/page.tsx",
    api: "home-page",
  },
  {
    proxy: "api/admin/catalog-page/route.ts",
    loader: "admin/(authenticated)/pagina-catalogo/page.tsx",
    api: "catalog-page",
  },
  {
    proxy: "api/admin/contact-page/route.ts",
    loader: "admin/(authenticated)/pagina-contacto/page.tsx",
    api: "contact-page",
  },
  {
    proxy: "api/admin/about-section/route.ts",
    loader: "admin/(authenticated)/about/page.tsx",
    api: "about-section",
  },
] as const;

describe("WU4C admin publication status contract", () => {
  it.each(owners)(
    "$api reads drafts and writes published content explicitly",
    ({ proxy, loader, api }: (typeof owners)[number]) => {
      const proxySource = read(proxy);
      const loaderSource = read(loader);
      expect(loaderSource).toContain(`/api/${api}`);
      expect(loaderSource).toContain("status=draft");
      expect(proxySource).toContain("draft");
      expect(proxySource).toContain("published");
    },
  );
});
