import { getSiteSettings, REVALIDATE_SECONDS, STRAPI_URL } from "./strapi";

export const LEGAL_PAGE_CACHE_TAG = "legal-pages";
export const LEGAL_CODES = ["terms", "privacy"] as const;
export type LegalCode = (typeof LEGAL_CODES)[number];
export type LegalPageSource = "cms" | "fallback";

export type LegalSection = Readonly<{
  heading: string;
  paragraphs: readonly string[];
}>;

export type LegalPage = Readonly<{
  code: LegalCode;
  metadataTitle?: string;
  metadataDescription?: string;
  eyebrow: string;
  title: string;
  intro: string;
  tocLabel: string;
  updatedLabel: string;
  effectiveDate: string;
  version: string;
  sections: readonly LegalSection[];
  source: LegalPageSource;
  updatedAt?: string;
}>;

export type LegalUpstreamRecord = {
  documentId: string;
  code: LegalCode;
  metadataTitle?: string;
  metadataDescription?: string;
  eyebrow: string;
  title: string;
  intro: string;
  tocLabel: string;
  updatedLabel: string;
  effectiveDate: string;
  version: string;
  updatedAt: string;
  sections: Array<{
    heading: string;
    paragraphs: Array<{ text: string }>;
  }>;
};
type LegalFacts = Readonly<{
  siteName: string;
  contactEmail: string;
  whatsappNumber: string;
}>;

const FALLBACK_FACTS: LegalFacts = {
  siteName: "Ene Muebles",
  contactEmail: "contacto@ene-muebles.cl",
  whatsappNumber: "+569 9539 5339",
};

const TERMS_SECTIONS: readonly LegalSection[] = [
  {
    heading: "1. Aceptación",
    paragraphs: [
      "Al acceder a este sitio web o solicitar una cotización a través de los canales publicados por {{siteName}}, el usuario acepta los presentes términos y condiciones. Si no está de acuerdo con alguno de los puntos descritos, debe abstenerse de utilizar el sitio y de iniciar cualquier relación comercial.",
      "{{siteName}} puede modificar estos términos en cualquier momento. Las modificaciones se publicarán en esta misma URL y entrarán en vigencia desde su publicación.",
    ],
  },
  {
    heading: "2. Uso del sitio",
    paragraphs: [
      "Este sitio se publica con fines informativos sobre el catálogo de mobiliario, los canales de contacto y los procesos de cotización institucionales. El usuario se compromete a utilizar el sitio de manera lícita, sin realizar acciones que puedan dañar, inutilizar o impedir su normal funcionamiento.",
      "Queda prohibida la reproducción total o parcial del contenido sin autorización escrita, salvo para fines de cotización interna.",
    ],
  },
  {
    heading: "3. Información del catálogo",
    paragraphs: [
      "Las imágenes, descripciones, dimensiones, materiales y precios publicados son referenciales y pueden variar según lote, región de despacho y volumen cotizado. La propuesta comercial definitiva se entrega por escrito en la cotización formal.",
      "{{siteName}} se reserva el derecho de modificar el catálogo sin previo aviso, manteniendo los productos ya cotizados en las condiciones ofrecidas mientras la cotización se encuentre vigente.",
    ],
  },
  {
    heading: "4. Cotizaciones y aceptaciones",
    paragraphs: [
      "Las cotizaciones son válidas por 30 días corridos desde su emisión, salvo que la propuesta indique algo distinto. La aceptación debe formalizarse por escrito (correo electrónico, carta o documento equivalente) y puede requerir firma del responsable institucional.",
      "Los precios no incluyen flete ni montaje ni servicios adicionales, salvo que la cotización los exprese expresamente.",
    ],
  },
  {
    heading: "5. Despacho y entrega",
    paragraphs: [
      "Los plazos de despacho indicados en cada cotización son referenciales y se cuentan en días hábiles. {{siteName}} informará cualquier atraso previsto, manteniendo la trazabilidad del pedido.",
      "La recepción conforme debe ser firmada por el responsable habilitado en la dirección de entrega indicada en la cotización.",
    ],
  },
  {
    heading: "6. Garantía",
    paragraphs: [
      "{{siteName}} respalda los productos suministrados con garantía escrita por 1 año desde la recepción conforme, sobre defectos de fabricación y materiales. La garantía no cubre desgaste por uso indebido, intervenciones de terceros o daños por transporte ajeno a {{siteName}}.",
    ],
  },
  {
    heading: "7. Propiedad intelectual",
    paragraphs: [
      "Las marcas, logos, fotografías de productos y demás contenidos publicados son de propiedad de {{siteName}} o de sus proveedores y se utilizan con autorización. Queda prohibida su reutilización sin consentimiento escrito.",
    ],
  },
  {
    heading: "8. Limitación de responsabilidad",
    paragraphs: [
      "{{siteName}} no será responsable por daños indirectos, lucro cesante o cualquier perjuicio derivado del uso del sitio o de la imposibilidad de acceder a él. La responsabilidad total por cualquier compra se limita al monto efectivamente pagado por el producto en cuestión.",
    ],
  },
  {
    heading: "9. Ley aplicable y jurisdicción",
    paragraphs: [
      "Estos términos se rigen por las leyes de la República de Chile. Cualquier controversia se resolverá ante los tribunales ordinarios competentes de la República de Chile, sin perjuicio de los derechos del consumidor cuando correspondan.",
    ],
  },
  {
    heading: "10. Contacto",
    paragraphs: [
      "Para consultas sobre estos términos, escríbanos a {{contactEmail}} o llámenos al {{whatsappNumber}} en horario hábil.",
    ],
  },
];

