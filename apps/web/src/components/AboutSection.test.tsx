import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AboutSection, compactStatText } from "./AboutSection";

const baseProps = {
  siteName: "ENE-MUEBLES",
  productCount: 7,
  categoryCount: 3,
};

describe("AboutSection", () => {
  it("preserves the exact current labels and warranty when new CMS fields are absent", () => {
    const html = renderToStaticMarkup(<AboutSection {...baseProps} />);

    expect(html).toContain("Productos en catálogo");
    expect(html).toContain("Líneas de producto");
    expect(html).toContain("Cobertura");
    expect(html).toContain("Garantía");
    expect(html).toContain(">07<");
    expect(html).toContain(">03<");
    expect(html).toContain(">1 año<");
  });

  it("uses CMS labels and the Site Setting warranty while keeping counts derived", () => {
    const section = {
      eyebrow: "Datos CMS",
      title: "Título CMS",
      productCountLabel: "Productos CMS",
      productLineCountLabel: "Líneas CMS",
      coverageLabel: "Despacho CMS",
      warrantyLabel: "Respaldo CMS",
    };

    const html = renderToStaticMarkup(
      <AboutSection
        {...baseProps}
        productCount={12}
        categoryCount={4}
        dispatchCoverage="Cobertura configurada"
        warrantyText="Garantía escrita de 24 meses"
        section={section}
      />,
    );

    expect(html).toContain("Productos CMS");
    expect(html).toContain("Líneas CMS");
    expect(html).toContain("Despacho CMS");
    expect(html).toContain("Respaldo CMS");
    expect(html).toContain(">12<");
    expect(html).toContain(">04<");
    expect(html).toContain("Cobertura configurada");
    expect(html).toContain("Garantía escrita de 24 meses");
  });

  it("bounds compact business facts without changing short fallback copy", () => {
    expect(compactStatText(undefined, "1 año")).toBe("1 año");
    expect(compactStatText("  Garantía   escrita  ", "1 año")).toBe("Garantía escrita");

    const bounded = compactStatText("x".repeat(500), "1 año");
    expect(bounded).toHaveLength(160);
    expect(bounded.endsWith("…")).toBe(true);
  });
});
