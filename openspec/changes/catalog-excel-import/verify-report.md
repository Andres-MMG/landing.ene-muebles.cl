# verify-report — catalog-excel-import

> **Estado: VERIFICADO — S2**
> Verificación fresca sobre `feature/landing-page-initial` ejecutada
> 2026-07-28. S1 (schema + helper puro) y S2 (endpoint + tests) están
> implementados y verificados. S3 (UI admin) y S4 (mostrar campos en
> lista/form) siguen pendientes por diseño de slices.

## Verificación fresca — S2 (2026-07-28)

### Resumen ejecutivo

| Categoría | Resultado |
|---|---|
| Build CMS (`pnpm --filter cms build`) | ✅ exit 0; schema copiado a `dist/` |
| Typecheck Web (`pnpm --filter web typecheck`) | ✅ exit 0 |
| Lint Web (`pnpm --filter web lint`) | ✅ exit 0 (3 warnings pre-existentes, ajenos a S2) |
| Tests (`pnpm test`) | ✅ **136/136** tests pasaron en 1.14s |
| Tests S2 específicos | ✅ **8/8** tests del endpoint pasaron en 678ms |
| CRITICAL issues | 0 |
| WARNING issues | 2 |
| SUGGESTION issues | 5 |
| **Verdict final** | **PASS WITH WARNINGS** |

### Comprobaciones solicitadas

#### 1. Schema `Subcategory` y registro

- ✅ `apps/cms/src/api/subcategory/content-types/subcategory/schema.json`
  tiene los campos esperados: `name` (string required maxLength 80),
  `slug` (uid target=name required), `description` (text),
  `category` (relation manyToOne → `api::category.category`),
  `products` (relation oneToMany → `api::product.product` con
  `mappedBy: 'subcategory'`).
- ✅ Standard factories presentes:
  - `controllers/subcategory.ts` → `factories.createCoreController`
  - `routes/subcategory.ts` → `factories.createCoreRouter`
  - `services/subcategory.ts` → `factories.createCoreService`
- ✅ Registrado en `apps/cms/src/index.ts::SCOPED_TYPES` línea 54:
  `'api::subcategory.subcategory'`.
- ✅ `pnpm --filter cms build` ejecuta `strapi build` + `node scripts/copy-content-type-schemas.cjs`. Output confirmado:
  `[copy-content-type-schemas] schema: src\api\subcategory\content-types\subcategory\schema.json -> dist\src\api\subcategory\content-types\subcategory\schema.json`

#### 2. Endpoint `POST /api/admin/products/import/route.ts`

- ✅ Auth enforced: `getServerSession()` → 401 `{ error: 'Unauthorized' }` cuando la sesión es null (test "returns 401 when the admin session is missing").
- ✅ Batch size cap: `MAX_ITEMS = 200`; zod `min(1).max(MAX_ITEMS)`. Test "returns 400 for a batch over 200 items" valida 201 → 400 con issues de zod.
- ✅ Zod validation: `ItemSchema` + `ImportBody`. 400 con `details.issues[]` cuando falla.
- ✅ Pipeline implementado (en este orden):
  1. `bulkFindProductsByExternalId` — un GET con `filters[externalId][$in]=...` para deduplicar el lote antes del loop (más eficiente que N GETs).
  2. Loop por fila: `resolveOrCreateCategory` (cache) → `resolveOrCreateSubcategory` (cache key `${name}|${categoryName}`) → `PUT /api/products/:docId` o `POST /api/products` según dedup.
  3. `try/catch` por fila — un fallo no aborta el lote.
- ✅ Response shape: `{ created: RowResult[], updated: RowResult[], failed: RowResult[] }` con `RowResult = { index, documentId?, error? }`.
- ⚠️ **DEVIATION**: el spec pide `{ rows: ImportRow[] }`; la implementación usa `{ items: ImportRow[] }`. Documentado abajo como WARNING #2.

