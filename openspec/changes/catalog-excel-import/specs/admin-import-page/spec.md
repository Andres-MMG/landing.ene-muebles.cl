# Especificación: admin-import-page

## Purpose

Define la experiencia de la página `/admin/productos/importar`: subir
el Excel, validarlo contra el esquema esperado, mostrar el progreso
del procesamiento y entregar un resumen final con `creados`,
`actualizados`, `fallos` y `advertencias`. Esta capacidad es **nueva**;
no existe una página previa con esta responsabilidad.

## Requirements

### Requirement: Parseo en navegador

La página MUST parsear el archivo Excel en el navegador del cliente
usando SheetJS (`xlsx`). El servidor MUST NO recibir el archivo crudo:
sólo recibe el JSON ya parseado.

#### Scenario: Archivo .xlsx válido se parsea

- GIVEN un archivo `catalogo_productos_202.xlsx` (≈ 18 KB)
- WHEN el admin lo selecciona desde `<input type="file">`
- THEN SheetJS produce un `Array<Array<string>>` con 160 filas de datos
- AND la página avanza al paso de validación

#### Scenario: Archivo demasiado grande se rechaza

- GIVEN un archivo de 6 MB
- WHEN el admin lo selecciona
- THEN la página muestra
  `"El archivo supera el límite de 5 MB. Reducí las imágenes embebidas."`
- AND no avanza al paso de validación

#### Scenario: Archivo sin filas se rechaza

- GIVEN un archivo con sólo la fila de encabezados
- WHEN el admin lo selecciona
- THEN la página muestra
  `"El archivo no contiene filas de productos."`
- AND no avanza

### Requirement: Validación de columnas esperadas

La página MUST validar contra una lista fija de columnas esperadas:

```
ID, Producto, Qué es, Categoría, Subcategoría, Descripción,
Uso / ambiente, Color observable, Material / acabado observable,
Página PDF, Certeza, Fuente, Observación
```

Si falta alguna columna crítica (`ID`, `Producto`, `Categoría`,
`Subcategoría`, `Certeza`), la página MUST abortar con error claro.

#### Scenario: Columnas críticas presentes

- GIVEN un Excel con las 13 columnas esperadas
- WHEN se valida el archivo
- THEN la página avanza al paso de previsualización
- AND muestra el conteo de filas detectadas

#### Scenario: Falta columna ID

- GIVEN un Excel al que le borraron la columna `ID`
- WHEN se valida el archivo
- THEN la página muestra
  `"Falta la columna 'ID'. Revisá que el archivo viene del catálogo 2025."`
- AND ningún request se envía al backend

#### Scenario: Columnas opcionales ausentes son toleradas

- GIVEN un Excel sin la columna `Fuente`
- WHEN se valida
- THEN la página continúa con la validación
- AND las filas sin `Fuente` se importan con `source = null`

### Requirement: Previsualización antes de confirmar

La página MUST mostrar una tabla de previsualización con las primeras
10 filas antes de confirmar el import. El admin debe poder cancelar y
reemplazar el archivo.

#### Scenario: Preview muestra primeras 10 filas

- GIVEN un Excel válido con 160 filas
- WHEN se llega al paso de previsualización
- THEN la página renderiza una tabla con las primeras 10 filas
- AND muestra el total de filas detectadas (`160 productos detectados`)
- AND expone un botón `Cancelar y reemplazar archivo`

#### Scenario: Cancelar vuelve al paso de selección

- GIVEN el admin en el paso de previsualización
- WHEN hace click en `Cancelar y reemplazar archivo`
- THEN la página vuelve al paso de selección
- AND ningún request al backend se ejecuta

### Requirement: Confirmación explícita

La página MUST requerir un click en `Confirmar import` antes de enviar
el lote al backend. El botón debe listar el total a procesar.

#### Scenario: Botón muestra conteo

- GIVEN 160 filas en previsualización
- WHEN se renderiza el botón de confirmar
- THEN su texto es `Confirmar import (160 productos)`

#### Scenario: Click envía el lote

