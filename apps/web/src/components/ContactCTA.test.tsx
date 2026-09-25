import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ContactCTA } from "./ContactCTA";

describe("ContactCTA", () => {
  it("renders the CMS eyebrow and email label when an email exists", () => {
    const html = renderToStaticMarkup(
      <ContactCTA
        settings={{ siteName: "ENE-MUEBLES", contactEmail: "ventas@example.cl" }}
        section={{
          eyebrow: "PROYECTOS",
          emailLabel: "ESCRÍBENOS",
          title: "Título CMS",
          body: "Cuerpo CMS",
          buttonLabel: "Cotizar",
        }}
      />,
    );

    expect(html).toContain("PROYECTOS");
    expect(html).toContain("ESCRÍBENOS · ventas@example.cl");
    expect(html).toContain('href="mailto:ventas@example.cl"');
  });

  it("uses the exact legacy labels when the optional fields are absent", () => {
    const html = renderToStaticMarkup(
      <ContactCTA
        settings={{ siteName: "ENE-MUEBLES", contactEmail: "contacto@example.cl" }}
        section={{ title: "Título CMS", body: "Cuerpo CMS", buttonLabel: "Cotizar" }}
      />,
    );

    expect(html).toContain("Hablemos");
    expect(html).toContain("Correo · contacto@example.cl");
  });

  it("does not render an email label when contactEmail is absent", () => {
    const html = renderToStaticMarkup(
      <ContactCTA
        settings={{ siteName: "ENE-MUEBLES" }}
        section={{
          eyebrow: "PROYECTOS",
          emailLabel: "ESCRÍBENOS",
          title: "Título CMS",
          body: "Cuerpo CMS",
          buttonLabel: "Cotizar",
        }}
      />,
    );

    expect(html).toContain("PROYECTOS");
    expect(html).not.toContain("ESCRÍBENOS");
    expect(html).not.toContain("mailto:");
  });
});