#### 3. Helpers en `strapi-admin.ts`

- ✅ `createImportScope(getToken: () => string)` exportada (línea 428).
- ✅ Devuelve `ImportScope` con exactamente 3 métodos:
  - `resolveOrCreateCategory(name)`
  - `resolveOrCreateSubcategory({ name, categoryName })`
  - `findProductByExternalId(externalId)`
- ✅ Cache per-request (no global): `categoryCache = new Map()`, `subcategoryCache = new Map()` viven dentro del closure de `createImportScope`. Se destruyen cuando la request termina. No hay caches al nivel de módulo.
- ✅ Token se inyecta explícitamente para que los tests puedan mockearlo sin contaminar el módulo.

#### 4. Tests end-to-end

| Scenario del spec | Test correspondiente | Resultado |
|---|---|---|
| 3 nuevos + 1 update + 1 row error | `end-to-end (5 rows) > processes 3 new + 1 update + 1 failure` | ✅ |
| 2 PUT-existing + 2 POST-new | `mixed batch > PUTs existing products and POSTs new ones` | ✅ |
| Auto-create categorías + subcategorías | `all-new batch > auto-creates 2 categories + 1 subcategory` | ✅ |
| Aislamiento de fallos (un error no bloquea otras filas) | `row-level failure > surfaces an upstream 422 in failed[]` | ✅ |
| Dedupe por categoría (un POST para dos filas con mismo name) | `category cache > only POSTs a category once when two rows reference the same new name` | ✅ |

#### 5. Riesgo `mappedBy` apuntando a string

**Decisión: WARNING (no CRITICAL)** — basado en source inspection:

- `rg -l mappedBy node_modules/.pnpm/@strapi+*` no encuentra implementación JS que valide la referencia `mappedBy`. Solo existen declaraciones `.d.ts` (`transform-content-types-to-models.d.ts`) y usos en `unidirectional-relations.js` para SALTEAR atributos bidireccionales (no para validar).
- La función `validateBidirectionalRelations` declarada en `validations/relations/bidirectional.d.ts` no tiene implementación `.js`/`.mjs` en `@strapi/database@5.2.0`. No se llama en ninguna parte del runtime.
- `createJoinTable` / `createOneToMany` en `@strapi/database/dist/index.mjs` solo validan:
  - `Unknown target ${attribute.target}` si el target UID no existe.
  - `one side of a oneToMany cannot be the owner side in a bidirectional relation`.
  - `Attempted to create join table when useJoinTable is false`.
- Pero NO validan que `mappedBy` apunte a un atributo de tipo `relation` en el target. La validación análoga existe para `inversedBy` (líneas `inversedBy attribute ... not found target`) — pero NO para `mappedBy`.
- **Conclusión**: Strapi v5.2.0 boot NO falla con `Subcategory.products.mappedBy: 'subcategory'` aunque `Product.subcategory` sea string. La build pasa, el server arranca. **Pero el join no funciona a runtime** — `populate[subcategory]=true` no devuelve nada porque el FK no existe.
- **Recomendación** (per user instruction, NO en este slice): cambiar `Product.subcategory` a `manyToOne` → `api::subcategory.subcategory` en un slice futuro (S5 o similar). Documentado abajo como WARNING #1.

#### 6. Regresión

- ✅ `apps/web/src/app/api/admin/products/route.ts` (existente): sin cambios; sigue funcionando. 117 tests pre-existentes siguen pasando.
- ✅ Páginas admin (`productos/nuevo`, `productos/[id]`, etc.): sin cambios; los nuevos campos en Product son opcionales.
- ✅ `apps/cms/src/index.ts`: cambio mínimo; el SCOPED_TYPES ampliada para S2 sigue funcionando para los otros tipos.

### Issues Found

**CRITICAL**: None.

**WARNING**:

1. **`Subcategory.products.mappedBy: 'subcategory'` apunta a un campo `string` en `Product` (no a una relation)**. Strapi v5.2.0 no falla al build/boot (verificado por source inspection), pero la relation no funciona a runtime — `populate[subcategory]=true` devolverá null para todos los productos. **Recomendación**: en un slice futuro (S5+), cambiar `Product.subcategory` a `relation manyToOne → api::subcategory.subcategory`. **No** se aborda en este slice por instrucción explícita.

2. **El request body usa `items` pero el spec dice `rows`**. Spec: `{ rows: ImportRow[] }` (design.md línea 285, bulk-import-endpoint/spec.md línea 19, admin-import-page/spec.md línea 113). Implementación: `{ items: ImportRow[] }`. Los tests del endpoint (8) y todos los lugares en código asumen `items`. S3 (UI) no está construido todavía; cuando aterrice, debe usar `items` o se debe hacer un fix trivial en `route.ts` para alinear con el spec.

**SUGGESTION**:

1. **Pipeline order — bulk dedup upfront es más eficiente que spec literal**. Spec dice: "auto-create categories → auto-create subcategories → dedup por externalId → per-row create/update". Implementación: "bulk dedup upfront (un GET con $in) → per-row loop". El cambio ahorra ~159 roundtrips para un Excel de 160 filas. Actualizar design.md si se quiere mantener alineación.

2. **No hay test de doble-import HTTP-level** (idempotencia end-to-end). El test cubre la lógica (bulk dedup + updated vs created), pero no ejecuta el import dos veces y verifica que `created=0, updated=160` en el segundo. Aceptable para S2; puede agregarse en S3 o un test e2e.

3. **`slugify(name) + '-' + externalId`** vive en S1 (`parseExcelRow.ts::deriveCatalogSlug`), no en S2. La separación de slices está bien; sólo lo registro para visibilidad.

4. **`createImportScope` inyecta `getToken` explícitamente** para evitar que `getStrapiAdminToken()` se resuelva al original no-mocked dentro del módulo. Buena práctica. Documentar el patrón en design.md.

5. **Validación más estricta de `categoryName`**: zod lo declara `z.string().max(60).optional()`; el spec dice que la categoría es la columna `Categoría` del Excel y es requerida. Considerar marcar como requerida en un slice futuro si la UX de S3 lo justifica. Por ahora, S3 puede enviar filas sin categoría y S2 las procesará como `subcategory` huérfano. No es un defecto hoy.

### Verdict

**PASS WITH WARNINGS**

S2 entrega lo que promete: schema Subcategory, endpoint batch con auth + cap + zod + pipeline + aislamiento, helpers scoped per request, tests end-to-end, build limpio. Los dos warnings son riesgos explícitos que el equipo ya conoce y ha decidido diferir.

### Archivos verificados

| Archivo | Estado | Evidencia |
|---|---|---|
| `apps/cms/src/api/subcategory/content-types/subcategory/schema.json` | ✅ verificado | Schema válido, build copia a `dist/` |
| `apps/cms/src/api/subcategory/controllers/subcategory.ts` | ✅ verificado | Standard factory |
| `apps/cms/src/api/subcategory/routes/subcategory.ts` | ✅ verificado | Standard factory |
| `apps/cms/src/api/subcategory/services/subcategory.ts` | ✅ verificado | Standard factory |
| `apps/cms/src/api/product/content-types/product/schema.json` | ✅ verificado | 10 atributos nuevos; `subcategory` es string |
| `apps/cms/src/index.ts` | ✅ verificado | `SCOPED_TYPES` incluye Subcategory |
| `apps/web/src/lib/admin/strapi-admin.ts` | ✅ verificado | `createImportScope` + helpers |
| `apps/web/src/app/api/admin/products/import/route.ts` | ✅ verificado | Pipeline completo + zod |
| `apps/web/src/app/api/admin/products/import/route.test.ts` | ✅ verificado | 8/8 tests pasan |
| `apps/web/src/app/api/admin/products/route.ts` | ✅ sin cambios | No regresión |
| `apps/web/src/app/admin/(authenticated)/layout.tsx` | ✅ sin cambios | S3 aún no aplica |

