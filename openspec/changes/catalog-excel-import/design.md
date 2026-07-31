# Diseño: catalog-excel-import

## 1. Vista general de arquitectura

```
        Admin browser                                          Servidor Next.js
        ─────────────                                          ────────────────
        /admin/productos/importar
            │
            ├── [1] Lee archivo .xlsx con SheetJS (xlsx)  ─────► (nada, todo en cliente)
            │
            ├── [2] Valida columnas esperadas
            │
            ├── [3] Previsualiza 10 filas
            │
            └── [4] Click "Confirmar import" ──── POST /api/admin/products/import ──►
                                                              │ (chunk de 200 máx)
                                                              │ 1. Auto-crea Category si falta
                                                              │ 2. Auto-crea Subcategory si falta
                                                              │ 3. Upsert Product por externalId
                                                              │
                                                              ▼
                                                  Strapi v5 (cms:1337)
                                                  POST /api/categories
                                                  POST /api/subcategories
                                                  POST /api/products
                                                  PUT  /api/products/:documentId
                                                  GET  /api/products?filters[externalId][$eq]
```

**Separación de superficies** — El parseo del Excel ocurre enteramente en
el navegador del admin. El servidor sólo recibe JSON estructurado (no
multipart, no `xlsx` binario). Esto evita:

- Subir el archivo dos veces (cliente → Next → Strapi).
- Una nueva ruta `POST /api/admin/upload-import` que sólo sirve a esta
  página.
- Acoplar el import al ciclo de vida del upload provider de Strapi
  (que en este proyecto no se usa para archivos Excel).

---

## 2. Decisiones de arquitectura

### Decisión: SheetJS (`xlsx`) para parseo en navegador

**Elección**: agregar la dependencia `xlsx` (SheetJS Community Edition) en
`apps/web` y parsear el archivo en el cliente antes de enviar.

**Alternativas evaluadas**:

| Alternativa | Tradeoff | Decisión |
| --- | --- | --- |
| **`xlsx` (SheetJS) en cliente** | ≈ 400 KB minificado, zero-config, soporta `.xlsx`/`.xls`/`.csv`. No requiere backend. | ✅ elegida |
| Parseo server-side con `xlsx` (mismo paquete) | Suma una ruta nueva y un roundtrip de upload. Server ya tiene `exceljs`/`xlsx` como dep transitiva de Strapi. | ❌ rechazada (más superficie, misma lib) |
| Parseo server-side con `exceljs` (específico de Node) | Más rico en features pero requiere upload y route handler. | ❌ rechazada (idéntico problema) |
| Conversión manual CSV → tabular | Funciona, pero el catálogo 2025 viene en `.xlsx` con celdas de texto largas. | ❌ no aplica |

**Rationale**: 400 KB es aceptable para una página admin que sólo carga
cuando el owner entra a importar (no impacta el bundle del sitio público).
Soporte multi-formato (`.xlsx`/`.xls`/`.csv`) viene gratis; en el
futuro el proveedor podría entregar cualquiera de los tres.

### Decisión: Parseo en navegador, no server-side

**Elección**: el archivo nunca se sube al servidor Next.js. El cliente lo
lee con `FileReader`/`arrayBuffer`, lo pasa por SheetJS, y manda JSON
por `fetch`.

**Alternativas evaluadas**:

| Alternativa | Tradeoff | Decisión |
| --- | --- | --- |
| Cliente → Next → Strapi (upload doble) | Acopla import con upload provider; requiere que Strapi acepte `.xlsx` como media; archivo binario inútil después de parsear. | ❌ rechazada |
| Cliente → Next sólo (este diseño) | Next sólo recibe JSON estructurado; el archivo muere en la memoria del navegador. | ✅ elegida |
| Cliente → Strapi directo (saltar Next) | Rompe la autenticación centralizada; pierde el guard de rol. | ❌ rechazada |

**Rationale**: el servidor no necesita el archivo binario porque no
guarda el Excel, sólo lo procesa. Mover el procesamiento al cliente
reduce latencia, reduce superficie de ataque, y elimina una ruta HTTP
completa.

### Decisión: Mapeo de confianza (Certeza → enum)

**Elección**: tabla de traducción fija en código:

