# Especificación: bulk-import-endpoint

## Purpose

Define el contrato del endpoint `POST /api/admin/products/import`,
responsable de absorber el Excel de catálogo en lotes y dejarlo
reflejado en Strapi con idempotencia por `externalId`. Esta capacidad
es **nueva**; no existe un endpoint previo con la misma responsabilidad.

## Requirements

### Requirement: Lote por HTTP

El sistema MUST exponer `POST /api/admin/products/import` que recibe
un cuerpo JSON con la forma:

```json
{
  "rows": [
    {
      "externalId": "CAT-2025-001",
      "name": "Silla escolar sala cuna",
      "description": "...",
      "productType": "Silla",
      "category": "Escolar",
      "subcategory": "Sillas y asientos",
      "usageEnvironment": "Educación inicial / sala cuna",
      "observableColor": "madera natural y blanco",
      "observableMaterial": "Melamina o madera observable",
      "catalogPage": 2,
      "confidence": "alta",
      "source": "CATOLOGO PRODUCTOS- 2025.pdf, página 2",
      "observation": "Nombre y color revisados visualmente desde el catálogo."
    }
  ]
}
```

#### Scenario: Importa un lote válido

- GIVEN un admin autenticado con sesión válida
- AND un cuerpo con 5 filas válidas y `externalId` conocido/desconocido
- WHEN `POST /api/admin/products/import` recibe el cuerpo
- THEN la respuesta es `200` con `{ created: 3, updated: 2, failed: 0, warnings: 0 }`
- AND `rows` en la base coincide con el lote enviado

#### Scenario: Autenticación requerida

- GIVEN una request sin cookie `ene_admin_session` válida
- WHEN llega a `POST /api/admin/products/import`
- THEN la respuesta es `401 { "error": "Unauthorized" }`
- AND ninguna fila se procesa

### Requirement: Tope de lote