- GIVEN el admin en el paso de confirmación
- WHEN hace click en `Confirmar import (160 productos)`
- THEN la página POST a `/api/admin/products/import` con `{ rows: [...] }`
- AND la UI entra en estado de progreso

### Requirement: Progreso visible

La página MUST mostrar una barra o contador de progreso durante el
procesamiento. Para lotes grandes (> 50 filas) la barra se actualiza
por chunks de 20.

#### Scenario: Progreso durante import

- GIVEN un import de 160 filas en curso
- WHEN 40 filas se han procesado
- THEN la página muestra
  `Procesando… 40 / 160 (25%)`
- AND la barra de progreso se llena al 25%

#### Scenario: UI bloqueada durante el import

- GIVEN un import en curso
- WHEN el admin intenta seleccionar otro archivo
- THEN los controles están deshabilitados
- AND un mensaje `Procesando… no cierres esta pestaña` es visible

### Requirement: Resumen final

Cuando el backend responde, la página MUST mostrar un resumen con:

- Total procesado
- `creados` (verde)
- `actualizados` (azul)
- `fallos` (rojo, con lista expandible de filas fallidas y su error)
- `advertencias` (amarillo, con lista de filas y motivo)

El resumen MUST distinguir visualmente éxito de fallo, y debe ofrecer
un botón `Volver al panel de productos` que navega a `/admin`.

#### Scenario: Resumen sin fallos

- GIVEN un import de 160 filas con todas exitosas
- WHEN el backend responde
- THEN la página muestra
  `160 productos importados: 160 creados, 0 actualizados, 0 fallos`
- AND no muestra sección de fallos

#### Scenario: Resumen con fallos

- GIVEN un import de 160 filas con 5 fallidas
- WHEN el backend responde
- THEN la página muestra
  `155 productos importados, 5 fallos`
- AND una sección expandible lista cada fila fallida con su `externalId`
  y mensaje de error
- AND un mensaje sugiere
  `Corregí las filas fallidas y volvé a importar el archivo.`

#### Scenario: Advertencias visibles

- GIVEN 12 filas con `precio faltante` y 2 con `certeza vacía`
- WHEN el backend responde
- THEN la página muestra
  `14 advertencias`
- AND la sección expandible lista cada fila con su motivo

### Requirement: Acceso restringido al admin

La página MUST ser inaccesible sin sesión admin activa. Cualquier
visita sin cookie `ene_admin_session` válida redirige a
`/admin/login`.

#### Scenario: Visita sin sesión

- GIVEN un visitante sin cookie admin
- WHEN navega a `/admin/productos/importar`
- THEN el middleware redirige a `/admin/login`
- AND la página nunca se renderiza

#### Scenario: Visita con sesión activa

- GIVEN un admin autenticado
- WHEN navega a `/admin/productos/importar`
- THEN la página se renderiza con el botón
  `Seleccionar archivo Excel`

### Requirement: Acceso solo para rol owner

La página MUST ser accesible sólo para usuarios con rol `owner`. Un
admin con rol `client` que intenta visitarla ve un mensaje
`No tenés permisos para importar catálogos. Esta acción está reservada
al dueño.` y un link al dashboard.

#### Scenario: Rol client bloqueado

- GIVEN un admin con `role = "client"`
- WHEN navega a `/admin/productos/importar`
- THEN la página muestra el mensaje de no-permisos
- AND ningún botón de selección de archivo se renderiza

#### Scenario: Rol owner habilitado

- GIVEN un admin con `role = "owner"`
- WHEN navega a `/admin/productos/importar`
- THEN la página renderiza el flujo completo de import

### Requirement: Cancelación mid-import

Si el backend todavía está procesando y el admin abandona la página
(cierra tab, navega a otra ruta), el request en vuelo se cancela con
`AbortController` para no desperdiciar trabajo del servidor.

#### Scenario: Cancelar al cerrar tab

- GIVEN un import en curso
- WHEN el admin cierra la pestaña
- THEN el `fetch` se aborta con `AbortController.abort()`
- AND el servidor recibe la cancelación (no se sigue procesando)