import { describe, expect, it, vi } from "vitest";

vi.mock("@strapi/strapi", () => ({
  factories: {
    createCoreRouter: (uid: string, config?: unknown) => ({ uid, config }),
  },
}));

import aboutSectionRouter from "../api/about-section/routes/about-section";
import catalogPageRouter from "../api/catalog-page/routes/catalog-page";
import categoryRouter from "../api/category/routes/category";
import contactCtaSectionRouter from "../api/contact-cta-section/routes/contact-cta-section";
import contactPageRouter from "../api/contact-page/routes/contact-page";
import footerBlockRouter from "../api/footer-block/routes/footer-block";
import heroSectionRouter from "../api/hero-section/routes/hero-section";
import homePageRouter from "../api/home-page/routes/home-page";
import legalPageRouter from "../api/legal-page/routes/legal-page";
import productRouter from "../api/product/routes/product";
import siteSettingRouter from "../api/site-setting/routes/site-setting";
import subcategoryRouter from "../api/subcategory/routes/subcategory";

const POLICY = "global::require-api-token-for-draft";

type CapturedRouter = {
  uid: string;
  config?: {
    config?: Record<string, { policies?: string[] }>;
  };
};

const singletonRouters = [
  aboutSectionRouter,
  catalogPageRouter,
  contactCtaSectionRouter,
  contactPageRouter,
  footerBlockRouter,
  heroSectionRouter,
  homePageRouter,
  siteSettingRouter,
] as unknown as CapturedRouter[];

const collectionRouters = [
  categoryRouter,
  legalPageRouter,
  productRouter,
  subcategoryRouter,
] as unknown as CapturedRouter[];

describe("Draft & Publish REST router policy wiring", () => {
  it("covers exactly the 12 scoped Draft & Publish routers", () => {
    expect([...singletonRouters, ...collectionRouters].map(({ uid }) => uid).sort()).toEqual([
      "api::about-section.about-section",
      "api::catalog-page.catalog-page",
      "api::category.category",
      "api::contact-cta-section.contact-cta-section",
      "api::contact-page.contact-page",
      "api::footer-block.footer-block",
      "api::hero-section.hero-section",
      "api::home-page.home-page",
      "api::legal-page.legal-page",
      "api::product.product",
      "api::site-setting.site-setting",
      "api::subcategory.subcategory",
    ]);
  });

  it.each(singletonRouters)("protects singleton $uid find reads", (router) => {
    expect(router.config?.config).toEqual({
      find: { policies: [POLICY] },
    });
  });

  it.each(collectionRouters)("protects collection $uid find and findOne reads", (router) => {
    expect(router.config?.config).toEqual({
      find: { policies: [POLICY] },
      findOne: { policies: [POLICY] },
    });
  });
});