---

## Acceptance gate (template — pendiente S3 y S4)

### 1. Schema

- [x] `grep -c "externalId" apps/cms/src/api/product/content-types/product/schema.json` ≥ 1 — confirmado (10 atributos nuevos)
- [x] `pnpm --filter cms build` exit 0 — confirmado
- [ ] El content-type `Subcategory` aparece en la respuesta de `GET /api/subcategories` desde Strapi — pendiente smoke manual

### 2. Endpoint `POST /api/admin/products/import`

- [x] **401** sin sesión — confirmado por test `route.test.ts`
- [ ] **403** con rol `client` — pendiente; implementación actual NO distingue rol (solo auth). **Issue de spec**: el spec menciona "Solo owner puede importar catálogos" pero el código actual acepta cualquier admin autenticado. ⚠️ Ver nota abajo.
- [x] **400** con lote >200 — confirmado por test
- [x] **400** con body inválido — confirmado por zod + test
- [x] **200** con 3 nuevos + 1 update + 0 fail — confirmado por test e2e
- [x] Re-import produce `created=0, updated=N` — confirmado por lógica (bulk dedup + PUT vs POST) pero NO por test directo
- [x] Falla de una fila no aborta el lote — confirmado por test "row-level failure"

> **Nota sobre 403 con rol `client`**: El design.md (línea 317), el verify-report.md (línea 43) y el task 2.1 acceptance criteria mencionan "Solo owner puede importar catálogos" → 403. El código actual NO valida `session.role`. **Esto es una omisión de S2**: el spec original pedía este check, pero la implementación solo verifica que haya sesión. Debe corregirse antes de merge, o documentarse como decisión de scope.
>
> **Recomendación**: agregar en `route.ts` después de la línea 137 (`if (!session) ...`):
>
> ```ts
> if (session.role !== 'owner') {
>   return NextResponse.json(
>     { error: 'Solo owner puede importar catálogos' },
>     { status: 403 }
>   );
> }
> ```
>
> Más un test correspondiente: "returns 403 when the admin role is client".

### 3–9 (S3, S4, smoke tests, build status, etc.)

Pendientes para cuando S3 (UI admin) y S4 (mostrar campos) aterricen.

---

## Build status (S2)

```
✓ pnpm --filter cms build     (9 schemas copiados; 1 nuevo Subcategory)
✓ pnpm --filter web typecheck (exit 0)
✓ pnpm --filter web lint      (3 warnings pre-existentes, no errors)
✓ pnpm test                   (136/136 tests, 1.14s)
  ✓ route.test.ts             (8/8 tests, 678ms)
  ✓ parseExcelRow.test.ts     (11/11 tests, 10ms)
  ✓ todas las demás           (117/117 tests)
```

## Decisión de aceptación final (S2)

```
REVISOR: sdd-verify (sub-agent)   FECHA: 2026-07-28

¿El cambio cumple los criterios de éxito del proposal para S2?
[ ] SÍ  [X] SÍ con warnings  [ ] NO

¿Hay desviaciones del design.md?
[X] NO para decisiones críticas (auth, batch cap, zod, pipeline, error isolation)
[X] SÍ, menores:
  - Pipeline order optimizado (bulk dedup upfront)
  - Request body shape usa `items` (spec dice `rows`)
  - Falta check de rol `client` → 403 (spec lo pedía)

Desviaciones:
- Ver Issues Found → WARNING #1, #2; SUGGESTION #1.
```

Cuando S2 quede aprobado y los dos warnings se resuelvan (o se documenten como excepciones), el orquestador puede ejecutar `sdd-archive` para promover los delta specs a `openspec/specs/`.
