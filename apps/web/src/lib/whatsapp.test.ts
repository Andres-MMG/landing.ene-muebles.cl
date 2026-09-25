import { describe, it, expect } from "vitest";
import {
  buildWhatsAppHandoff,
  buildProductMessage,
  normalizeWhatsAppNumber,
  DEFAULT_WHATSAPP_MESSAGE,
  DEFAULT_WHATSAPP_PRODUCT_MESSAGE_TEMPLATE,
} from "./whatsapp";

describe("buildProductMessage", () => {
  it("uses a valid product template with exactly one literal placeholder", () => {
    expect(
      buildProductMessage(
        "Silla escolar",
        "Necesito cotizar {productName} para mi establecimiento.",
      ),
    ).toBe("Necesito cotizar Silla escolar para mi establecimiento.");
  });

  it("inserts replacement-like product names literally", () => {
    expect(buildProductMessage("$& 100% {productName}", "Consulta por {productName}.")).toBe(
      "Consulta por $& 100% {productName}.",
    );
  });

  it.each([
    ["blank", "   "],
    ["missing placeholder", "Necesito cotizar este producto."],
    ["duplicate placeholder", "{productName} y {productName}"],
    ["malformed non-string value", 42],
  ])("uses the exact fallback for a %s template", (_label: string, template: unknown) => {
    expect(buildProductMessage("Mesa", template)).toBe(
      "Hola, me gustaría cotizar Mesa para mi institución.",
    );
  });

  it("accepts 1000 characters and rejects 1001", () => {
    const token = "{productName}";
    const valid = `${"a".repeat(1000 - token.length)}${token}`;
    const tooLong = `a${valid}`;
    const whitespacePaddedTooLong = `${valid} `;

    expect(buildProductMessage("Mesa", valid)).toBe(`${"a".repeat(1000 - token.length)}Mesa`);
    expect(buildProductMessage("Mesa", tooLong)).toBe(
      DEFAULT_WHATSAPP_PRODUCT_MESSAGE_TEMPLATE.replace(token, "Mesa"),
    );
    expect(buildProductMessage("Mesa", whitespacePaddedTooLong)).toBe(
      DEFAULT_WHATSAPP_PRODUCT_MESSAGE_TEMPLATE.replace(token, "Mesa"),
    );
  });
});
describe("normalizeWhatsAppNumber", () => {
  it("strips + and keeps a number that already has the 56 prefix", () => {
    expect(normalizeWhatsAppNumber("+56912345678")).toBe("56912345678");
  });

  it("removes non-digit separators (spaces, dashes)", () => {
    expect(normalizeWhatsAppNumber("+56 9 1234 5678")).toBe("56912345678");
    expect(normalizeWhatsAppNumber("9-1234-5678")).toBe("56912345678");
  });

  it("prepends 56 when the country code is missing", () => {
    expect(normalizeWhatsAppNumber("912345678")).toBe("56912345678");
  });

  it("returns null for empty or missing values", () => {
    expect(normalizeWhatsAppNumber("")).toBeNull();
    expect(normalizeWhatsAppNumber("   ")).toBeNull();
    expect(normalizeWhatsAppNumber(undefined)).toBeNull();
    expect(normalizeWhatsAppNumber(null)).toBeNull();
  });

  it("returns null for garbage that contains no usable digits", () => {
    expect(normalizeWhatsAppNumber("abc")).toBeNull();
    expect(normalizeWhatsAppNumber("javascript:alert(1)")).toBeNull();
  });

  it("returns null for implausible lengths", () => {
    expect(normalizeWhatsAppNumber("123")).toBeNull();
    expect(normalizeWhatsAppNumber("1".repeat(20))).toBeNull();
  });
});

