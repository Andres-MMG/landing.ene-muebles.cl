import { site } from "@ene/ui-tokens";

export const revalidate = 3600;
export const metadata = {
  title: "Política de privacidad",
  description:
    "Cómo Ene Muebles trata los datos personales que recibe a través de su sitio web, canales de contacto y procesos comerciales.",
};

const sections = [
  {
    heading: "1. Responsable del tratamiento",
    body: [
      "Ene Muebles es el responsable del tratamiento de los datos personales recogidos a través de este sitio y de los canales de contacto publicados (correo electrónico, WhatsApp, teléfono). El detalle de identificación se publica en el pie de página de este sitio.",
    ],
  },
  {
    heading: "2. Datos que recopilamos",
    body: [
      "Recopilamos los datos que el usuario entrega voluntariamente al solicitar una cotización, escribir al correo de contacto o completar el formulario de la página de contacto. Esto incluye, según corresponda: nombre, institución o empresa, correo electrónico, teléfono, región y contenido del mensaje.",
      "Además, el sitio puede registrar datos técnicos de la visita (dirección IP, agente de usuario, páginas consultadas) mediante el proveedor de hosting y herramientas estándar de operación web.",
    ],
  },
  {
    heading: "3. Finalidad",
    body: [
      "Los datos personales se utilizan para responder a las solicitudes de cotización, preparar propuestas comerciales, formalizar pedidos, emitir documentos tributarios y dar seguimiento al servicio postventa. También se utilizan para mantener la trazabilidad de las comunicaciones y para cumplir obligaciones legales y tributarias.",
    ],
  },
  {
    heading: "4. Conservación",
    body: [
      "Los datos se conservan mientras dure la relación comercial y, una vez terminada, por el plazo que exija la normativa contable y tributaria chilena. Ene Muebles puede conservar datos anonimizados para fines estadísticos y de mejora del catálogo.",
    ],
  },
  {
    heading: "5. Comunicaciones comerciales",
    body: [
      "Si el usuario autoriza expresamente, Ene Muebles puede enviarle comunicaciones sobre nuevos productos, condiciones especiales o licitaciones. El usuario puede revocar la autorización en cualquier momento, escribiendo a contacto@ene-muebles.cl.",
    ],
  },
  {
    heading: "6. Encargados de tratamiento",
    body: [
      "Ene Muebles comparte datos con proveedores estrictamente necesarios para operar: hosting del sitio, plataforma de gestión de contenidos (CMS), servicios de correo y proveedor de WhatsApp. Estos proveedores tratan los datos por cuenta de Ene Muebles según las instrucciones recibidas.",
    ],
  },
  {
    heading: "7. Transferencias internacionales",
    body: [
      "Algunos proveedores de servicios pueden almacenar datos en servidores fuera de Chile. En esos casos, Ene Muebles exige contractualmente niveles de protección acordes a la normativa aplicable y limita el acceso a la información estrictamente necesaria.",
    ],
  },
  {
    heading: "8. Derechos del titular",
    body: [
      "El titular de los datos puede ejercer en cualquier momento los derechos de acceso, rectificación, cancelación y oposición (ARCO) reconocidos por la Ley 19.628 sobre Protección de Datos Personales de Chile. Para hacerlo, debe enviar una solicitud a contacto@ene-muebles.cl indicando nombre completo, medio de contacto y el derecho que desea ejercer.",
      "Ene Muebles responderá a la solicitud en los plazos que la normativa exige, previa verificación de la identidad del solicitante.",
    ],
  },
  {
    heading: "9. Seguridad",
    body: [
      "Ene Muebles aplica medidas técnicas y organizativas razonables para proteger los datos personales, incluyendo control de acceso, conexiones cifradas y registro de operaciones. Aun así, ningún sistema es completamente seguro y el usuario debe proteger sus credenciales y equipos.",
    ],
  },
  {
    heading: "10. Cambios a esta política",
    body: [
      "Ene Muebles puede modificar esta política para reflejar cambios legales u operativos. La versión vigente se publica en esta misma URL, identificada con la fecha de última actualización.",
    ],
  },
];

export default function PrivacidadPage() {
  return (
    <>
      <section aria-labelledby="privacidad-heading" className="bg-paper">
        <div className="mx-auto w-full max-w-[1440px] px-6 pt-24 pb-16 sm:px-10 sm:pt-28 sm:pb-20 lg:px-16 lg:pt-32 lg:pb-24">
          <div className="flex items-center gap-3">
            <span className="block h-px w-10 bg-taupe" aria-hidden />
            <span className="t-label text-taupe-text">Legal</span>
          </div>
          <h1
            id="privacidad-heading"
            className="t-display mt-8 max-w-[24ch] text-[clamp(2.5rem,1.25rem+5vw,5rem)] text-ink"
          >
            Política de privacidad.
          </h1>
          <p className="t-body mt-8 max-w-[55ch] text-lg text-ink-mute sm:text-xl">
            {site.privacyIntro}
          </p>
        </div>
      </section>

      <section className="bg-paper">
        <div className="mx-auto w-full max-w-[1440px] px-6 pb-24 sm:px-10 sm:pb-28 lg:px-16 lg:pb-32">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
            <aside className="lg:col-span-3">
              <div className="lg:sticky lg:top-28">
                <p className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft-text">
                  Contenido
                </p>
                <ol className="mt-4 space-y-2 t-mono text-xs text-ink-mute">
                  {sections.map((s, i) => (
                    <li key={s.heading}>
                      <a
                        href={`#${s.heading.replace(/\s+/g, "-").toLowerCase()}`}
                        className="hover:text-taupe-text"
                      >
                        {String(i + 1).padStart(2, "0")} ·{" "}
                        {s.heading.replace(/^\d+\.\s*/, "")}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            </aside>
            <article className="lg:col-span-8 lg:col-start-5">
              <div className="space-y-12">
                {sections.map((section) => (
                  <section
                    key={section.heading}
                    id={section.heading
                      .replace(/\s+/g, "-")
                      .toLowerCase()}
                    className="scroll-mt-28"
                  >
                    <h2 className="t-h2 text-2xl text-ink">
                      {section.heading}
                    </h2>
                    <div className="mt-5 space-y-4 text-pretty text-base leading-[1.7] text-ink-mute">
                      {section.body.map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
              <p className="t-mono mt-16 text-[11px] uppercase tracking-[0.22em] text-ink-soft-text">
                {site.legalUpdated}
              </p>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
