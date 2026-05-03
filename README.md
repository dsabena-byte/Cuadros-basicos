# Dashboard Cumplimiento Cuadros Básicos

Dashboard que se actualiza automáticamente cuando se suben CSVs nuevos a una
carpeta de Google Drive. Calcula los KPIs de cumplimiento de **Cuadro Básico**,
**Infaltables** y **Estratégicos** por cliente, tienda, supervisor y promotor.

```
Drive (carpeta "Tablero CB")
        │
        ├─ 15.csv, 16.csv, 17.csv, …       (datos semanales — se acumulan)
        └─ Tiendas-promotor-supervisor.csv (mapeo de tiendas)
                    │
                    │   onChange (Apps Script)
                    ▼
        POST /api/refresh   →   Vercel revalida /api/data
                    │
                    ▼
                Next.js page (lee Drive, arma dataset, sirve dashboard)
```

## Estructura

```
app/
  layout.tsx                   Shell HTML
  page.tsx                     Shell HTML, fetch del dataset desde el cliente
  api/data/route.ts            JSON crudo del dataset (debug / consumo externo)
  api/refresh/route.ts         Webhook con secret → revalida la home

lib/
  drive.ts                     Cliente Drive (service account)
  parse.ts                     Parser CSV + normalización + clasificación SKU
  dataset.ts                   Junta CSVs de la carpeta y arma el dataset

public/
  dashboard.js                 JS del dashboard (Chart.js + render)
  dashboard.css                Estilos

apps-script/
  code.gs                      Trigger que avisa a Vercel cuando hay cambios
```

## KPIs

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

## Setup

### 1. Service account de Google Cloud

1. Entrá a [console.cloud.google.com](https://console.cloud.google.com/) y creá
   un proyecto nuevo (o usá uno existente).
2. **APIs & Services → Library** → habilitá **Google Drive API**.
3. **APIs & Services → Credentials → Create credentials → Service account**:
   - Nombre: `cb-dashboard-reader`
   - Rol: ninguno (lectura via share)
4. Una vez creada, abrí la service account → pestaña **Keys → Add key →
   Create new key → JSON**. Descargá el archivo `.json`.
5. Copiá el `client_email` que aparece en el JSON (algo como
   `cb-dashboard-reader@tu-proyecto.iam.gserviceaccount.com`) y compartí la
   carpeta de Drive **"Tablero CB"** con ese email, permiso de **Viewer**.

### 2. Vercel

1. Importá el repo en Vercel (`vercel.com/new`).
2. En **Settings → Environment Variables** agregá:

   | Variable | Valor |
   |---|---|
   | `GOOGLE_SERVICE_ACCOUNT_JSON` | Pegá el JSON entero de la service account, en una sola línea |
   | `DRIVE_FOLDER_ID` | `1J7NORR3iwnjbKrIAbjB79N7h5klGFYR3` |
   | `REFRESH_SECRET` | Cualquier string aleatorio largo (lo vas a reusar en Apps Script) |

3. Deploy.

### 3. Apps Script (trigger de Drive → Vercel)

1. Abrí [script.google.com](https://script.google.com) → **New project**.
2. Pegá el contenido de `apps-script/code.gs` en `Code.gs`.
3. **Project Settings → Script properties → Add script property** (tres
   propiedades):

   | Property | Value |
   |---|---|
   | `VERCEL_REFRESH_URL` | `https://<tu-app>.vercel.app/api/refresh` |
   | `REFRESH_SECRET` | Mismo valor que en Vercel |
   | `DRIVE_FOLDER_ID` | `1J7NORR3iwnjbKrIAbjB79N7h5klGFYR3` |

4. En el editor, ejecutá **`installTrigger`** una vez. Te va a pedir
   autorización — autorizá con tu cuenta `dsabena@gmail.com`.
5. A partir de ahí, cada 5 minutos el script chequea si la carpeta cambió y, si
   hay novedad, llama al webhook `/api/refresh`. El dashboard queda actualizado.

> Si querés probar manualmente, ejecutá `refreshNow` desde el editor de Apps
> Script — fuerza un refresh inmediato.

## Formato de los archivos

### CSVs semanales

Nombre: cualquier cosa que contenga el número de semana (`15.csv`, `Sem15.csv`,
`semana-15.csv`, etc.). Encoding: UTF-8 o Windows-1252 (se autodetecta).
Separador: `;`, `\t` o `,` (autodetecta).

Columnas requeridas:

```
DIVISION; CATEGORIA; SKU MABE; CLIENTE/CADENA; TIENDA HMPDV;
targetCB; realCB; %cumpCB; targetInf; realInf; %cumpInf
```

Las filas con `TIENDA HMPDV = "Total"` o `SKU MABE = "Total"` se ignoran. Las
filas con `targetCB = targetInf = 0` se ignoran.

### Archivo de contactos

Nombre: cualquier archivo cuyo nombre matchee `tiendas-promotor-supervisor`,
`promotor-supervisor`, `contactos` o `maestro-tiendas`. Columnas:

```
CANAL; CADENA; FORMATO; N TIENDA; TIENDA; PROMOTOR; SUPERVISOR;
TIPO DE TIENDA; EMAIL_PROMOTOR
```

El join con los CSVs de datos se hace por **número de tienda** (el prefijo
numérico de `TIENDA HMPDV`).

## Desarrollo local

```bash
npm install
cp .env.example .env.local
# editar .env.local con las credenciales
npm run dev
```

Abrí <http://localhost:3000>.

## Endpoints

- `GET /` — dashboard HTML.
- `GET /api/data` — dataset JSON crudo (útil para debug).
- `POST /api/refresh` — fuerza revalidación. Header `x-refresh-secret: <REFRESH_SECRET>`.
