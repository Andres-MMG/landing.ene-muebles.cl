# Tareas: catalog-excel-import

## Forecast de carga de revisión

| Archivo | Acción | Δ est. |
| --- | --- | --- |
| `apps/cms/src/api/product/content-types/product/schema.json` | Modified — +10 atributos | +60 |
| `apps/cms/src/api/subcategory/content-types/subcategory/schema.json` | New | +20 |
| `apps/cms/src/api/subcategory/controllers/subcategory.ts` | New | +5 |
| `apps/cms/src/api/subcategory/routes/subcategory.ts` | New | +5 |
| `apps/cms/src/api/subcategory/services/subcategory.ts` | New | +5 |
| `apps/web/src/lib/admin/strapi-admin.ts` | Modified — +helpers de import | +120 |
| `apps/web/src/app/api/admin/products/import/route.ts` | New — endpoint batch | +180 |
| `apps/web/src/app/admin/(authenticated)/productos/importar/page.tsx` | New — server component | +60 |
| `apps/web/src/app/admin/(authenticated)/productos/importar/ImportForm.tsx` | New — client (parseo + UI) | +320 |
| `apps/web/src/app/admin/(authenticated)/productos/importar/excel.ts` | New — parser SheetJS puro | +90 |
| `apps/web/src/app/admin/(authenticated)/layout.tsx` | Modified — link "Importar" en sidebar | +5 |
| `apps/web/package.json` | Modified — dep `xlsx` | +1 |
| `openspec/changes/catalog-excel-import/verify-report.md` | New | +80 |
| **Total** | | **≈ 951 Δ** |

```text
Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending (orchestrator will pause and ask user)
400-line budget risk: High
```

> Forecast > 400 líneas. El apply phase **debe** pausar y preguntar
> al usuario entre PRs encadenados o `size:exception`.

### Unidades de trabajo sugeridas

| Unidad | Objetivo | PR probable | Notas |
| --- | --- | --- | --- |
| **S1** | Schema + Subcategory + helpers Strapi | PR 1 | ≈ 215 Δ; base `main` |
| **S2** | Endpoint `POST /api/admin/products/import` + tests | PR 2 | ≈ 280 Δ; base `main` |
| **S3** | Página `/admin/productos/importar` + parser + UI | PR 3 | ≈ 470 Δ; base `main` |
| **S4** (opcional) | Mostrar `externalId`/`confidence` en lista y formulario admin | PR 4 | ≈ 80 Δ; base `main` |

> Tres slices mergeables independientemente (S1, S2, S3) cubren el
> flujo end-to-end. S4 es opcional y se puede diferir sin bloquear la
> entrega principal.

---

## Slice S1 — Schema + Subcategory + helpers Strapi (~215 Δ)

> **Estado al cierre de S1 (apply-phase, 2026-07-28):** el orquestador
> estrechó S1 a la primera tarea original (1.1) más dos entregables
> mínimos acordivados por el orquestrador (helpers de fila puros en
> `parseExcelRow.ts` y tipos públicos en `strapi.ts`). Las tareas 1.2
> (Subcategory), 1.3 (helpers de import en `strapi-admin.ts`) y 1.4
> (`types/product.ts`) quedan pendientes para un slice posterior (S1b
> o S2, según decida el orquestrador).

- [x] **1.1** Agregar los 10 atributos nuevos a `Product` en Strapi
  - Archivo: `apps/cms/src/api/product/content-types/product/schema.json`
  - Acceptance: schema válido; `pnpm --filter cms build` exit 0.
  - Evidencia: `grep -c "externalId" schema.json` retorna ≥ 1;
    `pnpm --filter cms build` exit 0.
  - **Implementación:** 10 atributos agregados (`externalId`,
    `productType`, `subcategory`, `usageEnvironment`, `observableColor`,
    `observableMaterial`, `catalogPage`, `confidence`, `source`,
    `observation`). Todos opcionales. `externalId` se declaró como
    `string unique sparse maxLength 32` (en lugar de `uid` según la
    propuesta original) para minimizar el acoplamiento con el uid
    generator de Strapi; el endpoint de import en S2 recibirá la key
    cruda y la pasará como `{ data: { externalId: "CAT-2025-001" } }`,
    comportamiento soportado por Strapi v5 sobre atributos `string`
    únicos. La promoción a `uid` queda abierta como decisión de S2/S3
    si el import crece.
  - **Subcategory:** declarada como `string maxLength 80` (no relación)
    porque el content-type `Subcategory` se difiere a un slice
    posterior. El helper `mapExcelRowToProduct` produce la misma
    forma de string, así que S2 lo promoverá a relación sin cambios
    al parser.