const PRIVACY_SECTIONS: readonly LegalSection[] = [
  {
    heading: "1. Responsable del tratamiento",
    paragraphs: [
      "{{siteName}} es el responsable del tratamiento de los datos personales recogidos a través de este sitio y de los canales de contacto publicados (correo electrónico, WhatsApp, teléfono). El detalle de identificación se publica en el pie de página de este sitio.",
    ],
  },
  {
    heading: "2. Datos que recopilamos",
    paragraphs: [
      "Recopilamos los datos que el usuario entrega voluntariamente al solicitar una cotización, escribir al correo de contacto o completar el formulario de la página de contacto. Esto incluye, según corresponda: nombre, institución o empresa, correo electrónico, teléfono, región y contenido del mensaje.",
      "Además, el sitio puede registrar datos técnicos de la visita (dirección IP, agente de usuario, páginas consultadas) mediante el proveedor de hosting y herramientas estándar de operación web.",
    ],
  },
  {
    heading: "3. Finalidad",
    paragraphs: [
      "Los datos personales se utilizan para responder a las solicitudes de cotización, preparar propuestas comerciales, formalizar pedidos, emitir documentos tributarios y dar seguimiento al servicio postventa. También se utilizan para mantener la trazabilidad de las comunicaciones y para cumplir obligaciones legales y tributarias.",
    ],
  },
  {
    heading: "4. Conservación",
    paragraphs: [
      "Los datos se conservan mientras dure la relación comercial y, una vez terminada, por el plazo que exija la normativa contable y tributaria chilena. {{siteName}} puede conservar datos anonimizados para fines estadísticos y de mejora del catálogo.",
    ],
  },
  {
    heading: "5. Comunicaciones comerciales",
    paragraphs: [
      "Si el usuario autoriza expresamente, {{siteName}} puede enviarle comunicaciones sobre nuevos productos, condiciones especiales o licitaciones. El usuario puede revocar la autorización en cualquier momento, escribiendo a {{contactEmail}}.",
    ],
  },
  {
    heading: "6. Encargados de tratamiento",
    paragraphs: [
      "{{siteName}} comparte datos con proveedores estrictamente necesarios para operar: hosting del sitio, plataforma de gestión de contenidos (CMS), servicios de correo y proveedor de WhatsApp. Estos proveedores tratan los datos por cuenta de {{siteName}} según las instrucciones recibidas.",
    ],
  },
  {
    heading: "7. Transferencias internacionales",
    paragraphs: [
      "Algunos proveedores de servicios pueden almacenar datos en servidores fuera de Chile. En esos casos, {{siteName}} exige contractualmente niveles de protección acordes a la normativa aplicable y limita el acceso a la información estrictamente necesaria.",
    ],
  },
  {
    heading: "8. Derechos del titular",
    paragraphs: [
      "El titular de los datos puede ejercer en cualquier momento los derechos de acceso, rectificación, cancelación y oposición (ARCO) reconocidos por la Ley 19.628 sobre Protección de Datos Personales de Chile. Para hacerlo, debe enviar una solicitud a {{contactEmail}} indicando nombre completo, medio de contacto y el derecho que desea ejercer.",
      "{{siteName}} responderá a la solicitud en los plazos que la normativa exige, previa verificación de la identidad del solicitante.",
    ],
  },
  {
    heading: "9. Seguridad",
    paragraphs: [
      "{{siteName}} aplica medidas técnicas y organizativas razonables para proteger los datos personales, incluyendo control de acceso, conexiones cifradas y registro de operaciones. Aun así, ningún sistema es completamente seguro y el usuario debe proteger sus credenciales y equipos.",
    ],
  },
  {
    heading: "10. Cambios a esta política",
    paragraphs: [
      "{{siteName}} puede modificar esta política para reflejar cambios legales u operativos. La versión vigente se publica en esta misma URL, identificada con la fecha de última actualización.",
    ],
  },
];

