import type { Core } from "@strapi/strapi";

export const LEGAL_PAGE_UID = "api::legal-page.legal-page" as const;
export const LEGAL_CODES = ["terms", "privacy"] as const;
export type LegalCode = (typeof LEGAL_CODES)[number];

type SeedSection = { heading: string; paragraphs: Array<{ text: string }> };
type LegalSeed = {
  code: LegalCode;
  eyebrow: string;
  title: string;
  intro: string;
  tocLabel: string;
  updatedLabel: string;
  effectiveDate: string;
  version: string;
  sections: SeedSection[];
};

const p = (...paragraphs: string[]): Array<{ text: string }> =>
  paragraphs.map((text) => ({ text }));

export const LEGAL_PAGE_SEEDS: readonly LegalSeed[] = [
  {
    code: "terms",
    eyebrow: "Legal",
    title: "Términos y condiciones.",
    intro:
      "Estos términos y condiciones regulan el uso del sitio web de {{siteName}} y la relación comercial con sus clientes institucionales. Al utilizar este sitio o solicitar una cotización, el usuario acepta las condiciones aquí descritas.",
    tocLabel: "Contenido",
    updatedLabel: "Última actualización: enero 2026.",
    effectiveDate: "2026-01-01",
    version: "2026-01",
    sections: [
      {
        heading: "1. Aceptación",
        paragraphs: p(
          "Al acceder a este sitio web o solicitar una cotización a través de los canales publicados por {{siteName}}, el usuario acepta los presentes términos y condiciones. Si no está de acuerdo con alguno de los puntos descritos, debe abstenerse de utilizar el sitio y de iniciar cualquier relación comercial.",
          "{{siteName}} puede modificar estos términos en cualquier momento. Las modificaciones se publicarán en esta misma URL y entrarán en vigencia desde su publicación.",
        ),
      },
      {
        heading: "2. Uso del sitio",
        paragraphs: p(
          "Este sitio se publica con fines informativos sobre el catálogo de mobiliario, los canales de contacto y los procesos de cotización institucionales. El usuario se compromete a utilizar el sitio de manera lícita, sin realizar acciones que puedan dañar, inutilizar o impedir su normal funcionamiento.",
          "Queda prohibida la reproducción total o parcial del contenido sin autorización escrita, salvo para fines de cotización interna.",
        ),
      },
      {
        heading: "3. Información del catálogo",
        paragraphs: p(
          "Las imágenes, descripciones, dimensiones, materiales y precios publicados son referenciales y pueden variar según lote, región de despacho y volumen cotizado. La propuesta comercial definitiva se entrega por escrito en la cotización formal.",
          "{{siteName}} se reserva el derecho de modificar el catálogo sin previo aviso, manteniendo los productos ya cotizados en las condiciones ofrecidas mientras la cotización se encuentre vigente.",
        ),
      },
      {
        heading: "4. Cotizaciones y aceptaciones",
        paragraphs: p(
          "Las cotizaciones son válidas por 30 días corridos desde su emisión, salvo que la propuesta indique algo distinto. La aceptación debe formalizarse por escrito (correo electrónico, carta o documento equivalente) y puede requerir firma del responsable institucional.",
          "Los precios no incluyen flete ni montaje ni servicios adicionales, salvo que la cotización los exprese expresamente.",
        ),
      },
      {
        heading: "5. Despacho y entrega",
        paragraphs: p(
          "Los plazos de despacho indicados en cada cotización son referenciales y se cuentan en días hábiles. {{siteName}} informará cualquier atraso previsto, manteniendo la trazabilidad del pedido.",
          "La recepción conforme debe ser firmada por el responsable habilitado en la dirección de entrega indicada en la cotización.",
        ),
      },
      {
        heading: "6. Garantía",
        paragraphs: p(
          "{{siteName}} respalda los productos suministrados con garantía escrita por 1 año desde la recepción conforme, sobre defectos de fabricación y materiales. La garantía no cubre desgaste por uso indebido, intervenciones de terceros o daños por transporte ajeno a {{siteName}}.",
        ),
      },
      {
        heading: "7. Propiedad intelectual",
        paragraphs: p(
          "Las marcas, logos, fotografías de productos y demás contenidos publicados son de propiedad de {{siteName}} o de sus proveedores y se utilizan con autorización. Queda prohibida su reutilización sin consentimiento escrito.",
        ),
      },
      {
        heading: "8. Limitación de responsabilidad",
        paragraphs: p(
          "{{siteName}} no será responsable por daños indirectos, lucro cesante o cualquier perjuicio derivado del uso del sitio o de la imposibilidad de acceder a él. La responsabilidad total por cualquier compra se limita al monto efectivamente pagado por el producto en cuestión.",
        ),
      },
      {
        heading: "9. Ley aplicable y jurisdicción",
        paragraphs: p(
          "Estos términos se rigen por las leyes de la República de Chile. Cualquier controversia se resolverá ante los tribunales ordinarios competentes de la República de Chile, sin perjuicio de los derechos del consumidor cuando correspondan.",
        ),
      },
      {
        heading: "10. Contacto",
        paragraphs: p(
          "Para consultas sobre estos términos, escríbanos a {{contactEmail}} o llámenos al {{whatsappNumber}} en horario hábil.",
        ),
      },
    ],
  },
  {
    code: "privacy",
    eyebrow: "Legal",
    title: "Política de privacidad.",
    intro:
      "Esta política describe cómo {{siteName}} trata los datos personales que recibe a través de su sitio web, canales de contacto y procesos comerciales, conforme a la Ley 19.628 sobre Protección de Datos Personales de Chile.",
    tocLabel: "Contenido",
    updatedLabel: "Última actualización: enero 2026.",
    effectiveDate: "2026-01-01",
    version: "2026-01",
    sections: [
      {
        heading: "1. Responsable del tratamiento",
        paragraphs: p(
          "{{siteName}} es el responsable del tratamiento de los datos personales recogidos a través de este sitio y de los canales de contacto publicados (correo electrónico, WhatsApp, teléfono). El detalle de identificación se publica en el pie de página de este sitio.",
        ),
      },
      {
        heading: "2. Datos que recopilamos",
        paragraphs: p(
          "Recopilamos los datos que el usuario entrega voluntariamente al solicitar una cotización, escribir al correo de contacto o completar el formulario de la página de contacto. Esto incluye, según corresponda: nombre, institución o empresa, correo electrónico, teléfono, región y contenido del mensaje.",
          "Además, el sitio puede registrar datos técnicos de la visita (dirección IP, agente de usuario, páginas consultadas) mediante el proveedor de hosting y herramientas estándar de operación web.",
        ),
      },
      {
        heading: "3. Finalidad",
        paragraphs: p(
          "Los datos personales se utilizan para responder a las solicitudes de cotización, preparar propuestas comerciales, formalizar pedidos, emitir documentos tributarios y dar seguimiento al servicio postventa. También se utilizan para mantener la trazabilidad de las comunicaciones y para cumplir obligaciones legales y tributarias.",
        ),
      },
      {
        heading: "4. Conservación",
        paragraphs: p(
          "Los datos se conservan mientras dure la relación comercial y, una vez terminada, por el plazo que exija la normativa contable y tributaria chilena. {{siteName}} puede conservar datos anonimizados para fines estadísticos y de mejora del catálogo.",
        ),
      },
      {
        heading: "5. Comunicaciones comerciales",
        paragraphs: p(
          "Si el usuario autoriza expresamente, {{siteName}} puede enviarle comunicaciones sobre nuevos productos, condiciones especiales o licitaciones. El usuario puede revocar la autorización en cualquier momento, escribiendo a {{contactEmail}}.",
        ),
      },
      {
        heading: "6. Encargados de tratamiento",
        paragraphs: p(
          "{{siteName}} comparte datos con proveedores estrictamente necesarios para operar: hosting del sitio, plataforma de gestión de contenidos (CMS), servicios de correo y proveedor de WhatsApp. Estos proveedores tratan los datos por cuenta de {{siteName}} según las instrucciones recibidas.",
        ),
      },
      {
        heading: "7. Transferencias internacionales",
        paragraphs: p(
          "Algunos proveedores de servicios pueden almacenar datos en servidores fuera de Chile. En esos casos, {{siteName}} exige contractualmente niveles de protección acordes a la normativa aplicable y limita el acceso a la información estrictamente necesaria.",
        ),
      },
      {
        heading: "8. Derechos del titular",
        paragraphs: p(
          "El titular de los datos puede ejercer en cualquier momento los derechos de acceso, rectificación, cancelación y oposición (ARCO) reconocidos por la Ley 19.628 sobre Protección de Datos Personales de Chile. Para hacerlo, debe enviar una solicitud a {{contactEmail}} indicando nombre completo, medio de contacto y el derecho que desea ejercer.",
          "{{siteName}} responderá a la solicitud en los plazos que la normativa exige, previa verificación de la identidad del solicitante.",
        ),
      },
      {
        heading: "9. Seguridad",
        paragraphs: p(
          "{{siteName}} aplica medidas técnicas y organizativas razonables para proteger los datos personales, incluyendo control de acceso, conexiones cifradas y registro de operaciones. Aun así, ningún sistema es completamente seguro y el usuario debe proteger sus credenciales y equipos.",
        ),
      },
      {
        heading: "10. Cambios a esta política",
        paragraphs: p(
          "{{siteName}} puede modificar esta política para reflejar cambios legales u operativos. La versión vigente se publica en esta misma URL, identificada con la fecha de última actualización.",
        ),
      },
    ],
  },
];

