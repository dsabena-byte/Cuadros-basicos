# Dashboards Drean — Trade Marketing + Cumplimiento CB Ventas

Repo con **dos dashboards** que comparten infraestructura (Next.js en Vercel + Google Drive como fuente de datos):

| URL | Nombre | Foco | Fuente principal |
|---|---|---|---|
| [`/`](https://cuadros-basicos.vercel.app/) | **Dashboard Trade Marketing** | Cumplimiento CB por tienda + Floor Share por categoría | CSVs semanales en Google Drive |
| [`/ventas`](https://cuadros-basicos.vercel.app/ventas) | **Cumplimiento Cuadro Básico — Ventas** | Cumplimiento CB por cliente/vendedor/gerencia, basado en facturación (FC) y backorder (BO) | Excel SharePoint `FC + BO 2026 - Hanna.xlsx` |

```
                ┌────────────────────────────────────────────────────────────────┐
                │                       Google Drive                              │
                │  Tablero CB/                                                    │
                │   ├── Sem15.csv, Sem16.csv, …     (Trade MKT data)             │
                │   ├── Tiendas-promotor-supervisor.csv                          │
                │   ├── floor-share/  (Trade MKT floor share)                    │
                │   └── cuadro-basico-ventas/                                    │
                │       ├── Cuadros-basicos-*.csv     (catálogo CB)              │
                │       └── Clasificacion-clientes-*.csv  (cliente → vendedor)   │
                └────────────────────────────────────────────────────────────────┘
                                              │
                          ┌───────────────────┴───────────────────┐
                          ▼                                       ▼
                  ┌────────────────┐                     ┌──────────────────┐
                  │ Trade MKT (/)  │                     │ Ventas (/ventas) │
                  │                │                     │                  │
                  │ Lee CSVs       │                     │ Lee CB y         │
                  │ semanales      │                     │ clasificación    │
                  │                │                     │                  │
                  └────────────────┘                     └────────┬─────────┘
                                                                  │
                                                                  ▼
                                                  ┌─────────────────────────────┐
                                                  │ Excel SharePoint            │
                                                  │ "FC + BO 2026 - Hanna.xlsx" │
                                                  │                             │
                                                  │ Office Script lee FC+BO,    │
                                                  │ filtra contra CB y          │
                                                  │ POSTea a /api/ventas        │
                                                  └──────────────┬──────────────┘
                                                                 ▼
                                                       ventas.json (Vercel Blob)
```

---

## Estructura del repo

```
app/
  layout.tsx                  Shell HTML
  page.tsx                    Trade MKT dashboard (vanilla JS + Chart.js)
  ventas/                     Cumplimiento CB Ventas (Next.js + React + Recharts)
    layout.tsx
    page.tsx
  api/
    data/route.ts             Dataset Trade MKT (JSON crudo desde Drive)
    refresh/route.ts          Invalida caches de ambos dashboards
    ventas/route.ts           POST: recibe FC+BO del Office Script; GET: metadata
    cb-pairs/route.ts         Lista de pares (cliente|sku) del CB; la usa el Office Script

components/
  Dashboard.tsx               Componente React del dashboard de Ventas

lib/
  drive.ts                    Cliente Google Drive (service account)
  parse.ts                    Parser CSV + normalización + clasificación SKU (Trade MKT)
  parse-floorshare.ts         Parser de Floor Share
  dataset.ts                  Trade MKT: junta CSVs y arma el dataset
  dataset-floorshare.ts       Floor Share: idem
  cb-drive.ts                 Ventas: lee CB + clasificación de Drive dinámicamente
  data.ts                     Loaders unificados (CB, clasificación, ventas)
  storage.ts                  Vercel Blob para ventas.json
  ingest-ventas.ts            Procesa payload FC+BO del Office Script
  cors.ts                     Helper CORS para que el Office Script pueda fetchear
  types.ts                    Tipos compartidos

public/
  dashboard.js                Trade MKT: render del dashboard
  dashboard.css               Estilos del Trade MKT

office-scripts/
  sync-ventas.ts              Office Script que corre dentro del Excel de Hanna

apps-script/
  code.gs                     Trigger Google Drive → /api/refresh

docs/
  ventas-dashboard.md         Detalles del dashboard de Ventas
  office-scripts.md           Setup del Office Script en Excel
  power-automate.md           [Deprecado] Flow original de Power Automate
```

---

## Dashboard Trade Marketing (`/`)

Dashboard de cumplimiento de CB por tienda + Floor Share por categoría. Vanilla JS con Chart.js.

### Pestañas

- **Cumplimiento CB**: % de cumplimiento de Cuadro Básico / Infaltables / Estratégico por semana, tienda, promotor, supervisor, cliente/cadena, categoría.
- **Floor Share**: % de participación de marca Drean en el anaquel por categoría.

### KPIs

```
Cumplimiento CB         = Σ realCB / Σ targetCB
Cumplimiento Infaltable = Σ realInf / Σ targetInf
Cumplimiento Estratégico= Σ (realCB - realInf) / Σ (targetCB - targetInf)
```

Clasificación por fila `(sku, tienda)`:

```
targetCB - targetInf == 0  →  Infaltable
targetCB - targetInf  > 0  →  Estratégico
```

### Filtros

- Mes, **Semana (multi-select)**, Categoría, Supervisor, Promotor, Cliente/Cadena, Tienda.

### Cards (4)

- `% Cuadro Básico` (featured, gradient navy + coral)
- `% Infaltables`
- `% Estratégico`
- `Tiendas`

### Formato de los CSVs

#### Semanales

Nombre: cualquier cosa que contenga el número de semana (`15.csv`, `Sem15.csv`, `semana-15.csv`, etc.). Encoding: UTF-8 o Windows-1252 (autodetecta). Separador: `;`, `\t` o `,` (autodetecta).

Columnas:

```
DIVISION; CATEGORIA; SKU MABE; CLIENTE/CADENA; TIENDA HMPDV;
targetCB; realCB; %cumpCB; targetInf; realInf; %cumpInf
```

Filas con `TIENDA HMPDV = "Total"` o `SKU MABE = "Total"` se ignoran. Filas con `targetCB = targetInf = 0` se ignoran.

#### Contactos (tiendas → promotor/supervisor)

Nombre: matchea `tiendas-promotor-supervisor`, `promotor-supervisor`, `contactos` o `maestro-tiendas`. Columnas:

```
CANAL; CADENA; FORMATO; N TIENDA; TIENDA; PROMOTOR; SUPERVISOR;
TIPO DE TIENDA; EMAIL_PROMOTOR
```

Join con los CSVs de datos por **número de tienda** (prefijo numérico de `TIENDA HMPDV`).

**Aliases de promotores**: nombres con variantes "First Last" / "Last First" se unifican vía `PROMOTOR_ALIASES_RAW` en `lib/parse.ts`. Agregar nuevos pares ahí si aparecen duplicados en el dropdown.

#### Floor Share

Van en la subcarpeta `floor-share/` dentro de "Tablero CB". Convención de nombre: **`YYYY-MM_CATEGORIA.csv`** (ej: `2026-04_LAVADO.csv`).

---

## Dashboard Cumplimiento CB — Ventas (`/ventas`)

Dashboard de cumplimiento de CB por cliente, basado en data de facturación (FC) y backorder (BO) que vive en un Excel de SharePoint.

Ver detalles en [docs/ventas-dashboard.md](docs/ventas-dashboard.md).

### Pipeline (resumen)

1. Excel `FC + BO 2026 - Hanna.xlsx` en SharePoint con Power Query alimentando tablas FC y BO.
2. Office Script (`office-scripts/sync-ventas.ts`) corre dentro del Excel, lee las tablas, filtra contra el CB y POSTea a `/api/ventas`.
3. El server persiste `ventas.json` en Vercel Blob.
4. El dashboard `/ventas` lee CB + clasificación de Drive (dinámico) y ventas.json del blob; los une y renderiza.

### Setup operativo

Ver [docs/office-scripts.md](docs/office-scripts.md) para instalar el Office Script en el Excel de Hanna paso a paso.

---

## Setup técnico (común a ambos dashboards)

### 1. Service account de Google Cloud

1. [console.cloud.google.com](https://console.cloud.google.com/) → crear proyecto.
2. **APIs & Services → Library** → habilitar **Google Drive API**.
3. **APIs & Services → Credentials → Create credentials → Service account**:
   - Nombre: `cb-dashboard-reader`
4. Service account → pestaña **Keys → Add key → Create new key → JSON**. Descargar el `.json`.
5. Copiar el `client_email` del JSON y compartir la carpeta de Drive **"Tablero CB"** con permiso de **Viewer**.

### 2. Vercel — Environment Variables

| Variable | Para qué | Ejemplo |
|---|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Auth contra Drive | JSON entero de la service account |
| `DRIVE_FOLDER_ID` | Carpeta padre de Tablero CB | `1J7NORR3iwn...` |
| `DRIVE_CB_FOLDER_ID` | (opcional) Override directo al folder de CB Ventas. Sino busca subfolder `cuadro-basico-ventas` dentro de DRIVE_FOLDER_ID | `1ABC...` |
| `REFRESH_SECRET` | Webhook que invalida cache (lo usa Apps Script y manualmente) | random string |
| `REFRESH_SECRET1` | Auth para POST `/api/ventas` (Office Script). **Distinto** del anterior por razones históricas | random string |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob (lo provee Vercel automáticamente al crear el blob store) | (auto) |

### 3. Apps Script (refresh automático de Trade MKT)

1. [script.google.com](https://script.google.com) → **New project**.
2. Pegar `apps-script/code.gs` en `Code.gs`.
3. **Project Settings → Script properties**:
   - `VERCEL_REFRESH_URL` = `https://<tu-app>.vercel.app/api/refresh`
   - `REFRESH_SECRET` = mismo valor que Vercel
   - `DRIVE_FOLDER_ID` = `1J7NORR3iwn...`
4. Ejecutar `installTrigger` una vez (pide autorización).

Cada 5 min Apps Script chequea si la carpeta cambió y, si sí, llama al webhook.

### 4. Office Script (refresh manual de /ventas)

Ver [docs/office-scripts.md](docs/office-scripts.md). Setup ~10 min en el Excel de Hanna.

---

## Endpoints

| Método | Path | Auth | Para qué |
|---|---|---|---|
| GET | `/` | — | Dashboard Trade Marketing (HTML) |
| GET | `/ventas` | — | Dashboard Cumplimiento CB Ventas (HTML) |
| GET | `/api/data` | — | Dataset Trade MKT (JSON crudo, debug) |
| POST/GET | `/api/refresh` | `?secret=$REFRESH_SECRET` | Invalida cache de Drive + revalida páginas |
| POST | `/api/ventas` | `x-refresh-secret: $REFRESH_SECRET1` | Office Script POSTea aquí el payload FC+BO |
| GET | `/api/ventas` | `x-refresh-secret: $REFRESH_SECRET1` | Metadata de la última sync (debug) |
| GET | `/api/cb-pairs` | `?secret=$REFRESH_SECRET1` | Lista de `cliente|sku` del CB. La consume el Office Script para pre-filtrar |

## Desarrollo local

```bash
npm install
cp .env.example .env.local
# editar .env.local con las credenciales
npm run dev
```

Abrir <http://localhost:3000> (Trade MKT) o <http://localhost:3000/ventas>.

En local, si no hay `GOOGLE_SERVICE_ACCOUNT_JSON` configurado, `/ventas` cae a los JSONs estáticos `data/cuadro-basico.json` y `data/clasificacion-clientes.json` (snapshot de abril 2026).

## Forzar refresh inmediato

Cuando actualizás archivos en Drive o el catálogo del CB, los cambios tardan hasta 5 min en aparecer (cache TTL). Para forzar:

```bash
curl "https://cuadros-basicos.vercel.app/api/refresh?secret=$REFRESH_SECRET"
```

Después del refresh, hacer **hard refresh** del browser (Ctrl+Shift+R) para evitar cache del lado del cliente.