- [ ] **1.1b** Tipos públicos `Product` extendidos en `apps/web`
  - Archivo: `apps/web/src/lib/strapi.ts`
  - Acceptance: 10 campos opcionales en `Product`; constantes
    `PRODUCT_CONFIDENCE_VALUES` y `PRODUCT_TYPE_VALUES` exportadas;
    `normalizeProduct` los propaga desde la respuesta de Strapi.
  - Evidencia: `grep -n "^export.*Product" strapi.ts` lista los tipos.
  - **Implementación:** añadido dentro del mismo commit que 1.1
    (orchestrator pidió mantenerlo en S1). `AdminProduct` no existía
    en `strapi-admin.ts`, así que se respetó la cláusula condicional
    "si existe" del orchestrator y no se creó.

- [ ] **1.1c** Helper puro `mapExcelRowToProduct` + tests
  - Archivos nuevos:
    `apps/web/src/app/api/admin/products/_lib/parseExcelRow.ts`,
    `apps/web/src/app/api/admin/products/_lib/parseExcelRow.test.ts`.
  - Acceptance: pure function con `confidence`, `slug`, `price default`,
    `productType`. Tests cubren los 3 valores conocidos de `Certeza` más
    `revision-manual` por defecto y `slugify(name)+'-'+externalId`.
  - Evidencia: `pnpm test` cubre los 11 nuevos casos en
    `parseExcelRow.test.ts`.

- [ ] **1.2** Crear el content-type `Subcategory` (schema + controllers + routes + services)
  - Archivos: `apps/cms/src/api/subcategory/{content-types,controllers,routes,services}/...`
  - Acceptance: `pnpm --filter cms build` exit 0; el tipo aparece en
    `getStrapiContentTypes()`.
  - Evidencia: `find apps/cms/src/api/subcategory -name "*.ts" -o -name "*.json"`
    lista los 4 archivos esperados.
  - **Estado:** diferido a un slice posterior. Decisión del orquestador
    para mantener S1 dentro del budget y porque la columna `subcategory`
    del Excel funciona como string simple hasta que se cree la entidad.

- [ ] **1.3** Agregar helpers de import en `strapi-admin.ts`
  - Archivo: `apps/web/src/lib/admin/strapi-admin.ts`
  - Acceptance: exportar `importCatalogBatch(rows)`, `resolveOrCreateCategory(name)`,
    `resolveOrCreateSubcategory(name, categoryDocumentId)`,
    `findProductByExternalId(externalId)`,
    `createProduct(row)`, `updateProduct(documentId, row)`,
    `confidenceFromCerteza(value)`, `slugifyForCatalog(name, externalId)`.
  - Evidencia: `grep -n "^export " strapi-admin.ts` lista los 8 nuevos helpers.
  - **Estado:** La mitad del comportamiento (`confidenceFromCerteza`,
    `slugifyForCatalog`) ya vive como helper puro en
    `parseExcelRow.ts` (1.1c). El resto (auto-creación de categorías /
    subcategorías, upsert por `externalId`, `importCatalogBatch`) se
    difiere a S2 junto con la ruta `POST /api/admin/products/import`.

- [ ] **1.4** Tipos TS para los nuevos atributos en `apps/web`
  - Archivo: `apps/web/src/lib/types/product.ts` (nuevo, si no existe)
  - Acceptance: tipos `Product`, `ImportRow`, `ImportResult`,
    `ImportResponse` exportados.
  - Evidencia: `grep -n "^export " types/product.ts` lista los tipos.
  - **Estado:** Los 10 campos nuevos se añadieron directamente al
    `Product` existente en `apps/web/src/lib/strapi.ts`. `ImportRow`,
    `ImportResult` y `ImportResponse` se difieren a S2 cuando aterrice
    el endpoint.

