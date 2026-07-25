import { site } from "@ene/ui-tokens";

export const revalidate = 3600;
export const metadata = {
  title: "Términos y condiciones",
  description:
    "Términos y condiciones que regulan el uso del sitio web de Ene Muebles y la relación comercial con clientes institucionales.",
};

const sections = [
  {
    heading: "1. Aceptación",
    body: [
      "Al acceder a este sitio web o solicitar una cotización a través de los canales publicados por Ene Muebles, el usuario acepta los presentes términos y condiciones. Si no está de acuerdo con alguno de los puntos descritos, debe abstenerse de utilizar el sitio y de iniciar cualquier relación comercial.",
      "Ene Muebles puede modificar estos términos en cualquier momento. Las modificaciones se publicarán en esta misma URL y entrarán en vigencia desde su publicación.",
    ],
  },
  {
    heading: "2. Uso del sitio",
    body: [
      "Este sitio se publica con fines informativos sobre el catálogo de mobiliario, los canales de contacto y los procesos de cotización institucionales. El usuario se compromete a utilizar el sitio de manera lícita, sin realizar acciones que puedan dañar, inutilizar o impedir su normal funcionamiento.",
      "Queda prohibida la reproducción total o parcial del contenido sin autorización escrita, salvo para fines de cotización interna.",
    ],
  },
  {
    heading: "3. Información del catálogo",
    body: [
      "Las imágenes, descripciones, dimensiones, materiales y precios publicados son referenciales y pueden variar según lote, región de despacho y volumen cotizado. La propuesta comercial definitiva se entrega por escrito en la cotización formal.",
      "Ene Muebles se reserva el derecho de modificar el catálogo sin previo aviso, manteniendo los productos ya cotizados en las condiciones ofrecidas mientras la cotización se encuentre vigente.",
    ],
  },
  {
    heading: "4. Cotizaciones y aceptaciones",
    body: [
      "Las cotizaciones son válidas por 30 días corridos desde su emisión, salvo que la propuesta indique algo distinto. La aceptación debe formalizarse por escrito (correo electrónico, carta o documento equivalente) y puede requerir firma del responsable institucional.",
      "Los precios no incluyen flete ni montaje ni servicios adicionales, salvo que la cotización los exprese expresamente.",
    ],
  },
  {
    heading: "5. Despacho y entrega",
    body: [
      "Los plazos de despacho indicados en cada cotización son referenciales y se cuentan en días hábiles. Ene Muebles informará cualquier atraso previsto, manteniendo la trazabilidad del pedido.",
      "La recepción conforme debe ser firmada por el responsable habilitado en la dirección de entrega indicada en la cotización.",
    ],
  },
  {
    heading: "6. Garantía",
    body: [
      "Ene Muebles respalda los productos suministrados con garantía escrita por 1 año desde la recepción conforme, sobre defectos de fabricación y materiales. La garantía no cubre desgaste por uso indebido, intervenciones de terceros o daños por transporte ajeno a Ene Muebles.",
    ],
  },
  {
    heading: "7. Propiedad intelectual",
    body: [
      "Las marcas, logos, fotografías de productos y demás contenidos publicados son de propiedad de Ene Muebles o de sus proveedores y se utilizan con autorización. Queda prohibida su reutilización sin consentimiento escrito.",
    ],
  },
  {
    heading: "8. Limitación de responsabilidad",
    body: [
      "Ene Muebles no será responsable por daños indirectos, lucro cesante o cualquier perjuicio derivado del uso del sitio o de la imposibilidad de acceder a él. La responsabilidad total por cualquier compra se limita al monto efectivamente pagado por el producto en cuestión.",
    ],
  },
  {
    heading: "9. Ley aplicable y jurisdicción",
    body: [
      "Estos términos se rigen por las leyes de la República de Chile. Cualquier controversia se resolverá ante los tribunales ordinarios de la ciudad de Santiago, sin perjuicio de los derechos del consumidor cuando correspondan.",
    ],
  },
  {
    heading: "10. Contacto",
    body: [
      "Para consultas sobre estos términos, escríbanos a contacto@ene-muebles.cl o llámenos al +56 2 2898 4421 en horario hábil.",
    ],
  },
];

export default function TerminosPage() {
  return (
    <>
      <section aria-labelledby="terminos-heading" className="bg-paper">
        <div className="mx-auto w-full max-w-[1440px] px-6 pt-24 pb-16 sm:px-10 sm:pt-28 sm:pb-20 lg:px-16 lg:pt-32 lg:pb-24">
          <div className="flex items-center gap-3">
            <span className="block h-px w-10 bg-taupe" aria-hidden />
            <span className="t-label text-taupe-deep">Legal</span>
          </div>
          <h1
            id="terminos-heading"
            className="t-display mt-8 max-w-[24ch] text-[clamp(2.5rem,1.25rem+5vw,5rem)] text-ink"
          >
            Términos y condiciones.
          </h1>
          <p className="t-body mt-8 max-w-[55ch] text-lg text-ink-mute sm:text-xl">
            {site.termsIntro}
          </p>
        </div>
      </section>

      <section className="bg-paper">
        <div className="mx-auto w-full max-w-[1440px] px-6 pb-24 sm:px-10 sm:pb-28 lg:px-16 lg:pb-32">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
            <aside className="lg:col-span-3">
              <div className="lg:sticky lg:top-28">
                <p className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
                  Contenido
                </p>
                <ol className="mt-4 space-y-2 t-mono text-xs text-ink-mute">
                  {sections.map((s, i) => (
                    <li key={s.heading}>
                      <a
                        href={`#${s.heading.replace(/\s+/g, "-").toLowerCase()}`}
                        className="hover:text-taupe-deep"
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
              <p className="t-mono mt-16 text-[11px] uppercase tracking-[0.22em] text-ink-soft">
                {site.legalUpdated}
              </p>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