| Excel (`Certeza`) | Strapi (`confidence`) |
| --- | --- |
| `alta` | `alta` |
| `media - variante visual` | `media-variante-visual` |
| `media - nombre genérico en PDF` | `media-nombre-generico-pdf` |
| (cualquier otro o vacío) | `revision-manual` |

**Rationale**: la columna `Certeza` del Excel trae tres valores
verificados en el archivo actual (`alta`, `media - variante visual`,
`media - nombre genérico en PDF`). El sistema debe absorber valores
nuevos sin romper — la rama por defecto (`revision-manual`) los
captura. Esto convierte un cambio de valores en el Excel en un cambio
de mapping en el código, no en una falla del import.

### Decisión: Relajación de campos requeridos

**Elección**:

- `name` → sigue siendo requerido (es la columna `Producto`).
- `slug` → se deriva como `slugify(name) + '-' + externalId`. No se
  acepta slug en el cuerpo de import.
- `price` → si viene vacío o no parsea a número, se guarda `0` y la
  fila aparece en `Advertencias` del resumen. No se rechaza la fila.

**Rationale**:

- `name` es la única columna verdaderamente obligatoria para que un
  producto tenga sentido en el catálogo público.
- `slug` se deriva para evitar 160 slugs manuales propensos a typos.
  Incluir `externalId` lo hace único por construcción.
- `price` se relaja porque el catálogo 2025 tiene productos sin
  precio publicado (precios "a convenir"); bloquear el import por una
  columna que no se usa en el render público sería peor negocio que
  aceptar `0` y avisarle al owner en el resumen.

---

## 3. Schema layering

El nuevo modelo en Strapi v5 queda así:

```
Product
├── name            (string, required)         ← existente
├── slug            (uid, required)            ← existente
├── description     (text, required)           ← existente
├── shortDescription (text)                     ← existente
├── price           (decimal, required)        ← existente
├── currency        (string, default "CLP")    ← existente
├── dimensions      (json)                      ← existente
├── materials       (json)                      ← existente
├── featured        (boolean)                   ← existente
├── active          (boolean)                   ← existente
├── order           (integer)                   ← existente
├── category        (relation manyToOne → category)   ← existente
├── images          (media multiple)            ← existente
│
├── externalId      (uid, target: externalId)  ← NUEVO (índice único)
├── productType     (string, max 60, enum)     ← NUEVO
├── subcategory     (relation manyToOne → subcategory) ← NUEVO
├── usageEnvironment (string, max 200)         ← NUEVO
├── observableColor (string, max 120)          ← NUEVO
├── observableMaterial (string, max 200)       ← NUEVO
├── catalogPage     (integer, min 1)           ← NUEVO
├── confidence      (enum: alta, media-variante-visual,
│                              media-nombre-generico-pdf,
│                              revision-manual) ← NUEVO
├── source          (string, max 200)          ← NUEVO
└── observation     (text, max 1000)           ← NUEVO

Subcategory (NUEVO content-type)
├── name            (string, required, max 60)
├── slug            (uid, target: name, required)
├── category        (relation manyToOne → category)
├── order           (integer, default 0)
└── active          (boolean, default true)
```

`externalId` se declara como `uid` (target `externalId`) para que Strapi
genere el índice único automáticamente. Esto convierte la consulta
`filters[externalId][$eq]=X` en una búsqueda indexada.

`confidence` se declara como `enumeration` con los cuatro valores; el
cuarto (`revision-manual`) es el "colchón" que absorbe cambios futuros
en el Excel.

---

## 4. Flujo batch (orden de operaciones)

El endpoint `POST /api/admin/products/import` procesa el lote con este
orden, para minimizar roundtrips con Strapi:

```
1. Cache en memoria de categorías y subcategorías existentes
   GET /api/categories?pagination[pageSize]=100
   GET /api/subcategories?pagination[pageSize]=100&populate=category
   (un solo roundtrip cada uno al iniciar el lote)

2. Para cada fila (en orden):
   a. Resolver category:
      - Buscar en cache por name (case/acento-insensitive)
      - Si no existe: POST /api/categories → guardar en cache
   b. Resolver subcategory:
      - Buscar en cache por (category_id, name)
      - Si no existe: POST /api/subcategories → guardar en cache
   c. Resolver product por externalId:
      - GET /api/products?filters[externalId][$eq]=X&publicationState=preview
      - Si existe: PUT /api/products/:documentId con campos editables
      - Si no existe: POST /api/products
   d. Capturar resultado y continuar con la siguiente fila
      (try/catch por fila — un fallo no rompe el lote)

3. Devolver reporte consolidado
```

