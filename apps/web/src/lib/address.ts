/**
 * B1 (U7) — structured postal address helpers.
 *
 * The site-setting singleton holds a single `address` street line plus
 * OPTIONAL `addressCity` / `addressRegion` fields. The city is NOT
 * confirmed by the client yet, so the seed leaves it empty and every
 * renderer must append ", {city}" / ", {region}" only when the value is
 * actually configured — never invent a locality.
 *
 * Every field is treated as optional: Strapi may return null/undefined
 * for any of them, and the fallback site settings contain only
 * `siteName`.
 */

export type AddressSettings = {
  address?: string | null;
  addressCity?: string | null;
  addressRegion?: string | null;
};

/** Trimmed street / city / region, dropping blank and whitespace-only values. */
export function buildAddressParts(
  settings: AddressSettings,
): { street?: string; city?: string; region?: string } {
  const street = settings.address?.trim() || undefined;
  const city = settings.addressCity?.trim() || undefined;
  const region = settings.addressRegion?.trim() || undefined;
  return { street, city, region };
}

/**
 * Full display string for the address rail: `"Cautín 1782"` alone when
 * no city is configured, `"Cautín 1782, Temuco"` once the client
 * confirms the city, `"Cautín 1782, Temuco, Araucanía"` with the
 * region. Returns `null` when no street exists so renderers can skip
 * the row entirely.
 */
export function formatAddress(settings: AddressSettings): string | null {
  const { street, city, region } = buildAddressParts(settings);
  if (!street) return null;
  return [street, city, region].filter((part): part is string => Boolean(part)).join(", ");
}