describe("buildWhatsAppHandoff", () => {
  it("names the product when product context is present (per-product wins over the generic default)", () => {
    const handoff = buildWhatsAppHandoff(
      {
        whatsappNumber: "+56912345678",
        whatsappDefaultMessage: "Hola, mensaje genérico.",
      },
      { product: { name: "Silla escolar" } },
    );

    expect(handoff).not.toBeNull();
    expect(handoff!.message).toBe(buildProductMessage("Silla escolar"));
    expect(handoff!.message).toContain("Silla escolar");
    expect(handoff!.message).not.toContain("mensaje genérico");
  });

  it("falls back safely when a direct CMS product template is malformed", () => {
    const handoff = buildWhatsAppHandoff(
      {
        whatsappNumber: "+56912345678",
        whatsappProductMessageTemplate: "{productName} / {productName}",
      },
      { product: { name: "Mesa" } },
    );

    expect(handoff!.message).toBe("Hola, me gustaría cotizar Mesa para mi institución.");
  });
  it("uses the configured generic message when no product context is given", () => {
    const handoff = buildWhatsAppHandoff({
      whatsappNumber: "+56912345678",
      whatsappDefaultMessage: "Hola, quisiera información sobre mobiliario.",
    });

    expect(handoff!.message).toBe("Hola, quisiera información sobre mobiliario.");
  });

  it("trims whitespace around the configured generic message", () => {
    const handoff = buildWhatsAppHandoff({
      whatsappNumber: "56912345678",
      whatsappDefaultMessage: "  Hola, mensaje con espacios.  ",
    });

    expect(handoff!.message).toBe("Hola, mensaje con espacios.");
  });

  it("falls back to the caller fallback message when nothing is configured", () => {
    const handoff = buildWhatsAppHandoff(
      { whatsappNumber: "56912345678" },
      { fallbackMessage: "Hola, cotización de catálogo." },
    );

    expect(handoff!.message).toBe("Hola, cotización de catálogo.");
  });

  it("falls back to the built-in Spanish default when no message source exists", () => {
    const handoff = buildWhatsAppHandoff({ whatsappNumber: "56912345678" });

    expect(handoff!.message).toBe(DEFAULT_WHATSAPP_MESSAGE);
    expect(handoff!.message.length).toBeGreaterThan(0);
  });

  it("encodes the message exactly once in the wa.me URL", () => {
    const handoff = buildWhatsAppHandoff(
      { whatsappNumber: "56912345678" },
      { product: { name: "Mesa 4 puestos" } },
    );

    expect(handoff!.href).toBe(
      `https://wa.me/56912345678?text=${encodeURIComponent(handoff!.message)}`,
    );
    // Encoded exactly once: no percent-encoded percent signs.
    expect(handoff!.href).not.toContain("%25");
    expect(handoff!.href).toContain("%20");
  });

  it("encodes a custom product template exactly once after literal insertion", () => {
    const handoff = buildWhatsAppHandoff(
      {
        whatsappNumber: "56912345678",
        whatsappProductMessageTemplate: "Cotizar {productName} & despacho.",
      },
      { product: { name: "Mesa 100% escolar" } },
    );

    expect(handoff!.message).toBe("Cotizar Mesa 100% escolar & despacho.");
    expect(handoff!.href).toBe(
      `https://wa.me/56912345678?text=${encodeURIComponent(handoff!.message)}`,
    );
    expect(decodeURIComponent(handoff!.href.split("?text=")[1]!)).toBe(handoff!.message);
  });
  it("never includes price, stock, or visitor data in the message", () => {
    const handoff = buildWhatsAppHandoff(
      { whatsappNumber: "56912345678" },
      { product: { name: "Silla" } },
    );

    expect(handoff!.message).not.toMatch(/\$\s?\d/);
    expect(handoff!.message).not.toMatch(/CLP/i);
    expect(handoff!.message).not.toMatch(/stock|disponible|unidades/i);
  });

  it("returns null when the number is missing", () => {
    expect(buildWhatsAppHandoff({ whatsappDefaultMessage: "Hola" })).toBeNull();
  });

  it("returns null when the number is invalid (fallback policy)", () => {
    expect(buildWhatsAppHandoff({ whatsappNumber: "not-a-number" })).toBeNull();
    expect(buildWhatsAppHandoff({ whatsappNumber: "123" })).toBeNull();
  });

  it("rejects injected characters instead of building a broken link", () => {
    expect(buildWhatsAppHandoff({ whatsappNumber: "+56 9 a1b2c3d4e5" })).not.toBeNull();
    expect(buildWhatsAppHandoff({ whatsappNumber: "https://evil.example" })).toBeNull();
  });
});
