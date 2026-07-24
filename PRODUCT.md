# Product

## Register

brand

## Platform

web

## Users

Compradores institucionales en Chile: encargados de adquisiciones en colegios, municipalidades, universidades y empresas. Están midiendo proveedores para licitaciones, cotizaciones por volumen y plazos de despacho. Necesitan ver el catálogo, confirmar certificaciones, materiales y medidas, y disparar una cotización sin tener que pedir información básica. Quieren confiar rápido en que el proveedor cumple lo que promete y existe físicamente.

## Product Purpose

Catálogo institucional consultable de mobiliario escolar y de oficina de ENE Muebles, con el detalle técnico (medidas, materiales, precio estimado) y los datos de contacto verificables que un comprador B2B necesita para incluir al proveedor en una licitación o cerrarlo como proveedor permanente. Éxito = cotizaciones enviadas con la información completa del cliente, sin idas y vueltas para pedir medidas, materiales o plazos.

## Positioning

**El proveedor de mobiliario institucional que entrega lo que promete: catálogo certificado, despacho a todo Chile, cotización en 24 horas.**

No competimos por calor artesanal ni por estética nórdica. Competimos por **cumplimiento**: un proveedor que responde, despacha en plazo y respalda el producto con garantía escrita. La página refleja ese compromiso: datos concretos, ningún adorno, ninguna promesa vacía.

## Conversion & proof

- **CTA primario:** "Solicitar cotización" — abre WhatsApp con un mensaje pre-armado que ya incluye el nombre del producto o categoría.
- **CTA secundario:** "Ver catálogo completo" — `/catalogo` con los 20 productos del portafolio, filtros por línea y SKU.
- **Línea memorable (10 s):** "Mobiliario resistente para aulas, oficinas e instituciones. Despacho a todo Chile. Cotización en 24 h."
- **Creencia (en orden):**
  1. Es un proveedor real con catálogo concreto (no un revendedor de marketplace).
  2. Tiene stock para atender volumen.
  3. Despacha a regiones.
  4. Cumple plazos.
  5. Certifica materiales y respaldo de garantía.
- **Prueba actual:**
  - 20 productos publicados con fotos, nombre, descripción, dimensiones, materiales, precio estimado.
  - Datos de contacto verificables (email, teléfono, WhatsApp, dirección física en Santiago).
  - Sin testimonios formales aún; sin logos de clientes publicados. La prueba hoy es la seriedad del catálogo mismo.

## Brand Personality

**Frío, técnico, industrial.** No intentar generar calidez.

Voz escrita como un proveedor que lleva décadas en el rubro y no necesita convencer con adjetivos. Materia > promesa. Hechos > floritura. Sin emojis, sin signos de exclamación falsos, sin "calidad premium", sin "diseño exclusivo".

Una frase típica: **"Muebles en melamina 18 mm, cantos PVC termosellados, estructura reforzada. Plazo de despacho: 7 días hábiles en Región Metropolitana."**

No una frase típica: "Muebles llenos de calidez para tu hogar."

**Tres palabras para la personalidad:** serio, cumplido, directo.

## Anti-references

- **Cream-everything AI-default 2026** — body bg `#F9F8F6` inflando todas las secciones como si fueran "warm-neutral" sutil. Eso es monocultura AI, no identidad.
- **Reflex-reject font list** — Fraunces, Newsreader, Lora, Playfair Display, Inter, DM Sans, IBM Plex, Space Grotesk, Hanken Grotesk + Source Serif 4 (ambos ya en uso; se mantienen por identidad, pero la combinación cruda display-serif + body-italic-scroll-tracking NO es la jugada: Hanken manda, Source Serif aparece UNA vez).
- **Editorial-typographic lane** — display serif italic + mono labels + reglas finas + 3 columnas + sin imágenes. Klim-imitación. No aplica a un catálogo de muebles.
- **Cards idénticas en grid regular** — `icon + heading + text` × N. No aplica. Aquí se trabaja con filas indizadas, no con cards.
- **Numbered scaffolding (01 / 02 / 03) como marca de sección** — los números son para datos, no para decoración.
- **Tiny uppercase tracked kicker ("LÍNEAS DE PRODUCTO", "COTIZACIÓN") en cada sección** — el AI grammar más detectable. Si aparece, es porque el sistema lo pide, no por reflejo.
- **Side-stripe `border-left` como accent** — `border-l-2` con color de marca sobre tarjetas o callouts. Reescribir con borde completo, fondo tintado, número al frente, o nada.
- **`tracking-[-0.035em]` y más apretado en headings display** — las letras se tocan; suma al efecto "ai-default". El piso es `-0.04em`; para grotesca display moderna, `-0.02em` está bien.
- **Gradient text, glassmorphism, hero-metric template, sketchy SVG illustrations, diagonal stripes, decorative grid backgrounds** — match-and-refuse.

## Design Principles

1. **Ink manda, taupe acento.** El negro tinta es la presencia de la página, no decoración. El taupe aparece en momentos contados: separadores finos, CTA secundario, números grandes, líneas divisorias. El cream queda solo como tint en superficies secundarias, nunca como body.

2. **Tipografía como sistema, no como decoración.** Hanken Grotesk maneja el 90 % de la página (body, títulos, labels, números). Source Serif 4 aparece UNA vez: el h1 del hero. Cero italics en display. Cero drop caps. Cero mono "técnico" en headings.

3. **Cadencia rota, no uniforme.** Cada sección usa un módulo distinto del grid de 12. No repetir el patrón "kicker + h2 + body + CTA". Si una sección no aporta dato concreto, no merece estar.

4. **Hechos > adjetivos.** Números cuando se pueda: "20 productos · 2 líneas · +30 años". Medidas y materiales explícitos en cada producto. Dirección, RUT, horario en el footer. Sin "calidad premium", sin "diseño exclusivo".

5. **Sin lugar para el "relleno AI".** Cero emojis, cero iconos decorativos arriba de headings, cero gradientes, cero glassmorphism, cero sombras blandas. Si falta una imagen, se sustituye por tipografía, no por un SVG ilustrativo.

6. **Asimetría con propósito.** Las secciones alternan composición: el hero quiebra el grid, las categorías son un índice, los productos destacados usan un módulo de 1 grande + 5 chicos, el about es un bloque de stats, el CTA es full-bleed, el footer es un data dump. La unidad es la tipografía, no el template.

## Accessibility & Inclusion

WCAG 2.1 AA como mínimo. Contraste ≥ 4.5:1 en texto de cuerpo, ≥ 3:1 en headings y labels. Anchor text descriptivo. Focus visible en todos los interactivos. Imágenes con `alt` real (no decorativas). Un solo h1 por página; jerarquía semántica estricta. `prefers-reduced-motion: reduce` respetado en todas las animaciones: secciones que aparecen con fade-in en JS → instant; imágenes con scale en hover → no scale. Texto del cuerpo en ≥ 16 px, line-height 1.6 en prosa larga, 1.0–1.1 en display. Lengua del documento: `es-CL`.
