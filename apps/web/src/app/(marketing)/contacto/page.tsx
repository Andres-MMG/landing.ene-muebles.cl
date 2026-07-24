import { getSiteSettings, buildWhatsAppLink } from "@/lib/strapi";
import { site } from "@ene/ui-tokens";

export const revalidate = 60;
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Contacto",
  description:
    "Habla con Ene Muebles: WhatsApp, email, teléfono y dirección para cotizar mobiliario escolar y de oficina para tu institución.",
};

const regiones = [
  "Arica y Parinacota",
  "Tarapacá",
  "Antofagasta",
  "Atacama",
  "Coquimbo",
  "Valparaíso",
  "Metropolitana",
  "O'Higgins",
  "Maule",
  "Ñuble",
  "Biobío",
  "La Araucanía",
  "Los Ríos",
  "Los Lagos",
  "Aysén",
  "Magallanes",
];

export default async function ContactoPage() {
  const settings = await getSiteSettings();

  const whatsappHref = settings.whatsappNumber
    ? buildWhatsAppLink(
        settings.whatsappNumber,
        "Hola, me gustaría una cotización de mobiliario institucional."
      )
    : null;

  return (
    <>
      <section aria-labelledby="contacto-heading" className="bg-paper">
        <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-12 px-6 pt-24 pb-16 sm:px-10 sm:pt-28 sm:pb-20 lg:grid-cols-12 lg:gap-16 lg:px-16 lg:pt-32 lg:pb-24">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3">
              <span className="block h-px w-10 bg-taupe" aria-hidden />
              <span className="t-label text-taupe-deep">
                {site.contactOverline}
              </span>
            </div>
            <h1
              id="contacto-heading"
              className="t-display mt-8 max-w-[20ch] text-[clamp(2.5rem,1.25rem+5vw,5rem)] text-ink"
            >
              {site.contactHeadingPage}
            </h1>
            <p className="t-body mt-8 max-w-[55ch] text-lg text-ink-mute sm:text-xl">
              {site.contactBodyPage}
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 bg-ink px-7 py-4 text-sm font-medium uppercase tracking-[0.18em] text-paper transition-colors duration-500 hover:bg-taupe-deep"
                >
                  {site.whatsappCta}
                  <span aria-hidden>→</span>
                </a>
              ) : null}
              {settings.contactEmail ? (
                <a
                  href={`mailto:${settings.contactEmail}`}
                  className="t-label text-ink underline-offset-[6px] hover:text-taupe-deep hover:underline"
                >
                  {site.emailLabel} · {settings.contactEmail}
                </a>
              ) : null}
            </div>
          </div>
          <aside className="lg:col-span-4 lg:col-start-9">
            <p className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
              Si prefieres
            </p>
            <dl className="mt-4 space-y-0 border-t border-ink-line">
              {settings.contactPhone ? (
                <div className="flex items-baseline justify-between border-b border-ink-line py-4">
                  <dt className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
                    {site.phoneLabel}
                  </dt>
                  <dd className="t-mono text-base text-ink">
                    <a
                      href={`tel:${settings.contactPhone.replace(/\s/g, "")}`}
                      className="transition-colors hover:text-taupe-deep"
                    >
                      {settings.contactPhone}
                    </a>
                  </dd>
                </div>
              ) : null}
              {settings.whatsappNumber ? (
                <div className="flex items-baseline justify-between border-b border-ink-line py-4">
                  <dt className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
                    {site.whatsappLabel}
                  </dt>
                  <dd className="t-mono text-base text-ink">
                    {settings.whatsappNumber}
                  </dd>
                </div>
              ) : null}
              {settings.businessHours ? (
                <div className="flex items-baseline justify-between border-b border-ink-line py-4">
                  <dt className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
                    {site.hoursLabel}
                  </dt>
                  <dd className="t-mono text-base text-ink">
                    {settings.businessHours}
                  </dd>
                </div>
              ) : null}
              {settings.address ? (
                <div className="flex items-baseline justify-between py-4">
                  <dt className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
                    {site.addressLabel}
                  </dt>
                  <dd className="t-mono text-sm text-ink-mute">
                    {settings.address}
                  </dd>
                </div>
              ) : null}
            </dl>
          </aside>
        </div>
      </section>

      <section className="bg-ink text-paper">
        <div className="mx-auto w-full max-w-[1440px] px-6 pt-24 pb-20 sm:px-10 sm:pt-28 sm:pb-24 lg:px-16 lg:pt-32 lg:pb-28">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <div className="flex items-center gap-3">
                <span className="block h-px w-10 bg-taupe" aria-hidden />
                <span className="t-label text-taupe">Formulario</span>
              </div>
              <h2 className="t-h2 mt-6 text-[clamp(2rem,1.2rem+3vw,3rem)] text-paper">
                Envíanos tu requerimiento.
              </h2>
              <p className="t-body mt-6 text-base text-paper-mute-on-ink">
                {site.contactoNote}
              </p>
            </div>
            <form
              className="lg:col-span-7 space-y-5"
              action={`mailto:${settings.contactEmail ?? ""}`}
              method="post"
              encType="text/plain"
              aria-label="Formulario de contacto"
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="t-mono text-[10px] uppercase tracking-[0.22em] text-paper-mute-on-ink">
                    {site.contactoFieldName}
                  </span>
                  <input
                    type="text"
                    name="nombre"
                    required
                    className="mt-2 w-full border-b border-paper-line-on-ink bg-transparent py-3 text-paper placeholder:text-paper-soft focus:border-taupe focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="t-mono text-[10px] uppercase tracking-[0.22em] text-paper-mute-on-ink">
                    {site.contactoFieldCompany}
                  </span>
                  <input
                    type="text"
                    name="institucion"
                    className="mt-2 w-full border-b border-paper-line-on-ink bg-transparent py-3 text-paper placeholder:text-paper-soft focus:border-taupe focus:outline-none"
                  />
                </label>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="t-mono text-[10px] uppercase tracking-[0.22em] text-paper-mute-on-ink">
                    {site.contactoFieldEmail}
                  </span>
                  <input
                    type="email"
                    name="email"
                    required
                    className="mt-2 w-full border-b border-paper-line-on-ink bg-transparent py-3 text-paper placeholder:text-paper-soft focus:border-taupe focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="t-mono text-[10px] uppercase tracking-[0.22em] text-paper-mute-on-ink">
                    {site.contactoFieldPhone}
                  </span>
                  <input
                    type="tel"
                    name="telefono"
                    className="mt-2 w-full border-b border-paper-line-on-ink bg-transparent py-3 text-paper placeholder:text-paper-soft focus:border-taupe focus:outline-none"
                  />
                </label>
              </div>
              <label className="block">
                <span className="t-mono text-[10px] uppercase tracking-[0.22em] text-paper-mute-on-ink">
                  {site.contactoFieldRegion}
                </span>
                <select
                  name="region"
                  defaultValue=""
                  className="mt-2 w-full border-b border-paper-line-on-ink bg-transparent py-3 text-paper focus:border-taupe focus:outline-none"
                >
                  <option value="" disabled className="bg-ink text-paper">
                    Selecciona una región
                  </option>
                  {regiones.map((region) => (
                    <option
                      key={region}
                      value={region}
                      className="bg-ink text-paper"
                    >
                      {region}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="t-mono text-[10px] uppercase tracking-[0.22em] text-paper-mute-on-ink">
                  {site.contactoFieldMessage}
                </span>
                <textarea
                  name="mensaje"
                  rows={4}
                  required
                  className="mt-2 w-full border-b border-paper-line-on-ink bg-transparent py-3 text-paper placeholder:text-paper-soft focus:border-taupe focus:outline-none"
                />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-4 pt-6">
                <p className="t-mono text-[10px] uppercase tracking-[0.22em] text-paper-mute-on-ink">
                  Respondemos en 24 h hábiles
                </p>
                <button
                  type="submit"
                  className="inline-flex items-center gap-3 bg-taupe px-7 py-4 text-sm font-medium uppercase tracking-[0.18em] text-ink transition-colors duration-500 hover:bg-paper"
                >
                  {site.contactoSubmit}
                  <span aria-hidden>→</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
