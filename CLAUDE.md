# CLAUDE.md — cuadros-basicos

Contexto y decisiones para no re-iterar. Dashboard de Cuadros Básicos + Floor Share de Drean.

## Tres dashboards en la misma app
- **`/` (raíz)** — dashboard **legacy en JS vanilla** (`public/dashboard.js` + Chart.js/CDN). Es el **Trade Marketing**: **CB de Trade + Floor Share** a nivel **tienda**. Consume `/api/data` → `getDataset()`. Tiene tabs internos: "Cumplimiento CB", "Floor Share" y **"CB × Floor Share"** (este último embebe `/trade?embed=1` en un iframe, carga diferida).
- **`/ventas`** — dashboard **React/Next** (auth con JWT, middleware protege `/ventas/*`). Es el **CB de Ventas** a nivel **cuenta/razón social**, basado en compras **FC + BO**. Datos: `data/cuadro-basico.json` + `data/clasificacion-clientes.json` + ventas. Componentes: `Dashboard.tsx`, `AnalisisCB.tsx`.
- **`/trade`** — vista **React** nueva: análisis cruzado **CB-Trade × Floor Share** por tienda. Lógica en `lib/analisis-trade.ts`, UI en `components/AnalisisTrade.tsx`.

## CB de Ventas vs CB de Trade (¡son distintos!)
- **CB Ventas** = por **cuenta** (razón social). Mide **compra** (FC+BO). Objetivo 80%.
- **CB Trade** = tabla Supabase **`cuadro_basico_semanal`** (`lib/cb-supabase.ts`). Grano **tienda × sku × semana**, con `target_cb/real_cb`, `target_inf/real_inf`, `tipo_sku`, enriquecido con cliente/promotor/supervisor vía tabla `contactos`. Mide **presencia** del SKU en el PDV.

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

## Supabase — OJO, son DOS proyectos distintos
- La app cuadros-basicos usa **su propio** Supabase (holds `cuadro_basico_semanal`, `floor_share`, `contactos`).
- El **entorno de dev/programado tiene `NEXT_PUBLIC_SUPABASE_URL` apuntando al proyecto de MARKETING (Dashboard-Mkt)**, que **NO tiene** esas tablas. No confundirlos: consultar la Supabase de marketing por `cuadro_basico_semanal` da "table not found".
- La DB CB puede configurarse con `CB_SUPABASE_URL` / `CB_SUPABASE_SERVICE_ROLE_KEY` (fallback a las default).

## Deploy / git
- Vercel project **cuadros-basicos**. Preview por branch en cada push.
- Remote GitHub: `dsabena-byte/Cuadros-basicos` (se movió; el push avisa el redirect, es normal).
- Convención de ramas: `claude/*`. PRs draft → mergear con squash.
- Verificación estándar antes de pushear: `npx tsc --noEmit` y `npx next build`.