const RAW_FALLBACKS: Record<LegalCode, Omit<LegalPage, "source">> = {
  terms: {
    code: "terms",
    eyebrow: "Legal",
    title: "Términos y condiciones.",
    intro:
      "Estos términos y condiciones regulan el uso del sitio web de {{siteName}} y la relación comercial con sus clientes institucionales. Al utilizar este sitio o solicitar una cotización, el usuario acepta las condiciones aquí descritas.",
    tocLabel: "Contenido",
    updatedLabel: "Última actualización: enero 2026.",
    effectiveDate: "2026-01-01",
    version: "2026-01",
    sections: TERMS_SECTIONS,
  },
  privacy: {
    code: "privacy",
    eyebrow: "Legal",
    title: "Política de privacidad.",
    intro:
      "Esta política describe cómo {{siteName}} trata los datos personales que recibe a través de su sitio web, canales de contacto y procesos comerciales, conforme a la Ley 19.628 sobre Protección de Datos Personales de Chile.",
    tocLabel: "Contenido",
    updatedLabel: "Última actualización: enero 2026.",
    effectiveDate: "2026-01-01",
    version: "2026-01",
    sections: PRIVACY_SECTIONS,
  },
};

const TOKEN_PATTERN = /\{\{([^{}]+)\}\}/g;
const ALLOWED_TOKEN_PATTERN = /\{\{(?:siteName|contactEmail|whatsappNumber)\}\}/g;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const LEGAL_VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resolveCopy(value: string, facts: LegalFacts): string {
  return value.replace(TOKEN_PATTERN, (_match, token: string) => {
    if (!(token in facts)) throw new Error(`Unknown legal token: ${token}`);
    return facts[token as keyof LegalFacts];
  });
}

export function hasValidLegalTemplateSyntax(value: string): boolean {
  return !/[{}]/.test(value.replace(ALLOWED_TOKEN_PATTERN, ""));
}

export function isLegalVersion(value: unknown): value is string {
  return typeof value === "string" && LEGAL_VERSION_PATTERN.test(value);
}

function requiredString(raw: Record<string, unknown>, field: string, max: number): string {
  const value = raw[field];
  if (
    typeof value !== "string" ||
    value.trim() === "" ||
    value.length > max ||
    !hasValidLegalTemplateSyntax(value)
  ) {
    throw new Error(`Malformed legal field: ${field}`);
  }
  return value;
}

