# Dashboard `/ventas` — Cumplimiento CB Ventas

Dashboard React (Next.js + Recharts) que muestra el cumplimiento del Cuadro Básico por cliente / vendedor / gerencia, basado en la facturación (FC) y backorder (BO) productivo.

## Pipeline de datos

```
                          ┌───────────────────────────────────────┐
                          │ Google Drive / cuadro-basico-ventas/  │
                          │  ├── Cuadros-basicos-Abril-2026.csv   │
                          │  └── Clasificacion-clientes-…csv      │
                          └──────────────────┬────────────────────┘
                                             │ lib/cb-drive.ts (TTL 5min)
                                             ▼
                                    ┌─────────────────┐
                                    │ CB + Clasif     │
                                    │ (en memoria)    │
                                    └────┬────────────┘
                                         │
   ┌─────────────────────────────────────┼────────────────┐
   │                                     │                │
   ▼                                     ▼                ▼
 GET /api/cb-pairs            cbCanonical Map en      cbFiltrado en
 (lo consume el                lib/ingest-ventas.ts    el dashboard
  Office Script)              (filtra payload FC+BO)
   │                                     ▲
   │                                     │
   │                                ┌────┴─────────────────────┐
   │                                │ POST /api/ventas         │
   │                                │  body = {fc, bo}         │
   │                                │  Header x-refresh-secret │
   │                                └────────▲─────────────────┘
   │                                         │
   │     ┌───────────────────────────────────┴───────────────────┐
   │     │              Office Script en Excel                    │
   │     │              office-scripts/sync-ventas.ts             │
   │     │                                                        │
   │     │ 1. GET /api/cb-pairs → set de cliente|sku             │
   │     │ 2. Refresh Power Query del workbook                   │
   │     │ 3. Leer tabla FC en chunks de 5K filas                │
   │     │ 4. Leer tabla BO ídem                                 │
   │     │ 5. Filtrar por CB pairs + mapear a schema             │
   │     │ 6. POST /api/ventas                                   │
   │     └───────────────────────────────────────────────────────┘
   ▼
 (loop)
                                  │
                                  ▼
                          ventas.json en Vercel Blob
                                  │
                                  ▼
                          /ventas page (lee CB de Drive + ventas del blob)
```

## Componentes

### `lib/cb-drive.ts`

Lee el Cuadro Básico y la Clasificación de Clientes desde Google Drive, replicando la lógica de `scripts/import-csv.mjs`.

- Busca subfolder `cuadro-basico-ventas` dentro de `DRIVE_FOLDER_ID`. Si no existe, usa `DRIVE_FOLDER_ID` directo. Override con `DRIVE_CB_FOLDER_ID`.
- Pickea el `Cuadros-basicos-*.csv` y `Clasificacion-clientes-*.csv` más recientes por `modifiedTime`.
- Decodifica latin1 (los CSVs vienen de SAP con encoding Windows-1252).
- Expande las filas del CB sin cliente explícito a todos los clientes de la tipología.
- Cache en memoria con TTL de 5 min + in-flight de-dup.
- `invalidateCBDriveCache()` lo limpia (lo llama `/api/refresh`).

### `office-scripts/sync-ventas.ts`

El Office Script que corre dentro del Excel `FC + BO 2026 - Hanna.xlsx`. Ver [`docs/office-scripts.md`](office-scripts.md) para setup.

Configuración (bloque `CONFIG` arriba del archivo):

```ts
const CONFIG = {
  apiBase: "https://cuadros-basicos.vercel.app",
  secret: "<REFRESH_SECRET1>",
  tableNameFC: "FC",
  tableNameBO: "BO",
};
```

Y el `COLUMN_MAPPING` define cómo encontrar cada campo en los headers del Excel. La primera variante que matchee (case-insensitive, trim) se usa. Si los headers cambian, agregar variantes ahí.

**Para FC (facturado)** las unidades vienen de **`VolumenVentas`** — la columna `CANTIDAD PEDIDO FC` representa la cantidad ORIGINAL pedida y duplica si una orden se factura en varias FC (split deliveries).