const ALLOWED_TOKEN_PATTERN = /\{\{(?:siteName|contactEmail|whatsappNumber)\}\}/g;
const LEGAL_VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/;

function validateTokens(value: string): string {
  if (/[{}]/.test(value.replace(ALLOWED_TOKEN_PATTERN, ""))) {
    throw new Error("Invalid legal token syntax.");
  }
  return value;
}

function validateLegalVersion(value: string): string {
  if (!LEGAL_VERSION_PATTERN.test(value)) throw new Error("Invalid legal version.");
  return value;
}

function validatedSeed(seed: LegalSeed): LegalSeed {
  return {
    ...seed,
    eyebrow: validateTokens(seed.eyebrow),
    title: validateTokens(seed.title),
    intro: validateTokens(seed.intro),
    tocLabel: validateTokens(seed.tocLabel),
    updatedLabel: validateTokens(seed.updatedLabel),
    version: validateLegalVersion(seed.version),
    sections: seed.sections.map((section) => ({
      heading: validateTokens(section.heading),
      paragraphs: section.paragraphs.map(({ text }) => ({ text: validateTokens(text) })),
    })),
  };
}
async function findLegal(strapi: Core.Strapi, code: LegalCode, status: "draft" | "published") {
  return strapi.documents(LEGAL_PAGE_UID).findMany({
    filters: { code: { $eq: code } },
    status,
    limit: 2,
  });
}