function optionalMetadataCopy(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maxLength ? normalized : undefined;
}

function parseLegalDocument(raw: unknown, expectedCode: LegalCode): Omit<LegalPage, "source"> {
  if (!isRecord(raw) || raw.code !== expectedCode) throw new Error("Mismatched legal code");
  const rawSections = raw.sections;
  if (!Array.isArray(rawSections) || rawSections.length < 1 || rawSections.length > 20) {
    throw new Error("Malformed legal sections");
  }
  const sections = rawSections.map((section) => {
    if (!isRecord(section)) throw new Error("Malformed legal section");
    const rawParagraphs = section.paragraphs;
    if (!Array.isArray(rawParagraphs) || rawParagraphs.length < 1 || rawParagraphs.length > 6) {
      throw new Error("Malformed legal paragraphs");
    }
    return {
      heading: requiredString(section, "heading", 160),
      paragraphs: rawParagraphs.map((paragraph) => {
        if (!isRecord(paragraph)) throw new Error("Malformed legal paragraph");
        return requiredString(paragraph, "text", 1200);
      }),
    };
  });
  const effectiveDate = requiredString(raw, "effectiveDate", 10);
  if (!DATE_PATTERN.test(effectiveDate)) throw new Error("Malformed effective date");
  const version = raw.version;
  if (!isLegalVersion(version)) throw new Error("Malformed legal version");
  return {
    code: expectedCode,
    metadataTitle: optionalMetadataCopy(raw.metadataTitle, 60),
    metadataDescription: optionalMetadataCopy(raw.metadataDescription, 160),
    eyebrow: requiredString(raw, "eyebrow", 80),
    title: requiredString(raw, "title", 180),
    intro: requiredString(raw, "intro", 800),
    tocLabel: requiredString(raw, "tocLabel", 80),
    updatedLabel: requiredString(raw, "updatedLabel", 80),
    effectiveDate,
    version,
    sections,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : undefined,
  };
}

function strictOptionalMetadata(
  raw: Record<string, unknown>,
  field: string,
  maxLength: number,
): string | undefined {
  const value = raw[field];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || value.length > maxLength) {
    throw new Error(`Malformed legal field: ${field}`);
  }
  return value.trim() || undefined;
}

function isValidCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function isValidOffsetDateTime(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/.exec(
      value,
    );
  if (!match) return false;
  const [, year, month, day, hour, minute, second, offsetHour, offsetMinute] = match;
  if (
    Number(hour) > 23 ||
    Number(minute) > 59 ||
    Number(second) > 59 ||
    (offsetHour !== undefined && Number(offsetHour) > 23) ||
    (offsetMinute !== undefined && Number(offsetMinute) > 59)
  ) {
    return false;
  }
  const calendarDate = `${year}-${month}-${day}`;
  return isValidCalendarDate(calendarDate) && !Number.isNaN(Date.parse(value));
}