---

## Slice S2 — Endpoint batch + tests (~280 Δ)

- [ ] **2.1** Crear `POST /api/admin/products/import` con validación zod
  - Archivo: `apps/web/src/app/api/admin/products/import/route.ts`
  - Acceptance: `export const dynamic = 'force-dynamic'`,
    `export const runtime = 'nodejs'`; valida con zod que
    `rows.length ≤ 200`; 401 sin sesión; 403 con rol `client`.
  - Evidencia: `grep -n "force-dynamic\|nodejs\|max(200)" route.ts`
    retorna ≥ 1 cada uno.

- [ ] **2.2** Implementar el loop de import (cache categories/subcategories, upsert por externalId)
  - Archivo: `apps/web/src/app/api/admin/products/import/route.ts`
  - Acceptance: procesa cada fila con `try/catch`; cache en memoria para
    categorías/subcategorías; upsert por `externalId`.
  - Evidencia: `grep -n "try {\|findProductByExternalId\|resolveOrCreateCategory" route.ts` retorna ≥ 1 cada uno.

- [ ] **2.3** Implementar el reporte por fila (`results[]` + `summary`)
  - Archivo: `apps/web/src/app/api/admin/products/import/route.ts`
  - Acceptance: cada fila devuelve `{ externalId, status, documentId?, error?, warnings? }`;
    el `summary` cuenta `created/updated/failed/warnings`.
  - Evidencia: `grep -n "summary\|results" route.ts` retorna ≥ 3.

- [ ] **2.4** Tests del endpoint (vitest + Strapi mock)
  - Archivo: `apps/web/src/app/api/admin/products/import/route.test.ts` (nuevo)
  - Acceptance: tests para: 401 sin sesión, 413 sobre 200 filas,
    200 con lote válido, idempotencia en doble import, fila fallida no
    aborta lote.
  - Evidencia: `pnpm --filter web vitest run route.test.ts` exit 0.

- [ ] **2.5** Documentar el contrato del endpoint en JSDoc
  - Archivo: `apps/web/src/app/api/admin/products/import/route.ts`
  - Acceptance: bloque JSDoc al inicio con request/response/errors.
  - Evidencia: `grep -n "@example\|@returns\|@throws" route.ts` retorna ≥ 1.

---

## Slice S3 — Página admin + parser + UI (~470 Δ)

- [x] **3.1** Parser SheetJS en módulo puro
  - Archivo: `apps/web/src/app/admin/(authenticated)/productos/importar/excel.ts` (nuevo)
  - Acceptance: `parseExcelToRows(arrayBuffer): { rows: ImportRow[], errors: string[] }`;
    valida `expectedColumns`; rechaza archivos > 5 MB; rechaza sin filas.
  - Evidencia: `grep -n "parseExcelToRows\|expectedColumns" excel.ts` retorna ≥ 1.

- [x] **3.2** Página `/admin/productos/importar` (server component)
  - Archivo: `apps/web/src/app/admin/(authenticated)/productos/importar/page.tsx` (nuevo)
  - Acceptance: server component que verifica sesión, verifica rol
    `owner`, renderiza `<ImportForm>` o el mensaje de no-permisos.
  - Evidencia: `grep -n "owner\|ImportForm" page.tsx` retorna ≥ 1.

- [x] **3.3** `ImportForm.tsx` con los 4 pasos (selección → previsualización → progreso → resumen)
  - Archivo: `apps/web/src/app/admin/(authenticated)/productos/importar/ImportForm.tsx` (nuevo)
  - Acceptance: `<input type="file">` con accept `.xlsx,.xls,.csv`;
    muestra primeras 10 filas en preview; barra de progreso por chunks
    de 20; resumen con `creados/actualizados/fallos/advertencias`.
  - Evidencia: `grep -n "AbortController\|progress\|results" ImportForm.tsx` retorna ≥ 1 cada uno.