type LegalExistence = { draft: boolean; published: boolean };

async function getLegalExistence(strapi: Core.Strapi, code: LegalCode): Promise<LegalExistence> {
  const draft = await findLegal(strapi, code, "draft");
  const published = await findLegal(strapi, code, "published");
  return { draft: draft.length > 0, published: published.length > 0 };
}

async function legalExists(strapi: Core.Strapi, code: LegalCode): Promise<boolean> {
  const existence = await getLegalExistence(strapi, code);
  return existence.draft || existence.published;
}

export async function ensureLegalPages(strapi: Core.Strapi): Promise<void> {
  for (const seed of LEGAL_PAGE_SEEDS) {
    try {
      const existing = await getLegalExistence(strapi, seed.code);
      if (existing.draft || existing.published) continue;

      await strapi.documents(LEGAL_PAGE_UID).create({
        data: validatedSeed(seed),
        status: "published",
      });
    } catch (error) {
      try {
        const afterFailure = await getLegalExistence(strapi, seed.code);
        if (afterFailure.published) continue;
        if (afterFailure.draft) {
          strapi.log.error(
            `[bootstrap] Failed to publish legal page ${seed.code}; an existing draft was left untouched.`,
            error,
          );
          continue;
        }
      } catch {
        // Preserve the original create failure as the actionable diagnostic.
      }
      strapi.log.error(`[bootstrap] Failed to seed legal page ${seed.code}`, error);
    }
  }
}

type DocumentMiddlewareContext = {
  uid: string;
  action: string;
  params: { data?: Record<string, unknown>; documentId?: string };
};

export function registerLegalPageMiddleware(strapi: Core.Strapi): void {
  strapi.documents.use(async (context, next) => {
    const legalContext = context as unknown as DocumentMiddlewareContext;
    if (legalContext.uid !== LEGAL_PAGE_UID) return next();
    if (legalContext.action === "delete") throw new Error("Legal page deletion is not allowed.");
    if (
      legalContext.action === "update" &&
      legalContext.params.data &&
      "code" in legalContext.params.data
    ) {
      throw new Error("Legal page code cannot be changed.");
    }
    if (legalContext.action === "create") {
      const code = legalContext.params.data?.code;
      if (!LEGAL_CODES.includes(code as LegalCode)) throw new Error("Unknown legal page code.");
      if (await legalExists(strapi, code as LegalCode))
        throw new Error("Legal page already exists.");
    }
    return next();
  });
}