**Por qué categories/subcategories primero**: el cache en memoria evita
160 requests a Strapi para resolver la misma categoría `Escolar`. Las
160 filas comparten sólo 2 categorías y 8 subcategorías — el cache las
crea una vez y las reutiliza.

**Por qué GET por fila para `Product`**: la búsqueda por `externalId`
es necesaria para el upsert; cachear `Product` por fila sería memory-
expensive (160 productos completos en RAM). El endpoint es rápido en
Strapi v5 con MySQL + índice en `externalId`.

---

## 5. Superficies de error y fallback

| Origen | Detección | UX |
| --- | --- | --- |
| Archivo > 5 MB | Cliente, antes de parsear | Banner rojo: `"El archivo supera el límite de 5 MB."` |
| Columnas críticas faltantes | Cliente, después de parsear | Banner rojo: `"Falta la columna X."` |
| Fila con `name` vacío | Cliente + servidor | La fila se rechaza; el resumen lo lista |
| Fila con `externalId` duplicado dentro del lote | Servidor | Warning en `results[].warnings` |
| Strapi 500 en una fila | Servidor, `try/catch` | `results[].status = "failed"` con mensaje de Strapi |
| Strapi caído (no responde) | Servidor, antes del loop | `503 { "error": "No se pudo contactar Strapi." }` |
| Sin sesión admin | Middleware Next.js | `401` (la página nunca se renderiza) |
| Rol `client` intentando acceder | Cliente (post-session GET) | Página de "no tenés permisos" |

**Fallback semántico** — el sistema NO aborta el lote por una fila
fallida. La cantidad total de filas procesadas se devuelve en
`summary`; las filas fallidas se listan en `results` con su error. El
admin puede corregir las filas en el Excel y reimportar (la
idempotencia garantiza que las filas exitosas no se duplican).

---

## 6. Lista de archivos modificados/creados

| # | Archivo | Acción | Δ líneas |
| --- | --- | --- | --- |
| 1 | `apps/cms/src/api/product/content-types/product/schema.json` | Modified | +60 |
| 2 | `apps/cms/src/api/subcategory/content-types/subcategory/schema.json` | New | +20 |
| 3 | `apps/cms/src/api/subcategory/controllers/subcategory.ts` | New | +5 |
| 4 | `apps/cms/src/api/subcategory/routes/subcategory.ts` | New | +5 |
| 5 | `apps/cms/src/api/subcategory/services/subcategory.ts` | New | +5 |
| 6 | `apps/web/src/lib/admin/strapi-admin.ts` | Modified | +120 |
| 7 | `apps/web/src/app/api/admin/products/import/route.ts` | New | +180 |
| 8 | `apps/web/src/app/admin/(authenticated)/productos/importar/page.tsx` | New | +60 |
| 9 | `apps/web/src/app/admin/(authenticated)/productos/importar/ImportForm.tsx` | New | +320 |
| 10 | `apps/web/src/app/admin/(authenticated)/productos/importar/excel.ts` | New | +90 |
| 11 | `apps/web/src/app/admin/(authenticated)/layout.tsx` | Modified | +5 (link "Importar" en sidebar) |
| 12 | `apps/web/package.json` | Modified | +1 (dep `xlsx`) |
| 13 | `openspec/changes/catalog-excel-import/verify-report.md` | New | +80 |
| **Total** | | | **≈ 950 Δ** |

> F5 (mostrar `externalId` y `confidence` en `ProductList` /
> `ProductForm`) queda diferida a un slice posterior; ver § 8.

---

## 7. Interfaz del endpoint `POST /api/admin/products/import`

**Request**

