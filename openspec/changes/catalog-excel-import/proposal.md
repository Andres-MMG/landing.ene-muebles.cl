# Propuesta: catalog-excel-import

## Intención

Migrar el catálogo 2025 de Ene Muebles (`catalogo_productos_202.xlsx`,
160 productos, 13 columnas) a Strapi con un solo click desde
`/admin/productos/importar`, **sin tipear fila por fila**. La operación
debe ser **idempotente** (reimportar actualiza, no duplica) y debe
auto-crear categorías y subcategorías que falten. Resultado esperado:
absorber el Excel 2025 y futuros anuales en menos de un minuto, con un
resumen claro de creados / actualizados / fallos / advertencias.

## Alcance

### Dentro del Alcance

- Atributos nuevos en `Product`: `externalId` (uid único), `productType`,
  `subcategory` (relación), `usageEnvironment`, `observableColor`,
  `observableMaterial`, `catalogPage`, `confidence` (enum), `source`,
  `observation`.
- Nuevo content-type `Subcategory` (relación muchos-a-uno desde `Product`).
- `POST /api/admin/products/import` (lote, máx 200, JWT admin,
  idempotente por `externalId`).
- Auto-creación de categorías y subcategorías faltantes; las existentes
  se reusan por `slug`.
- Página `/admin/productos/importar` con parseo en navegador (SheetJS
  `xlsx`), mapeo de columnas, validación fila por fila, progreso y
  resumen.
- `slug` derivado como `slugify(name) + '-' + externalId`. `price`
  vacío → `0` con `warning` en el resumen.

### Fuera del Alcance

- Importar imágenes (no se scrapea el PDF; las fotos se suben después).
- Sincronización bidireccional Excel ↔ Strapi.
- Editor visual del mapeo de columnas (mapeo fijo en código).
- Versionado del catálogo (cada import sobreescribe).
- Cambios al sitio público (`apps/web/src/app/(marketing)/*`).

## Capacidades (contrato para `sdd-spec`)

### Nuevas Capacidades

- `product-schema`: extiende `Product` + crea `Subcategory`.
- `bulk-import-endpoint`: define `POST /api/admin/products/import`.
- `admin-import-page`: define `/admin/productos/importar`.

### Capacidades Modificadas

- `strapi-content-model`: `Product` suma campos; compatibilidad hacia atrás.

## Approach

| Fase | Entregable | Archivos clave |
| --- | --- | --- |
| F1 | Schema + `Subcategory` | `apps/cms/src/api/product/content-types/product/schema.json`, `apps/cms/src/api/subcategory/**` |
| F2 | Helpers de import | `apps/web/src/lib/admin/strapi-admin.ts` |
| F3 | Endpoint batch | `apps/web/src/app/api/admin/products/import/route.ts` |
| F4 | Página admin + parser | `apps/web/src/app/admin/(authenticated)/productos/importar/{page,ImportForm,excel}.tsx` |
| F5 (opcional) | Superficie en lista/form | `ProductForm.tsx`, `ProductList.tsx` |

## Áreas Afectadas

| Área | Impacto | Descripción |
| --- | --- | --- |
| `apps/cms/src/api/product/content-types/product/schema.json` | Modified | +10 atributos |
| `apps/cms/src/api/subcategory/**` | New | Content-type nuevo |
| `apps/web/src/lib/admin/strapi-admin.ts` | Modified | +helpers de import |
| `apps/web/src/app/api/admin/products/import/route.ts` | New | Endpoint batch |
| `apps/web/src/app/admin/(authenticated)/productos/importar/**` | New | Página + parser + UI |
| `apps/web/package.json` | Modified | +dep `xlsx` |

## Riesgos

| Riesgo | Prob. | Mitigación |
| --- | --- | --- |
| Columnas del Excel cambian de orden o nombre | Alta | Validación contra `expectedColumns`; aborta con mensaje claro antes de tocar Strapi |
| Colisiones de `slug` (mayúsculas / tildes) | Media | `slugify` quita acentos; colisiones → sufijo `-2`, `-3` |
| Import parcial: Strapi cae en la fila 80 | Media | Loop con `try/catch` por fila; el lote sigue; reporte lista cada fila |
| `price` vacío contamina catálogo público | Media | Productos entran en `draft`; el dueño decide cuándo publicar |
| Schema migration falla en prod | Baja | Se valida en `develop` con `pnpm --filter cms build` antes de mergear |

## Plan de Rollback

- **F1**: revertir `schema.json`, borrar `apps/cms/src/api/subcategory/`. Campos vuelven a `null`, no se borran filas.
- **F2-F4**: revertir los archivos. El admin vuelve a no tener "Importar".
- **F5**: revertir los dos archivos modificados.
- Las dos superficies (Next.js + Strapi) revierten de forma independiente
  según `openspec/config.yaml` `rules.proposal`.

## Dependencias

- `xlsx` (SheetJS Community Edition) ≈ 400 KB, soporta `.xlsx/.xls/.csv`
  sin config.
- `Product` y `Category` schemas ya existentes.
- Token admin ya centralizado en `getStrapiAdminToken()`.
- Stack Docker local (`web` + `cms` + `db`).

## Criterios de Éxito

- [ ] Una import de `catalogo_productos_202.xlsx` produce 160 productos
      en Strapi en < 30 s.
- [ ] Reimportar el mismo archivo devuelve `created: 0, updated: 160, failed: 0`.
- [ ] Categorías `Escolar` y `Oficina` y las 8 subcategorías se crean
      si no existen.
- [ ] Filas con `Certeza` desconocida → `confidence = "revision-manual"`
      + warning.
- [ ] Filas sin `price` → `price = 0` + warning.
- [ ] Página inaccesible sin sesión admin.
- [ ] `pnpm --filter web typecheck` y `pnpm --filter cms build` exit 0.

## Out-of-Scope / Non-Goals

- Importar imágenes (PDF no se scrapea; fotos se suben después).
- Edición visual del mapeo de columnas.
- Sincronización inversa Strapi → Excel.
- Versionado de catálogo.

## Preguntas Abiertas

1. ¿Productos nuevos en `published` o `draft`? **Rec: `draft`** — el dueño revisa y publica manualmente.
2. ¿Página accesible para rol `client`? **Rec: solo `owner`** — la import es destructiva.
3. ¿Fila sin `ID` externo? **Rec: rechazar** con mensaje claro — bloquear es mejor que inventar IDs.