- [ ] **3.4** Cancelación mid-import con `AbortController`
  - Archivo: `apps/web/src/app/admin/(authenticated)/productos/importar/ImportForm.tsx`
  - Acceptance: `useEffect` cleanup aborta el `fetch` en curso; un
    warning de cancelación visible si aplica.
  - Evidencia: `grep -n "AbortController\|signal" ImportForm.tsx` retorna ≥ 1.

- [x] **3.5** Link "Importar" en el sidebar del admin
  - Archivo: `apps/web/src/app/admin/(authenticated)/layout.tsx`
  - Acceptance: nuevo item `Importar catálogo` debajo de `Productos` en
    el sidebar y en los stacked-tabs mobile.
  - Evidencia: `grep -n "Importar\|importar" layout.tsx` retorna ≥ 1.

- [x] **3.6** Dependencia `xlsx` (SheetJS)
  - Archivo: `apps/web/package.json`
  - Acceptance: `"xlsx": "^0.18.5"` (o versión compatible con CE) en
    `dependencies`; `pnpm install` exit 0.
  - Evidencia: `grep -n '"xlsx"' apps/web/package.json` retorna 1.

- [ ] **3.7** Verificación manual con `catalogo_productos_202.xlsx`
  - Operación: cargar el Excel real desde `/admin/productos/importar`,
    confirmar import, validar que `summary.created = 160`, `failed = 0`.
  - Acceptance: archivo real produce 160 productos en Strapi.
  - Evidencia: log del navegador + check `GET /api/products?filters[externalId][$startsWith]=CAT-2025&pagination[pageSize]=200`.

---

## Slice S4 (opcional) — Superficie de nuevos campos en admin (~80 Δ)

> Diferible. El import funciona end-to-end sin esto. Sólo agrega
> visibilidad de los nuevos campos en la UI existente.

- [ ] **4.1** Mostrar `externalId` y `confidence` en `ProductForm.tsx`
  - Archivo: `apps/web/src/app/admin/(authenticated)/productos/ProductForm.tsx`
  - Acceptance: dos campos read-only al final del formulario que
    muestran los valores de Strapi cuando el producto ya los tiene.
  - Evidencia: `grep -n "externalId\|confidence" ProductForm.tsx` retorna ≥ 1.

- [ ] **4.2** Mostrar `externalId` en `ProductList.tsx`
  - Archivo: `apps/web/src/app/admin/(authenticated)/ProductList.tsx`
  - Acceptance: nueva columna `ID externo` con el valor en monoespaciado.
  - Evidencia: `grep -n "externalId\|external" ProductList.tsx` retorna ≥ 1.

---

## Mapeo Spec ↔ Tarea

| Requisito del Spec | Tareas |
| --- | --- |
| `product-schema::Atributos de catalogación en Product` | 1.1, 1.4 |
| `product-schema::Content-type Subcategory` | 1.2 |
| `product-schema::confidence acepta revisión manual` | 1.3 |
| `product-schema::externalId es la clave de idempotencia` | 1.1, 2.2 |
| `product-schema::price default 0 cuando viene vacío` | 2.2, 3.1 |
| `product-schema::slug derivado del nombre + externalId` | 1.3, 2.2 |
| `bulk-import-endpoint::Lote por HTTP` | 2.1, 2.5 |
| `bulk-import-endpoint::Tope de lote` | 2.1 |
| `bulk-import-endpoint::Auto-creación de categorías y subcategorías` | 2.2 |
| `bulk-import-endpoint::Deduplicación por externalId` | 2.2 |
| `bulk-import-endpoint::Reporte por fila` | 2.3 |
| `bulk-import-endpoint::Garantía de idempotencia` | 2.2, 2.4 |
| `bulk-import-endpoint::Aislamiento de fallos` | 2.2, 2.4 |
| `bulk-import-endpoint::Mapeo de confianza` | 1.3 |
| `bulk-import-endpoint::Productos nuevos entran en draft` | 2.2 |
| `admin-import-page::Parseo en navegador` | 3.1, 3.6 |
| `admin-import-page::Validación de columnas esperadas` | 3.1 |
| `admin-import-page::Previsualización antes de confirmar` | 3.3 |
| `admin-import-page::Confirmación explícita` | 3.3 |
| `admin-import-page::Progreso visible` | 3.3 |
| `admin-import-page::Resumen final` | 3.3 |
| `admin-import-page::Acceso restringido al admin` | 3.2 |
| `admin-import-page::Acceso solo para rol owner` | 3.2 |
| `admin-import-page::Cancelación mid-import` | 3.4 |

