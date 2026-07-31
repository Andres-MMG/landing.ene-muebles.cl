# Delta para Product Schema

> Modifica la capacidad `strapi-content-model` agregando atributos al
> content-type `Product` para absorber el catálogo Excel 2025.

## ADDED Requirements

### Requirement: Atributos de catalogación en Product

El content-type `Product` MUST exponer los siguientes atributos
además de los ya existentes (`name`, `slug`, `description`, `price`,
`currency`, `category`, `images`, etc.):

| Atributo | Tipo Strapi v5 | Notas |
| --- | --- | --- |
| `externalId` | `uid` (target: `externalId`) | Único; clave de idempotencia. |
| `productType` | `string` (enum, max 60) | "Silla", "Mesa", "Banca", etc. |
| `subcategory` | `relation` (manyToOne → `api::subcategory.subcategory`) | Nueva entidad. |
| `usageEnvironment` | `string` (max 200) | "Sala de clases / educación", etc. |
| `observableColor` | `string` (max 120) | Color observado visualmente. |
| `observableMaterial` | `string` (max 200) | Material observado visualmente. |
| `catalogPage` | `integer` (min 1) | Página del PDF de origen. |
| `confidence` | `enumeration` (`alta`, `media-variante-visual`, `media-nombre-generico-pdf`, `revision-manual`) | Certeza de la extracción. |
| `source` | `string` (max 200) | Archivo + página. |
| `observation` | `text` (max 1000) | Notas del catálogo. |

Ninguno de los nuevos atributos MUST ser requerido al crear un producto
desde el formulario admin existente — el cambio MUST preservar la
compatibilidad hacia atrás.

#### Scenario: externalId identifica de forma única cada producto

- GIVEN un producto existente con `externalId = "CAT-2025-001"`
- WHEN el sistema busca otro producto por `externalId = "CAT-2025-001"`
- THEN devuelve exactamente ese mismo producto

#### Scenario: Atributos opcionales en el formulario admin existente

- GIVEN un admin autenticado en `/admin/productos/nuevo`
- WHEN envía el formulario con sólo `name`, `description`, `price`
- THEN el producto se crea en Strapi sin errores
- AND los nuevos atributos (`externalId`, `confidence`, etc.) quedan `null`

### Requirement: Content-type Subcategory

El CMS MUST exponer un nuevo content-type `Subcategory` con los
siguientes atributos:

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `name` | `string`, required, max 60 | "Sillas y asientos", etc. |
| `slug` | `uid` (target: `name`), required | Único. |
| `category` | `relation` (manyToOne → `api::category.category`) | Padre. |
| `order` | `integer`, default 0 | Orden dentro de la categoría padre. |
| `active` | `boolean`, default true | |

#### Scenario: Subcategory pertenece a una Category

- GIVEN una subcategoría "Sillas y asientos" ligada a `Category: Escolar`
- WHEN la API devuelve el producto que la referencia
- THEN la respuesta incluye `subcategory.name = "Sillas y asientos"`
- AND `subcategory.category.name = "Escolar"`

#### Scenario: Subcategory es opcional en Product

- GIVEN un producto existente sin `subcategory`
- WHEN se lee el producto por API
- THEN el campo `subcategory` es `null` (no rompe la lectura)

### Requirement: confidence acepta revisión manual

El enum `confidence` MUST incluir el valor `revision-manual` como
opción válida. El endpoint de import MUST mapear cualquier valor de
`Certeza` que no sea `alta`, `media - variante visual` o
`media - nombre genérico en PDF` a `revision-manual`.

#### Scenario: Certeza vacía se mapea a revision-manual

- GIVEN una fila del Excel donde la columna `Certeza` está vacía
- WHEN se procesa la fila en el import
- THEN el producto resultante tiene `confidence = "revision-manual"`
- AND el resumen de la import lista esa fila en `Advertencias`

#### Scenario: Certeza conocida se preserva

- GIVEN una fila con `Certeza = "alta"`
- WHEN se importa
- THEN el producto resultante tiene `confidence = "alta"`

### Requirement: externalId es la clave de idempotencia

El sistema MUST usar `externalId` como clave de deduplicación durante
el import. Reimportar el mismo archivo NO debe crear duplicados; debe
actualizar los productos existentes en su lugar.

#### Scenario: externalId conocido actualiza en lugar de crear

- GIVEN un producto existente con `externalId = "CAT-2025-001"` y
  `name = "Silla escolar sala cuna"`
- WHEN el import recibe una fila con el mismo `externalId` y
  `name = "Silla escolar sala cuna v2"`
- THEN el producto existente se actualiza con el nuevo `name`
- AND no se crea un segundo producto

#### Scenario: externalId desconocido crea producto

- GIVEN un producto existente con `externalId = "CAT-2025-001"`
- WHEN el import recibe una fila con `externalId = "CAT-2025-999"`
- THEN se crea un nuevo producto con ese `externalId`

## MODIFIED Requirements

### Requirement: price default 0 cuando viene vacío

El endpoint de import MUST registrar `price = 0` cuando la celda
`price` del Excel viene vacía o no parsea a número, y MUST registrar
esa fila en la lista de `Advertencias` del resumen.

(Anteriormente: el import rechazaba la fila con error; ahora se
importa con `price = 0` y se reporta como advertencia para no
bloquear el lote.)

#### Scenario: price vacío no bloquea la fila

- GIVEN una fila con todos los campos completos excepto `price`
- WHEN se procesa la fila en el import
- THEN el producto se crea con `price = 0`
- AND el resumen incluye la fila en `Advertencias: precio faltante`

### Requirement: slug derivado del nombre + externalId

El endpoint de import MUST derivar el `slug` del producto como
`slugify(name) + '-' + externalId`. El slug generado MUST ser único
dentro de la base.

(Anteriormente: el slug se derivaba de `name` solo, lo que producía
colisiones entre productos con nombres similares dentro de la misma
categoría.)

#### Scenario: slug incluye externalId para evitar colisiones

- GIVEN dos filas con `name = "Silla escolar"` y externalIds
  `CAT-2025-001` y `CAT-2025-002`
- WHEN se importan
- THEN los slugs resultantes son `silla-escolar-cat-2025-001` y
  `silla-escolar-cat-2025-002`
- AND ambos son únicos en la base