```typescript
type ImportRow = {
  externalId: string;          // required, máx 60
  name: string;                // required, máx 120
  description: string;         // required
  shortDescription?: string;   // máx 280
  price: number;               // 0 si viene vacío
  currency?: string;           // default "CLP"
  productType: string;         // ej. "Silla"
  category: string;            // ej. "Escolar"
  subcategory: string;         // ej. "Sillas y asientos"
  usageEnvironment?: string;
  observableColor?: string;
  observableMaterial?: string;
  catalogPage?: number;
  confidence: 'alta' | 'media-variante-visual' | 'media-nombre-generico-pdf' | 'revision-manual';
  source?: string;
  observation?: string;
};

type ImportBody = {
  rows: ImportRow[];           // máx 200
};
```

**Response 200**

```typescript
type ImportResult = {
  externalId: string;
  status: 'created' | 'updated' | 'failed';
  documentId?: string;
  error?: string;
  warnings?: string[];
};

type ImportResponse = {
  summary: {
    created: number;
    updated: number;
    failed: number;
    warnings: number;
  };
  results: ImportResult[];
};
```

**Errores HTTP**

| Status | Body | Cuándo |
| --- | --- | --- |
| 400 | `{ error: "Datos inválidos", details: ... }` | Body no es JSON válido o no pasa zod |
| 401 | `{ error: "Unauthorized" }` | Sin sesión admin |
| 403 | `{ error: "Solo owner puede importar catálogos" }` | Rol `client` |
| 413 | `{ error: "Lote demasiado grande (máx 200 filas por request)" }` | `rows.length > 200` |
| 503 | `{ error: "No se pudo contactar Strapi" }` | Strapi caído antes del loop |

---

## 8. Fuera de alcance (recordatorio)

- **F5** (mostrar `externalId` y `confidence` en `ProductList` y
  `ProductForm`): se difiere a un slice posterior. El import funciona
  end-to-end sin esto; los productos llegan a Strapi con los campos
  correctos aunque la UI existente no los muestre. Se recomienda
  hacerlo cuando se attack la página de detalle admin para
  soportar los nuevos campos visuales.
- **Importar imágenes**: el PDF del catálogo no se scrapea; las fotos
  se suben después desde el formulario existente.
- **Sincronización inversa**: Strapi → Excel no se soporta.
- **Editor visual del mapeo**: el mapeo es fijo en el código.

---

## 9. Estrategia de pruebas

| Capa | Qué se prueba | Cómo |
| --- | --- | --- |
| Unit | `excel.ts` parser (SheetJS → JSON) | Vitest, mock del arrayBuffer |
| Unit | Mapeo de `Certeza` → `confidence` | Vitest, tabla de casos |
| Unit | `slugify(name) + '-' + externalId` | Vitest, casos edge (tildes, caracteres especiales) |
| Integration | `POST /api/admin/products/import` con DB de Strapi local | `curl` + Strapi en Docker |
| E2E | Flujo `/admin/productos/importar` con archivo real | Playwright contra stack local |

---

## 10. Riesgos específicos del diseño

| Riesgo | Mitigación |
| --- | --- |
| `xlsx` agrega 400 KB al bundle del cliente admin | Sólo se carga en la página `/admin/productos/importar` (no en el bundle principal del admin). Verificable con `pnpm --filter web build` y revisión del chunk size. |
| El mapeo hardcodeado a las columnas del Excel 2025 rompe con el Excel 2026 si cambian headers | El sistema valida contra `expectedColumns` antes de aceptar el archivo; si cambia una columna crítica la página aborta con mensaje claro. Cambiar el mapeo es un cambio de código explícito, no un fallo silencioso. |
| Cache en memoria de categorías/subcategorías no se invalida entre requests | No es problema: cada request es independiente (no hay sesión de import persistente). Si llega una categoría nueva, se crea y se cachea en ese request. |
| La query `filters[externalId][$eq]=X` por fila es N+1 | Aceptable para 160 filas (160 GETs × ~30 ms = ~5 s). Si el catálogo crece a > 500 filas, considerar un endpoint bulk en Strapi custom controller. Out-of-scope ahora. |
| `subcategory` queda ligada a `category` por nombre, no por id | El endpoint resuelve ambas en el mismo orden, garantiza que la subcategoría se crea con la `category` correcta, y la cache lo registra. Riesgo bajo. |