// Static site copy — used when the same text is repeated across views and
// should not live in Strapi. Keep this file small: long-form content
// (about, tagline) belongs in the CMS.
export const site = {
  brand: "ENE-MUEBLES",
  promise: "Mobiliario resistente para aulas, oficinas e instituciones.",
  // B1 (U6): single static default for dispatch coverage. The live
  // value lives in the site-setting `dispatchCoverage` field (seed:
  // "Despacho a todo Chile", pending business confirmation); every
  // static fallback string below uses the SAME wording so the site
  // never contradicts itself when the CMS is unreachable.
  dispatchCoverageFallback: "Despacho a todo Chile",
  dispatch: "Despacho a todo Chile · Cotización en 24 h · Garantía escrita",
  catalogAll: "Ver catálogo completo",
  whatsappCta: "Hablar por WhatsApp",
  quoteCta: "Solicitar cotización",
  emailLabel: "Correo",
  phoneLabel: "Teléfono",
  whatsappLabel: "WhatsApp",
  addressLabel: "Dirección",
  hoursLabel: "Horario",
  catalogOverview: "Líneas de producto",
  catalogOverviewAccent: "Catálogo 2026",
  aboutOverline: "Datos",
  aboutHeading: "Tres décadas fabricando mobiliario institucional.",
  featuredOverline: "Selección",
  featuredHeading: "Productos en catálogo activo.",
  contactOverline: "Hablemos",
  contactHeading: "Cotiza tu proyecto institucional.",
  contactBody:
    "Cuéntanos qué necesitas — cantidad, plazos, región — y te enviamos una propuesta con medidas, materiales, plazo de despacho y descuento por volumen.",
  footerCatalog: "Catálogo",
  footerContact: "Contacto",
  footerLegal: "Legal",
  footerCopy: "Proveedor de mobiliario escolar y de oficina en Chile. Despacho a todo Chile.",

  nav: [
    { label: "Inicio", href: "/" },
    { label: "Catálogo", href: "/catalogo" },
    { label: "Nosotros", href: "/nosotros" },
    { label: "Contacto", href: "/contacto" },
  ],

  aboutOverlineSec: "Sobre nosotros",
  aboutHeadingSec: "Un proveedor que entrega lo que promete.",
  aboutIntro:
    "Ene Muebles fabrica y distribuye mobiliario escolar y de oficina bajo estándares de pliego público. Cada pieza se entrega con ficha técnica, declaración de materiales y plazo de despacho por escrito.",
  // B2 batch 2 fix: split kicker (label) from statement (heading) so the
  // /nosotros page can render a small mono label and a longer h2 instead of
  // collapsing both to the same string. `missionLabel` / `visionLabel` are
  // the small kickers; `missionHeading` / `visionHeading` are the h2.
  missionLabel: "Misión",
  missionHeading:
    "Suministrar mobiliario institucional bajo estándares de pliego público.",
  missionBody:
    "Suministrar mobiliario escolar y de oficina que cumple con los estándares de pliego público, con despacho a todo Chile y respaldo escrito por cada operación.",
  visionLabel: "Visión",
  visionHeading:
    "Ser el proveedor de referencia en mobiliario institucional en Chile.",
  visionBody:
    "Ser el proveedor de referencia de mobiliario institucional en Chile, reconocido por cumplimiento, continuidad de servicio y calidad declarada.",
  valuesLabel: "Valores",
  valuesHeading: "Cuatro compromisos por escrito.",
  values: [
    {
      title: "Cumplimiento",
      body:
        "Cada despacho se ejecuta en el plazo pactado por escrito. Garantía escrita sobre cada producto.",
    },
    {
      title: "Materialidad",
      body:
        "Melamina 18 mm, cantos PVC termosellados, estructura metálica reforzada. Especificaciones declaradas.",
    },
    {
      title: "Cobertura",
      body:
        "Despacho a todo Chile. Cotización válida 30 días. Descuentos por volumen sobre toda la línea.",
    },
    {
      title: "Atención",
      body:
        "Cotización en 24 h hábiles. Asignación de un ejecutivo por cuenta para licitaciones y proyectos.",
    },
  ],

  contactHeadingPage: "Hablemos de tu proyecto.",
  contactBodyPage:
    "Ponte en contacto con nosotros. Cotizamos tu pedido en 24 horas hábiles, con ficha técnica, declaración de materiales y plazo de despacho por escrito.",
  contactoFieldName: "Nombre",
  contactoFieldCompany: "Institución o empresa",
  contactoFieldEmail: "Correo",
  contactoFieldPhone: "Teléfono",
  contactoFieldRegion: "Región",
  contactoFieldMessage: "Cuéntanos qué necesitas",
  contactoSubmit: "Enviar mensaje",
  contactoNote:
    "También puede escribirnos directamente a contacto@ene-muebles.cl o llamarnos al +569 9539 5339.",

  legalUpdated: "Última actualización: enero 2026.",
  termsIntro:
    "Estos términos y condiciones regulan el uso del sitio web de Ene Muebles y la relación comercial con sus clientes institucionales. Al utilizar este sitio o solicitar una cotización, el usuario acepta las condiciones aquí descritas.",
  privacyIntro:
    "Esta política describe cómo Ene Muebles trata los datos personales que recibe a través de su sitio web, canales de contacto y procesos comerciales, conforme a la Ley 19.628 sobre Protección de Datos Personales de Chile.",
} as const;
