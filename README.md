# Dashboard Cumplimiento Cuadros Básicos · Drean Argentina

Dashboard React + Next.js que muestra el cumplimiento mensual de los
**Cuadros Básicos** de Drean: porcentajes de **CB total**, **Infaltables** y
**Estratégico** por gerente, vendedor, cliente y categoría, con objetivo
80%.

## Fuentes de datos

| Tipo                        | Origen                                                 | Archivo en `/data/`            |
|-----------------------------|--------------------------------------------------------|--------------------------------|
| Cuadro básico (estático)    | Google Drive · `Cuadros-basicos-Abril-2026.csv`        | `cuadro-basico.json`           |
| Clasificación de clientes   | Google Drive · `Clasificacion-clientes-Abril-2026.csv` | `clasificacion-clientes.json`  |
| Ventas FC + BO (dinámico)   | SharePoint · `FC + BO 2026 - Hanna.xlsx` (Power Automate) | `ventas.json`               |

> Carpeta de Drive: <https://drive.google.com/drive/folders/1qWyyWFcAe9EvfXr0ayDIVeIG1M6y3233>
>
> Sitio SharePoint: `mabe.sharepoint.com/sites/CO-ARCOMERCIAL` →
> `General > 7. Analistas de Ventas > 1 - TABLEROS > Tablero - archivos para actualizar`

Hoy los tres archivos JSON son **dummy** (ver `scripts/generate-dummy-data.mjs`).
Cuando estén los CSVs reales y el flow de Power Automate, los reemplazamos por
los datos de producción sin tocar el dashboard.

## Estructura

```
app/
  layout.tsx                 Shell HTML + Tailwind
  page.tsx                   Server component, lee los 3 JSON y se los pasa al Dashboard
  globals.css                Tailwind base
  api/
    ventas/route.ts          POST: recibe el payload de Power Automate (FC + BO)
    refresh/route.ts         POST: revalida la home sin reescribir ventas

components/
  Dashboard.tsx              Componente cliente con gráficos, tablas y filtros

lib/
  types.ts                   Tipos compartidos
  data.ts                    Carga de los JSON (import) + storage de ventas
  storage.ts                 Vercel Blob (prod) o filesystem (dev) para ventas.json

data/                        Bundleado en la función serverless (no expuesto por HTTP)
  cuadro-basico.json         Generado por scripts/import-csv.mjs
  clasificacion-clientes.json  Generado por scripts/import-csv.mjs
  ventas.json                Fallback dummy. En prod lo escribe POST /api/ventas al Vercel Blob

raw-data/                    CSVs originales del Drive (input del importador)
  Cuadros-basicos-Abril-2026.csv
  Clasificacion-clientes-Abril-2026.csv

scripts/
  import-csv.mjs             Convierte raw-data/*.csv → data/*.json
  generate-dummy-ventas.mjs  Genera ventas.json simuladas a partir del CB real

docs/
  power-automate.md          Cómo configurar el flow + shape del payload
  sample-payload.json        Body de ejemplo para probar /api/ventas con curl
```

## Lógica de cumplimiento

Un SKU está **cumplido** para un cliente si tiene al menos 1 unidad en FC o BO.

```
% CB           = SKUs cumplidos / SKUs totales
% Infaltables  = idem solo sobre tipo INFALTABLE
% Estratégico  = idem solo sobre tipo ESTRATEGICO
```

Objetivo 80%; el delta vs objetivo se muestra en pp con flechas ↑↓.

## Filtros (en orden)

`MES · CATEGORÍA · GERENTE · VENDEDOR · TIPOLOGÍA · CLIENTE · [Limpiar]`

Cascadas: gerente filtra vendedor; tipología filtra cliente.

## Layout

1. Header con timestamp de última sincronización (`ventas.json#generatedAt`)
2. FilterBar sticky
3. KPI cards: % CB · % Infaltables · % Estratégico · Clientes · En riesgo (<50%)
4. **Evolución mensual** — LineChart, cálculo acumulativo
5. **Cumplimiento por Categoría** — BarChart agrupado
6. **Cumplimiento por Vendedor** + **Cumplimiento por Cliente / Cadena** (tablas lado a lado)
7. Detalle de SKUs del cliente seleccionado (al hacer click en una fila)

## Desarrollo local

```bash
npm install
npm run dev          # http://localhost:3000

# regenerar JSONs desde los CSV reales del Drive
node scripts/import-csv.mjs

# regenerar ventas dummy a partir del CB real (para tener algo en el dashboard
# sin Power Automate)
node scripts/generate-dummy-ventas.mjs

# probar el endpoint de Power Automate con un payload de ejemplo
REFRESH_SECRET1=dev-secret npm run dev
curl -X POST http://localhost:3000/api/ventas \
  -H "Content-Type: application/json" \
  -H "x-refresh-secret: dev-secret" \
  -d @docs/sample-payload.json

npm run typecheck
```

## Conexión SharePoint → Power Automate

El detalle del flow (trigger sobre `FC + BO 2026 - Hanna.xlsx`, mapeo de
columnas, payload esperado, errores) está en
[`docs/power-automate.md`](docs/power-automate.md).

Punto clave: las solapas **BO** y **FC** se conectan por **Documento de
Ventas**. Un mismo pedido puede estar 100% en BO, 100% en FC, o partido
entre las dos solapas; el dashboard considera un SKU cumplido para un
cliente si tiene al menos 1 unidad en cualquiera de las dos.

## Paleta

| Métrica         | Color     |
|-----------------|-----------|
| % CB            | `#2542C2` |
| % Infaltables   | `#A855F7` |
| % Estratégico   | `#EC4899` |
| Header tablas   | `#1e3a8a` |

Coloreado de celdas: ≥80% verde · 70-79% amarillo · <70% rojo.