El endpoint MUST rechazar lotes mayores a **200 filas** con `413`
(`"Lote demasiado grande (máx 200 filas por request)")`.

#### Scenario: Lote dentro del tope

- GIVEN un cuerpo con exactamente 200 filas
- WHEN llega al endpoint
- THEN el procesamiento comienza sin error

#### Scenario: Lote sobre el tope

- GIVEN un cuerpo con 201 filas
- WHEN llega al endpoint
- THEN la respuesta es `413` con el mensaje de error
- AND ninguna fila se persiste

### Requirement: Auto-creación de categorías y subcategorías

Cuando el import detecta una `category` o `subcategory` cuyo nombre no
existe en Strapi, el endpoint MUST crearla automáticamente con los
siguientes defaults:

| Campo | Default |
| --- | --- |
| `slug` | `slugify(name)` |
| `order` | siguiente entero disponible en la categoría padre (sibling) |
| `active` | `true` |
| `description` | `null` |
| `image` | `null` |

La búsqueda de existentes MUST ser case-insensitive y acentos-insensitive
sobre el campo `name`.

#### Scenario: Categoría nueva se crea automáticamente

- GIVEN que `Category: Oficina` no existe en Strapi
- WHEN se importa una fila con `category: "Oficina"`
- THEN `Category: Oficina` se crea antes de procesar la fila
- AND el producto queda ligado a la nueva categoría

#### Scenario: Subcategoría nueva bajo categoría existente

- GIVEN que `Category: Escolar` existe
- AND `Subcategory: "Mesas y escritorios"` no existe
- WHEN se importa una fila con `category: "Escolar"` y
  `subcategory: "Mesas y escritorios"`
- THEN `Subcategory: "Mesas y escritorios"` se crea ligada a `Escolar`
- AND el producto queda ligado a ambas

#### Scenario: Categoría existente se reutiliza

- GIVEN que `Category: Escolar` ya existe con `documentId: "abc"`
- WHEN se importa una fila con `category: "Escolar"`
- THEN no se crea una segunda categoría
- AND el producto se liga a `documentId: "abc"`

### Requirement: Deduplicación por externalId

El endpoint MUST deduplicar por `externalId` antes de crear:

1. Buscar `Product` existente con `externalId = row.externalId`.
2. Si existe → actualizar campos editables.
3. Si no existe → crear nuevo.

La búsqueda MUST ejecutarse dentro del lote para evitar duplicados
cuando dos filas del mismo archivo comparten `externalId` (caso de
error humano al preparar el Excel): gana la última ocurrencia y se
registra un `warning` por fila sobrescrita intra-lote.

#### Scenario: Fila existente se actualiza

- GIVEN un producto con `externalId = "CAT-2025-001"` y
  `name = "Silla escolar sala cuna"`
- WHEN se importa una fila con el mismo `externalId` y
  `name = "Silla escolar sala cuna (v2)"`
- THEN el producto se actualiza con `name = "Silla escolar sala cuna (v2)"`
- AND el resumen cuenta la fila como `updated: 1`, NO como `created`

#### Scenario: externalId duplicado dentro del mismo lote

- GIVEN dos filas en el mismo request con
  `externalId = "CAT-2025-001"`
- WHEN se procesa el lote
- THEN sólo se crea/actualiza un producto
- AND el resumen incluye `warnings: 1`
- AND el mensaje indica `externalId duplicado dentro del lote`

### Requirement: Reporte por fila

El endpoint MUST devolver un reporte por fila en su respuesta, en el
mismo orden que el lote original:

```json
{
  "summary": { "created": 3, "updated": 2, "failed": 0, "warnings": 1 },
  "results": [
    { "externalId": "CAT-2025-001", "status": "updated", "documentId": "..." },
    { "externalId": "CAT-2025-002", "status": "created",  "documentId": "..." },
    { "externalId": "CAT-2025-003", "status": "failed",   "error": "..." },
    { "externalId": "CAT-2025-004", "status": "created",  "documentId": "...", "warnings": ["precio faltante"] }
  ]
}
```

El reporte MUST distinguir tres `status`: `created`, `updated`, `failed`.
Los `warnings` son listas opcionales de strings (ej. `precio faltante`,
`externalId duplicado dentro del lote`).

#### Scenario: Fila fallida se reporta y no aborta el lote

- GIVEN un lote de 5 filas, una de ellas con un `name` excesivamente
  largo (> 120 caracteres) que Strapi rechaza
- WHEN se procesa el lote
- THEN las otras 4 filas se procesan normalmente
- AND la fila fallida aparece en `results` con `status: "failed"`
- AND el campo `error` contiene el mensaje legible de Strapi
- AND el `summary` cuenta `failed: 1`

#### Scenario: Warning no es error

- GIVEN una fila con `price` faltante pero `name` válido
- WHEN se procesa el lote
- THEN la fila tiene `status: "created"` o `"updated"`
- AND `warnings` contiene `["precio faltante"]`
- AND `summary.warnings` se incrementa

### Requirement: Garantía de idempotencia

Importar el mismo archivo dos veces MUST producir el mismo estado en
la base: la segunda corrida devuelve `created: 0` y `updated: 160`
para un Excel de 160 filas. Ninguna fila debe quedar duplicada.

#### Scenario: Doble import del mismo Excel

- GIVEN un Excel de 160 filas importado por primera vez (todos
  creados)
- WHEN se ejecuta el import con el mismo archivo una segunda vez
- THEN `summary.created = 0`
- AND `summary.updated = 160`
- AND `summary.failed = 0`
- AND la cantidad de filas en Strapi no cambia

### Requirement: Aislamiento de fallos

Una fila que falla MUST NO impedir el procesamiento de las restantes.
Cada fila se procesa con un `try/catch` aislado dentro del loop
principal.

#### Scenario: Fila 50 falla, las restantes siguen

- GIVEN un lote de 100 filas, la fila 50 causa 500 en Strapi
- WHEN se procesa el lote
- THEN las filas 1-49 y 51-100 se procesan sin verse afectadas
- AND `results[49].status = "failed"` con el mensaje del 500

### Requirement: Mapeo de confianza

El endpoint MUST mapear la columna `Certeza` del Excel al enum
`confidence` del schema según la siguiente tabla:

| Valor en Excel | Valor en Strapi |
| --- | --- |
| `alta` | `alta` |
| `media - variante visual` | `media-variante-visual` |
| `media - nombre genérico en PDF` | `media-nombre-generico-pdf` |
| (cualquier otro, o vacío) | `revision-manual` |

#### Scenario: Certeza "alta" se preserva

- GIVEN una fila con `Certeza = "alta"`
- WHEN se importa
- THEN el producto queda con `confidence = "alta"`

#### Scenario: Certeza vacía se mapea a revision-manual

- GIVEN una fila con `Certeza = ""`
- WHEN se importa
- THEN el producto queda con `confidence = "revision-manual"`
- AND el resultado incluye `warnings: ["certeza vacía"]`

### Requirement: Productos nuevos entran en draft

Todos los productos creados por el import MUST entrar en estado
`draft` (sin `publishedAt`). El dueño del catálogo decide cuándo
publicar desde el formulario existente.

#### Scenario: Producto importado no aparece en el catálogo público

- GIVEN una import recién finalizada con 160 productos creados
- WHEN un visitante pide `GET /api/products` (endpoint público con
  `publicationState=live`)
- THEN el visitante recibe la lista previa (no ve los nuevos
  productos hasta que el dueño los publique)