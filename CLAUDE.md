# CLAUDE.md — cuadros-basicos

Contexto y decisiones para no re-iterar. Dashboard de Cuadros Básicos + Floor Share de Drean.

## Tres dashboards en la misma app
- **`/` (raíz)** — dashboard **legacy en JS vanilla** (`public/dashboard.js` + Chart.js/CDN). Es el **Trade Marketing**: **CB de Trade + Floor Share** a nivel **tienda**. Consume `/api/data` → `getDataset()`. Tiene tabs internos: "Cumplimiento CB", "Floor Share" y **"CB × Floor Share"** (este último embebe `/trade?embed=1` en un iframe, carga diferida).
- **`/ventas`** — dashboard **React/Next** (auth con JWT, middleware protege `/ventas/*`). Es el **CB de Ventas** a nivel **cuenta/razón social**, basado en compras **FC + BO**. Datos: `data/cuadro-basico.json` + `data/clasificacion-clientes.json` + ventas. Componentes: `Dashboard.tsx`, `AnalisisCB.tsx`.
- **`/trade`** — vista **React** nueva: análisis cruzado **CB-Trade × Floor Share** por tienda. Lógica en `lib/analisis-trade.ts`, UI en `components/AnalisisTrade.tsx`.

## CB de Ventas vs CB de Trade (¡son distintos!)
- **CB Ventas** = por **cuenta** (razón social). Mide **compra** (FC+BO). Objetivo 80%.
- **CB Trade** = tabla Supabase **`cuadro_basico_semanal`** (`lib/cb-supabase.ts`). Grano **tienda × sku × semana**, con `target_cb/real_cb`, `target_inf/real_inf`, `tipo_sku`, enriquecido con cliente/promotor/supervisor vía tabla `contactos`. Mide **presencia** del SKU en el PDV.

## Homólogos de SKU en CB Ventas
- Cada fila del CB puede declarar SKUs **homólogos** (columnas `HOMOLOGO 1`, `HOMOLOGO 2`, …). Autodetectado por `cb-drive.ts`: cualquier header que arranque con `HOMOLOGO`.
- Una venta cumple el CB si matchea el **primary (Modelo) o cualquier homólogo**. Helpers: `matchesCB(venta, item)` y `allSkusOfCB(item)` en `lib/cb-match.ts`.
- `/api/cb-pairs` devuelve pares para primary + todos los homólogos → el Office Script no descarta ventas con SKU alternativo.
- En el detalle por SKU: el primary siempre se muestra; los homólogos solo si tuvieron facturación o back order. Chip "FOB" al lado del SKU específico que vino por canal FOB.

## Floor Share
- Grano **tienda × categoría × marca**. Nuestra marca = **Drean**. `lib/parse-floorshare.ts`, `lib/floorshare-supabase.ts`.
- **Share** = uds Drean / **Total**, donde Total = fila "Total" del CSV **o**, si no viene, la **suma de todas las marcas** (fallback del legacy — imprescindible, sino da 0).
- **Objetivos FS por categoría**: Lavado 32 · Refrigeracion 25 · Coccion 23.
- **Categorías canónicas**: `lavado`, `refrigeracion`, `coccion`. Normalizar: "LAVADO Y SECADO"→lavado, "COCCIÓN"→coccion, "frio/refriger"→refrigeracion.

## El cruce CB-Trade ↔ Floor Share (`/trade`)
- **Join por número de tienda** (extraído del campo `tienda` "557 - ON CITY…"). Ambos se enriquecen con la **misma** tabla `contactos`, así que el join no es coincidencia de nombres.
- El análisis se **acota a las tiendas del CB** (donde "cerrar CB" es accionable); a cada una se le adjunta su FS.
- **Período** = "estado al cierre" de un mes fiscal: se toma el **último relevamiento ≤ cierre** por tienda/sku (FS se releva por rotación, no todas las semanas — por eso NO filtrar FS a las semanas exactas del CB, se caen tiendas).
- **"FS si reponés"** (uplift): supuesto = **Drean desplaza competencia** (total de góndola fijo). Cada SKU repuesto suma `uds Drean / (SKUs CB presentes + faltantes)` unidades. Es estimación, no medición (FS es por marca, no por SKU).
- **Matriz** por tienda: Falta surtido (CB bajo/FS bajo) · Ejecución góndola (CB alto/FS bajo) · Sostener · Frágil.

## Tab Análisis de Ventas (`AnalisisCB.tsx`)
- 3 cards, todas las filas, cada una con columnas **CB · Inf · Est** y drill:
  - **Categoría** → modelos deduplicados, separados Infaltables/Estratégicos (sin cliente/categoría), con en cuántos clientes falta cada uno.
  - **Tipología** → principales clientes; **Gerencia** → principales vendedores. En el drill, bajo cada nombre: fila **General** + desglose **% cumplimiento por categoría** (Lavado/Refri/Cocción × CB/Inf/Est).