**Para BO (backorder)** las unidades vienen de **`Cantidad Pendiente`** y la fecha de **`Fecha Creación Cabecera`**.

Las fechas se convierten dentro del script (Excel serial → YYYY-MM-DD) vía `normalizeRawFecha`, porque celdas con formato Date se leen como número serial en Office Scripts.

### `lib/ingest-ventas.ts` + `/api/ventas`

El POST recibe `{fc: VentasPayloadRow[], bo: VentasPayloadRow[]}`. Para cada fila:

1. Filtra por CB: descarta las que no matcheen un par `(cliente, sku)` del catálogo (con `cliente` normalizado a mayúsculas + trim + espacios colapsados).
2. Valida y parsea (fecha, unidades).
3. Reemplaza el `cliente` por el nombre canónico del CB.
4. Persiste en Vercel Blob (`ventas.json`).

Las unidades negativas (devoluciones) se mantienen tal cual; se suman netas en el dashboard.

### `components/Dashboard.tsx`

- KPI cards: % Cuadro Básico (featured, gradient navy + coral) + % Infaltables + % Estratégico + Clientes.
- Filtros: Mes (multi), Categoría, Gerente, Vendedor, **Tipología (multi)**, Cliente. Cascade: cambiar Gerente resetea Vendedor/Tipología/Cliente; cambiar Vendedor resetea Tipología/Cliente; etc.
- Charts: Evolución mensual (line), Cumplimiento por Categoría (bar), Cumplimiento por Gerencia (bar).
- Tablas: Cumplimiento por Vendedor y por Cliente/Cadena.
- Detalle por SKU del CB: tabla expandible — click en una fila con FC > 0 muestra el desglose por fecha de facturación.

#### Semánticas importantes

- **"Cumplido"** = la suma de unidades (FC + BO) para el par `(cliente, sku)` en el universo filtrado es > 0. Antes era "existe al menos una fila" pero eso incluía rows con 0 unidades (ajustes/cancelaciones) y generaba inconsistencia con la tabla de SKUs. Ahora cards / chart / tabla son consistentes.
- **BOs con fecha de entrega futura** (`c.mes > mesActual`) se tratan como mes actual en el gráfico de evolución — sino el último punto subreportaba vs los KPIs.

## Operativa

### Refresh diario

Hanna abre el Excel **en Desktop** (no Web, porque la Power Query del Excel apunta a una carpeta local de Pablo Almada y solo Desktop puede acceder):

1. Datos → Actualizar todo (Power Query baja la última data de SAP).
2. Guardar (Ctrl+S).
3. Clickear el botón "Actualizar Dashboard" en la hoja (corre el Office Script).
4. El dashboard se actualiza en menos de 1 minuto.

### Forzar refresh del CB

Si cambiás los CSVs en Drive y querés que el dashboard los vea sin esperar el TTL de 5 min:

```bash
curl "https://cuadros-basicos.vercel.app/api/refresh?secret=$REFRESH_SECRET"
```

Después Ctrl+Shift+R en el browser.

### Validar números contra otra fuente

1. Filtrar `/ventas` por cliente + mes específicos.
2. Para un SKU con FC > 0, clickear la fila → se expande el detalle por fecha.
3. Comparar contra el Excel filtrando la tabla FC por el mismo cliente + SKU + mes → la suma de `VolumenVentas` debería matchear.

## Pendientes / mejoras posibles

- **Automatizar el refresh del Power Query**: hoy Hanna lo hace a mano porque el Excel apunta a una carpeta local. La solución es que Pablo migre la fuente del Power Query a una SharePoint Folder. Una vez hecho, podemos automatizar con un Scheduled Flow de Power Automate (Recurrence + "Run script" de Office Scripts).
- **PR #18** (draft): integración con Microsoft Graph API + Vercel Cron. Permitiría saltarse el Excel completo y leer SAP directo. Requiere App Registration en Azure AD que IT no aprobó. Si en algún momento cambia, se puede retomar.
