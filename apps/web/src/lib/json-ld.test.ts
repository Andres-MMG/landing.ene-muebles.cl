import { describe, expect, it } from "vitest";
import { buildOrganizationJsonLd, safeJsonLd } from "./json-ld";

describe("safeJsonLd", () => {
  it("neutralizes script-closing text while preserving the factual value after JSON.parse", () => {
    const factualText = "Mesa </script><script>alert(1)</script> \u2028 prueba";
    const serialized = safeJsonLd({ name: factualText });
    expect(serialized).not.toContain("</script>");
    expect(serialized).toContain("\\u003c/script>");
    expect(JSON.parse(serialized)).toEqual({ name: factualText });
  });
});

describe("buildOrganizationJsonLd", () => {
  it("omits empty optional address and contact objects", () => {
    expect(buildOrganizationJsonLd({ siteName: "ENE-MUEBLES" })).toEqual({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "ENE-MUEBLES",
      url: "https://ene-muebles.cl",
    });
  });

  it("derives areaServed exactly from trimmed dispatch coverage", () => {
    const organization = buildOrganizationJsonLd({
      siteName: "ENE-MUEBLES",
      contactEmail: "contacto@example.com",
      dispatchCoverage: "  Desde Valparaíso hasta Los Lagos  ",
    });

    expect(organization.contactPoint).toMatchObject({
      areaServed: "Desde Valparaíso hasta Los Lagos",
    });
  });

  it.each([undefined, "", "   "])(
    "omits areaServed without nonblank dispatch coverage (%s)",
    (dispatchCoverage: string | undefined) => {
      const organization = buildOrganizationJsonLd({
        siteName: "ENE-MUEBLES",
        contactEmail: "contacto@example.com",
        dispatchCoverage,
      });

      expect(organization.contactPoint).not.toHaveProperty("areaServed");
      expect(JSON.stringify(organization)).not.toContain('"areaServed":"CL"');
    },
  );
});
