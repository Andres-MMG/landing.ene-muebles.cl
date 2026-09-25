import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CategoryGrid } from "./CategoryGrid";
import { FeaturedProducts } from "./FeaturedProducts";
import type { HomePage, Product } from "@/lib/strapi";

const content: HomePage = {
  catalogEyebrow: "CATÁLOGO CMS",
  catalogTitle: "TÍTULO CATÁLOGO CMS",
  catalogBody: "CUERPO CATÁLOGO CMS",
  catalogCtaLabel: "CTA CATÁLOGO CMS",
  featuredEyebrow: "DESTACADOS CMS",
  featuredTitle: "TÍTULO DESTACADOS CMS",
  featuredBody: "CUERPO DESTACADOS CMS",
  featuredCtaLabel: "CTA DESTACADOS CMS",
};

describe("homepage editorial consumers", () => {
  it("renders catalog section copy from the Home Page singleton", () => {
    const html = renderToStaticMarkup(
      <CategoryGrid
        categories={[{ id: 1, name: "Oficina", slug: "oficina", description: "Desc", image: null }]}
        content={content}
      />,
    );
    expect(html).toContain("CATÁLOGO CMS");
    expect(html).toContain("TÍTULO CATÁLOGO CMS");
    expect(html).toContain("CUERPO CATÁLOGO CMS");
    expect(html).toContain("CTA CATÁLOGO CMS");
  });

  it("renders featured section copy from the Home Page singleton", () => {
    const product: Product = {
      id: 1,
      name: "Silla",
      slug: "silla",
      description: "Desc",
      price: 0,
      currency: "CLP",
      images: [],
    };
    const html = renderToStaticMarkup(<FeaturedProducts products={[product]} content={content} />);
    expect(html).toContain("DESTACADOS CMS");
    expect(html).toContain("TÍTULO DESTACADOS CMS");
    expect(html).toContain("CUERPO DESTACADOS CMS");
    expect(html).toContain("CTA DESTACADOS CMS");
  });

  it("passes product action copy through the featured grid", () => {
    const product: Product = {
      id: 2,
      name: "Mesa destacada",
      slug: "mesa-destacada",
      description: "Desc",
      price: 0,
      currency: "CLP",
      images: [],
    };
    const html = renderToStaticMarkup(
      <FeaturedProducts
        products={[product]}
        content={content}
        whatsappNumber="+56912345678"
        actionCopy={{
          detailLabel: "Ficha destacada CMS",
          whatsappLabel: "Cotizar destacada CMS",
          whatsappMessageTemplate: "Destacado: {productName}.",
        }}
      />,
    );

    expect(html).toContain("Ficha destacada CMS");
    expect(html).toContain("Cotizar destacada CMS");
    expect(html).toContain(
      'href="https://wa.me/56912345678?text=Destacado%3A%20Mesa%20destacada."',
    );
  });
});