---

## Plan de Rollback por Slice

- **S1**: revertir el `schema.json` de `Product`, borrar
  `apps/cms/src/api/subcategory/`. Los nuevos campos quedan en
  `null` (no se borran filas). Helpers en `strapi-admin.ts` se
  deshacen con `git revert`.
- **S2**: borrar `route.ts` y `route.test.ts`. Ningún endpoint
  admin queda colgado.
- **S3**: borrar la página y el parser. Quitar la dep `xlsx` del
  `package.json` (`pnpm remove xlsx`). El sidebar vuelve a no
  tener el link "Importar".
- **S4**: revertir los dos archivos. Los productos siguen
  importados con los campos correctos en la DB; sólo la UI no los
  muestra todavía.

---

## Próxima Fase

`sdd-apply` para ejecutar S1 → S2 → S3 secuencialmente (o
siguiendo la cadena que elija el usuario al ver el forecast de
951 Δ que excede el budget de 400 líneas). S4 puede diferirse a un
cambio posterior sin bloquear la entrega principal.

---

## Slice S2b — Import traceability (ImportBatch + importSource) (~150 Δ)

> **Estado: en implementación — apply-phase, 2026-07-28.** El orquestador
> aprobó la cadena `Plan Consolidado A+B+E` (≤600 Δ) que combina schema (A)
> + helpers (B) + endpoint traceability (E). Estrictamente aditivo: ningún
> campo existente se renombra ni se elimina. Admin-only (no se registra en
> `SCOPED_TYPES`).

### Entregables

- [ ] **E.1** Strapi: nuevo content-type `ImportBatch`
  - `apps/cms/src/api/import-batch/{content-types,controllers,routes,services}/...` (new)
  - Acceptance: `pnpm --filter cms build` exit 0.

- [ ] **E.2** Strapi: extender `Product` con `importSource` + `importBatch`
  - `apps/cms/src/api/product/content-types/product/schema.json` (modified)
  - Acceptance: 10 atributos de S1 intactos; +2 atributos nuevos.

- [ ] **E.3** Web: tipos públicos `Product` + `ImportBatch` + `AdminProduct`
  - `apps/web/src/lib/strapi.ts` (modified): nuevos tipos + `normalizeProduct`
  - `apps/web/src/lib/admin/strapi-admin.ts` (modified): `AdminProduct`
  - Acceptance: `pnpm --filter web typecheck` exit 0.

- [ ] **E.4** Web: helpers `createImportBatch` + `recordBatchCounters`
  - `apps/web/src/lib/admin/strapi-admin.ts` (modified): expuesto vía `createImportScope`.
  - Acceptance: `pnpm --filter web typecheck` exit 0.

- [ ] **E.5** Web: endpoint `POST /api/admin/products/import` con traceability
  - `apps/web/src/app/api/admin/products/import/route.ts` (modified)
  - Acceptance: 1 POST `/api/import-batches` antes del loop + 1 PUT al
    final con counters; cada POST/PUT `/api/products` lleva
    `importSource: 'imported'` + `importBatch.connect: [docId]`.

- [ ] **E.6** Web: tests del endpoint (5 nuevos casos)
  - `apps/web/src/app/api/admin/products/import/route.test.ts` (modified)
  - Acceptance: 10 tests existentes siguen pasando + 5 nuevos pasan.

### Constraints

- Estrictamente aditivo: nada se elimina ni se renombra.
- Target ≤600 Δ total del slice.
- `parseExcelRow.ts` y `parseExcelRow.test.ts` quedan intactos.