- Tablas **Vendedor/Cliente**: "Mayor impacto" y "Quick wins" como dos tablas separadas. Detalle de SKUs ordenado **Cliente → Categoría → INF/EST**; en la tabla Cliente no se repite el nombre del cliente.
- **Ventana FC a mes cerrado por tipología** (en el cálculo core `calcularPorcentajes`): Top 10 / Grandes Cuentas Resto / Hipermercados = **2 meses** cerrados; Small Retailers = **3 meses**; BO acumulado. Si hay filtro de MES activo, manda el filtro.
- **Gráfico "Evolución mensual"**: ventana móvil de 2 meses (M y M-1). NO acumulado desde Enero — refleja performance reciente.

## Office Script del Excel (sync-ventas)
- El flujo /ventas se alimenta de **"FC + BO 2026 - Hanna.xlsx"** en SharePoint (`CO _ AR COMERCIAL - Tablero/archivos para actualizar/`). Un **Office Script embebido** (no Power Automate) lee las tablas y POSTea a `/api/ventas`.
- Tablas que lee: `FC`, `BO`, `FC_FOB_1`, `BO_FOB`. Las dos últimas son ventas de exportación FOB (opcionales, se omiten si no existen).
- Marca cada fila con `canal: "SELL_IN" | "FOB"` según la tabla de origen. El dashboard muestra chip ámbar **FOB** en el detalle de SKU si al menos una compra vino por ese canal.
- Las ventas FOB **suman al vendedor del cliente** (resuelto desde `Clasificacion-clientes-*.csv`), NO al ejecutivo que viene en el Excel.
- Antes de leer, el script hace `workbook.refreshAllDataConnections()`. Si da `DataSource.Error: process cannot access the file`, es porque PQ apunta a sí mismo o a un archivo lockeado — se puede ignorar, el script sigue leyendo lo que ya está cargado en las tablas.
- Las tablas del workbook se alimentan vía **Power Query** desde orígenes externos. Si vienen con `0 rows loaded` o `Download did not complete`, hay que ir a Power Query Editor y arreglar la query (típicamente: `Changed Type` que busca columnas renombradas, o paso `Filtered Rows` con tipo mismatch ej. `[Año] = 2026` cuando `Año` es texto).

## Filtros del dashboard /ventas (criterio uniforme)
Todos los filtros (Vendedor, Gerencia, Tipología) se resuelven **por cliente desde `Clasificacion-clientes-*.csv`**, NO desde los campos que vengan en las ventas:
- `vendedorPorCliente.get(c.cliente)` para vendedor.
- `gerentePorVendedor.get(v)` para gerencia.
- `tipologiaPorCliente.get(c.cliente)` para tipología.

Esto se aplica también en `filtrarCompras` y `evolucionMensualCB` (`lib/sellin-metrics.ts`) vía parámetro opcional `vendedorPorCliente`. Garantiza consistencia incluso cuando el Excel trae el `Ejecutivo de Venta` distinto al que figura asignado al cliente en la clasificación.

## Dashboard legacy /: filtros y evolución
- **Mes** y **Semana** son multi-select con checkboxes (`fillMultiSelect` en `public/dashboard.js`). Cada panel tiene un botón "✕ Limpiar" propio para resetear ese filtro individual.
- **Floor Share** solo lee filas semanales de Supabase (`semana IS NOT NULL`). El mes se deriva de la semana vía calendario fiscal 5-4-4 (`weekToMonthCode`). Los archivos mensuales de origen (`YYYY-MM_*.csv`) se descontinuaron.
- Gráfico "Evolución semanal" de Floor Share agrupa por `r.semana` (eje X: "Sem 14", "Sem 15", ...), no por mes.

## Supabase client (performance)
- `lib/supabase.ts` → `supabaseSelectAll` pagina en **paralelo** (cap 8 workers) después de la primera request con `count=exact`. Cold start de `/api/data` bajó de ~10-15s a ~2-3s.

## Dashboards embebidos externos
- El dashboard de Marketing (otro repo, URL `dashboard-mkt-seven.vercel.app`) embebe el nuestro vía iframe. El embed usa el modo `?embed=cb` o `?embed=floorshare` (ver `initTabs()` en `public/dashboard.js`) que oculta la barra de tabs y arranca en la tab pedida.

## Supabase — OJO, son DOS proyectos distintos
- La app cuadros-basicos usa **su propio** Supabase (holds `cuadro_basico_semanal`, `floor_share`, `contactos`).
- El **entorno de dev/programado tiene `NEXT_PUBLIC_SUPABASE_URL` apuntando al proyecto de MARKETING (Dashboard-Mkt)**, que **NO tiene** esas tablas. No confundirlos: consultar la Supabase de marketing por `cuadro_basico_semanal` da "table not found".
- La DB CB puede configurarse con `CB_SUPABASE_URL` / `CB_SUPABASE_SERVICE_ROLE_KEY` (fallback a las default).

## Deploy / git
- Vercel project **cuadros-basicos**. Preview por branch en cada push.
- Remote GitHub: `dsabena-byte/Cuadros-basicos` (se movió; el push avisa el redirect, es normal).
- Convención de ramas: `claude/*`. PRs draft → mergear con squash.
- Verificación estándar antes de pushear: `npx tsc --noEmit` y `npx next build`.