export function parseLegalUpstreamRecord(
  raw: unknown,
  expectedCode: LegalCode,
): LegalUpstreamRecord {
  if (!isRecord(raw)) throw new Error("Malformed legal record");

  const documentId = raw.documentId;
  if (typeof documentId !== "string" || documentId.trim() === "") {
    throw new Error("Malformed legal document identity");
  }
  if (!isValidOffsetDateTime(raw.updatedAt)) {
    throw new Error("Malformed legal updatedAt");
  }

  strictOptionalMetadata(raw, "metadataTitle", 60);
  strictOptionalMetadata(raw, "metadataDescription", 160);
  const parsed = parseLegalDocument(raw, expectedCode);
  if (!isValidCalendarDate(parsed.effectiveDate)) {
    throw new Error("Malformed effective date");
  }

  const sections = (raw.sections as unknown[]).map((section) => {
    if (!isRecord(section) || !Array.isArray(section.paragraphs)) {
      throw new Error("Malformed legal section");
    }
    return {
      heading: requiredString(section, "heading", 160),
      paragraphs: section.paragraphs.map((paragraph) => {
        if (!isRecord(paragraph)) throw new Error("Malformed legal paragraph");
        return { text: requiredString(paragraph, "text", 1200) };
      }),
    };
  });

  return {
    ...parsed,
    documentId: documentId.trim(),
    metadataTitle: strictOptionalMetadata(raw, "metadataTitle", 60),
    metadataDescription: strictOptionalMetadata(raw, "metadataDescription", 160),
    updatedAt: raw.updatedAt,
    sections,
  };
}
function withFacts(
  page: Omit<LegalPage, "source">,
  facts: LegalFacts,
  source: LegalPageSource,
): LegalPage {
  return {
    ...page,
    source,
    eyebrow: resolveCopy(page.eyebrow, facts),
    title: resolveCopy(page.title, facts),
    intro: resolveCopy(page.intro, facts),
    tocLabel: resolveCopy(page.tocLabel, facts),
    updatedLabel: resolveCopy(page.updatedLabel, facts),
    version: page.version,
    sections: page.sections.map((section) => ({
      heading: resolveCopy(section.heading, facts),
      paragraphs: section.paragraphs.map((paragraph) => resolveCopy(paragraph, facts)),
    })),
  };
}

async function getLegalFacts(): Promise<LegalFacts> {
  try {
    const settings = await getSiteSettings();
    return {
      siteName: settings.siteName?.trim() || FALLBACK_FACTS.siteName,
      contactEmail: settings.contactEmail?.trim() || FALLBACK_FACTS.contactEmail,
      whatsappNumber: settings.whatsappNumber?.trim() || FALLBACK_FACTS.whatsappNumber,
    };
  } catch {
    return FALLBACK_FACTS;
  }
}

function legalQuery(code: LegalCode): string {
  const params = new URLSearchParams({
    "filters[code][$eq]": code,
    status: "published",
    "pagination[pageSize]": "2",
    "populate[sections][populate][paragraphs]": "true",
  });
  return `${STRAPI_URL.replace(/\/+$/, "")}/api/legal-pages?${params.toString()}`;
}

async function fetchLegalRows(code: LegalCode, cache: RequestCache): Promise<unknown[]> {
  const response = await fetch(legalQuery(code), {
    headers: process.env.STRAPI_API_TOKEN
      ? { Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}` }
      : undefined,
    cache,
    ...(cache === "no-store"
      ? {}
      : { next: { revalidate: REVALIDATE_SECONDS, tags: [LEGAL_PAGE_CACHE_TAG] } }),
  });
  if (!response.ok) throw new Error(`Legal upstream returned ${response.status}`);
  const json: unknown = await response.json();
  if (!isRecord(json) || !Array.isArray(json.data)) throw new Error("Malformed legal envelope");
  return json.data;
}

export function getLegalFallback(code: LegalCode, facts: LegalFacts = FALLBACK_FACTS): LegalPage {
  return withFacts(RAW_FALLBACKS[code], facts, "fallback");
}

export function getLegalSeed(code: LegalCode): Omit<LegalPage, "source"> {
  return RAW_FALLBACKS[code];
}

export async function getLegalPage(code: LegalCode): Promise<LegalPage> {
  const facts = await getLegalFacts();
  try {
    const rows = await fetchLegalRows(code, "force-cache");
    if (rows.length !== 1) throw new Error("Legal page must have exactly one published document");
    return withFacts(parseLegalDocument(rows[0], code), facts, "cms");
  } catch {
    return getLegalFallback(code, facts);
  }
}

export async function getPublishedPrivacyVersion(): Promise<string> {
  const rows = await fetchLegalRows("privacy", "no-store");
  if (rows.length === 0) return RAW_FALLBACKS.privacy.version;
  if (rows.length !== 1) throw new Error("Privacy page is ambiguous");
  return parseLegalDocument(rows[0], "privacy").version;
}

export const __legalInternal = { parseLegalDocument, resolveCopy, fetchLegalRows };
