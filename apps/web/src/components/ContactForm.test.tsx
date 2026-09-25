import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ContactForm, type ContactFormCopy } from "./ContactForm";

/**
 * lead-capture spec — ContactForm wiring tests.
 *
 * The repo's vitest environment is `node` (no jsdom), so interactivity
 * (clicks, state transitions) is out of reach. Following the existing
 * component test pattern (ProductCard.test.ts), this suite combines
 * `renderToStaticMarkup` rendering with source-level assertions for
 * the client-only behaviors.
 */

const formPath = join(process.cwd(), "apps/web/src/components/ContactForm.tsx");

const CURRENT_COPY: ContactFormCopy = {
  nameFieldLabel: "Nombre",
  institutionFieldLabel: "Institución o empresa",
  emailFieldLabel: "Correo",
  phoneFieldLabel: "Teléfono",
  productFieldLabel: "¿Sobre qué producto nos escribes?",
  generalInquiryLabel: "Pregunta general",
  regionFieldLabel: "Región",
  regionPlaceholder: "Selecciona una región",
  messageFieldLabel: "Cuéntanos qué necesitas",
  consentBeforeLink: "Acepto la",
  consentPrivacyLinkLabel: "política de privacidad",
  consentAfterLink: "y autorizo el uso de mis datos para recibir la cotización solicitada.",
  responseTimeText: "Respondemos en 24 h hábiles",
  submitLabel: "Enviar mensaje",
};

const renderForm = (props: Partial<Parameters<typeof ContactForm>[0]> = {}) =>
  renderToStaticMarkup(
    createElement(ContactForm, {
      copy: CURRENT_COPY,
      consentVersion: "2026-01",
      ...props,
    }),
  );

describe("ContactForm — rendering", () => {
  it("is a client component (posts to the API from the browser)", () => {
    const source = readFileSync(formPath, "utf8");
    expect(source).toContain('"use client"');
  });

  it("renders the form fields with a required consent checkbox", () => {
    const html = renderForm();

    expect(html).toContain('name="name"');
    expect(html).toContain('name="email"');
    expect(html).toContain('name="phone"');
    expect(html).toContain('name="region"');
    expect(html).toContain('name="message"');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('name="consent"');
    expect(html).toContain("required");
  });

  it("links the consent to the /privacidad policy", () => {
    const html = renderForm();
    expect(html).toContain('href="/privacidad"');
  });

  it("renders the complete bounded copy contract while keeping the privacy URL fixed", () => {
    const copy: ContactFormCopy = {
      nameFieldLabel: "Nombre CMS",
      institutionFieldLabel: "Institución CMS",
      emailFieldLabel: "Correo CMS",
      phoneFieldLabel: "Teléfono CMS",
      productFieldLabel: "Producto CMS",
      generalInquiryLabel: "Consulta CMS",
      regionFieldLabel: "Región CMS",
      regionPlaceholder: "Región inicial CMS",
      messageFieldLabel: "Mensaje CMS",
      consentBeforeLink: "Antes CMS",
      consentPrivacyLinkLabel: "Privacidad CMS",
      consentAfterLink: "Después CMS",
      responseTimeText: "Respuesta CMS",
      submitLabel: "Enviar CMS",
    };

    const html = renderForm({ copy });

    for (const value of Object.values(copy)) {
      expect(html).toContain(value);
    }
    expect(html).toContain('href="/privacidad"');
  });

  it("announces status through an aria-live region", () => {
    const html = renderForm();
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('role="status"');
  });

  it("renders a hidden honeypot field", () => {
    const html = renderForm();
    expect(html).toContain('name="website"');
    expect(html).toContain('tabindex="-1"');
  });

  it("renders only the nine supported regions", () => {
    const html = renderForm();
    for (const region of [
      "Valparaíso",
      "Metropolitana",
      "O'Higgins",
      "Maule",
      "Ñuble",
      "Biobío",
      "La Araucanía",
      "Los Ríos",
      "Los Lagos",
    ]) {
      expect(html).toContain(`value="${region.replace("'", "&#x27;")}"`);
    }
    expect(html).not.toContain('value="Arica y Parinacota"');
    expect(html).not.toContain('value="Magallanes"');
  });

  it("renders general inquiry first and preselects a product context", () => {
    const html = renderForm({
      productOptions: [
        { slug: "silla-escolar", name: "Silla escolar" },
        { slug: "mesa-docente", name: "Mesa docente" },
      ],
      initialProductSlug: "mesa-docente",
    });
    expect(html).toContain('name="productSlug"');
    expect(html.indexOf("Pregunta general")).toBeLessThan(html.indexOf("Silla escolar"));
    expect(html).toMatch(/value="mesa-docente"[^>]*selected/);
  });
});

describe("ContactForm — client behavior (source-level)", () => {
  it("posts JSON to /api/leads", () => {
    const source = readFileSync(formPath, "utf8");
    expect(source).toContain('fetch("/api/leads"');
    expect(source).toContain('method: "POST"');
    expect(source).toContain("JSON.stringify(payload)");
  });

  it("sends an idempotency key and the consent version", () => {
    const source = readFileSync(formPath, "utf8");
    expect(source).toContain("crypto.randomUUID()");
    expect(source).toContain("consentVersion");
    expect(source).toContain("consentVersion,");
    expect(source).not.toContain("CONSENT_VERSION");
    expect(source).toContain('productSlug: data.get("productSlug")');
  });

  it("wires field-level errors with aria-describedby and focuses the first error", () => {
    const source = readFileSync(formPath, "utf8");
    expect(source).toContain("aria-describedby");
    expect(source).toContain("aria-invalid");
    expect(source).toMatch(/focusFirstError/);
    expect(source).toContain(".focus()");
  });

  it("maps region errors to the select and preserves DOM focus order", () => {
    const source = readFileSync(formPath, "utf8");

    expect(source).toContain('region: "lead-region"');
    expect(source).toContain("aria-invalid={errors.region ? true : undefined}");
    expect(source).toContain(
      "aria-describedby={errors.region ? `${FIELD_IDS.region}-error` : undefined}",
    );
    expect(source).toContain("id={`${FIELD_IDS.region}-error`}");
    expect(source).toMatch(
      /\[\s*"name",\s*"email",\s*"phone",\s*"region",\s*"message",\s*"consent",?\s*\]/,
    );
  });

  it("resets the form only after a confirmed server success", () => {
    const source = readFileSync(formPath, "utf8");
    expect(source).toMatch(/res\.ok\s*&&\s*json\?\.ok/);
    expect(source).toContain("form.reset()");
  });

  it("regenerates the idempotency key on success so later submissions are not deduplicated", () => {
    const source = readFileSync(formPath, "utf8");
    // Slice from the success branch onward; the regeneration must live
    // inside it (not only the mount-time initialization above).
    const successBranch = source.slice(source.indexOf("res.ok && json?.ok"));
    expect(successBranch).toMatch(/idempotencyKeyRef\.current\s*=\s*crypto\.randomUUID\(\)/);
    // The new key is assigned BEFORE the form resets, so the next
    // submission always carries a fresh key.
    expect(successBranch.indexOf("crypto.randomUUID()")).toBeLessThan(
      successBranch.indexOf("form.reset()"),
    );
  });

  it("exposes the current idempotency key on the form element", () => {
    const source = readFileSync(formPath, "utf8");
    // The form element carries a ref; the current key is readable via
    // its data-idempotency-key attribute, synced after mount and again
    // on every regeneration.
    expect(source).toContain("ref={formRef}");
    expect(source).toMatch(/setAttribute\("data-idempotency-key"/);
  });
});
