/**
 * Single WhatsApp handoff builder (whatsapp-handoff spec).
 *
 * Every UI CTA that opens a `wa.me` deep link MUST go through
 * `buildWhatsAppHandoff` so the number normalization, message
 * encoding, and fallback policy stay in one place:
 *
 *   - The number is normalized to E.164-ish digits only (leading `+`
 *     stripped, non-digits removed) and prefixed with the Chilean
 *     country code `56` when missing. Invalid or absent numbers
 *     produce `null` — never a fabricated destination.
 *   - When a `product` is provided, the prefilled message identifies
 *     that published product by name (product context wins over the
 *     generic operator message). Price, availability, and visitor
 *     data are NEVER included.
 *   - Without a product, the operator-configured
 *     `whatsappDefaultMessage` wins (trimmed); when it is empty the
 *     `fallbackMessage` option is used, and finally a safe Spanish
 *     default.
 *   - The message is `encodeURIComponent`-encoded exactly once.
 */

export type WhatsAppHandoffSettings = {
  whatsappNumber?: string;
  whatsappDefaultMessage?: string;
};

export type WhatsAppHandoffOptions = {
  /**
   * Published product context. When present the prefilled message is
   * the per-product inquiry text, regardless of the generic default.
   */
  product?: { name: string };
  /**
   * Custom fallback for callers that historically shipped their own
   * default message (Header, ContactCTA). Used only when
   * `whatsappDefaultMessage` is missing/blank and no product is set.
   */
  fallbackMessage?: string;
};

export type WhatsAppHandoff = {
  href: string;
  message: string;
} | null;

export const DEFAULT_WHATSAPP_MESSAGE =
  "Hola, me gustaría una cotización de mobiliario institucional.";

/** Per-product prefilled copy (professional Chilean Spanish, no price/stock data). */
export const buildProductMessage = (productName: string): string =>
  `Hola, me gustaría cotizar ${productName} para mi institución.`;

/**
 * Normalize an operator-supplied WhatsApp number to digits-only
 * E.164-ish form. Returns `null` for missing, empty, or malformed
 * values (unsupported characters, wrong length) so callers can apply
 * the fallback policy instead of emitting a broken link.
 */
export function normalizeWhatsAppNumber(
  input: string | undefined | null,
): string | null {
  if (!input) return null;
  const digits = input.replace(/[^\d]/g, "");
  if (digits.length === 0) return null;
  const normalized = digits.startsWith("56") ? digits : `56${digits}`;
  return /^\d{8,15}$/.test(normalized) ? normalized : null;
}

/**
 * Build the `wa.me` handoff for a set of site settings.
 *
 * Returns `null` when no valid WhatsApp number is configured — the
 * caller must then hide the CTA (the on-page contact form and the
 * adjacent email links remain the conversion path).
 */
export function buildWhatsAppHandoff(
  settings: WhatsAppHandoffSettings,
  options: WhatsAppHandoffOptions = {},
): WhatsAppHandoff {
  const number = normalizeWhatsAppNumber(settings.whatsappNumber);
  if (!number) return null;

  const message = options.product
    ? buildProductMessage(options.product.name)
    : (settings.whatsappDefaultMessage?.trim() ||
        options.fallbackMessage?.trim() ||
        DEFAULT_WHATSAPP_MESSAGE);

  const href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  return { href, message };
}
