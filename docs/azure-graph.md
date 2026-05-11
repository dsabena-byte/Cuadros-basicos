# Vercel Cron + Microsoft Graph (reemplazo de Power Automate)

El conector de Excel Online (Business) de Power Automate tiene un **cap
de 5000 filas** que Microsoft no levanta con ningún tier de licencia.
Nuestro Excel productivo (`FC + BO 2026 - Hanna.xlsx`) tiene 35K+ filas
en FC sola, así que la única salida es leer el archivo directamente
contra Microsoft Graph API.

El cron `app/api/cron/sync-ventas` se dispara 1× por día (config en
`vercel.json`), se autentica con un App Registration de Azure AD,
baja las dos tablas (FC y BO) y delega el procesamiento al mismo
`ingestVentas` que ya usa POST /api/ventas.

## App Registration en Azure AD (lo gestiona IT/Mabe)

1. Microsoft Entra (Azure AD) → **App registrations** → **New registration**.
   - Name: `Cuadros-Basicos-Sync` (o similar).
   - Supported account types: **Single tenant**.
   - Redirect URI: dejarlo vacío.
2. Tras crear la app, copiar:
   - **Application (client) ID** → env var `GRAPH_CLIENT_ID`
   - **Directory (tenant) ID** → env var `GRAPH_TENANT_ID`
3. **Certificates & secrets** → **New client secret**. Anotar el
   *value* (se ve sólo una vez) → env var `GRAPH_CLIENT_SECRET`.
4. **API permissions** → **Add a permission** → Microsoft Graph →
   **Application permissions**. Elegí UNA de estas opciones:
   - Recomendado (mínimo privilegio): `Sites.Selected` — sólo da
     acceso a los sitios SharePoint que se autoricen explícitamente,
     más abajo.
   - Alternativa más amplia: `Files.Read.All` + `Sites.Read.All`.
5. **Grant admin consent for [tenant]** sobre los permisos elegidos.
6. Si se usó `Sites.Selected`: hay que autorizar la app sobre el sitio
   específico. El flujo es:
   - Conseguir el `site-id` del sitio. Se obtiene haciendo (con cuenta
     admin que tenga `Sites.Read.All`):
     ```
     GET https://graph.microsoft.com/v1.0/sites/mabe.sharepoint.com:/sites/CO-ARCOMERCIAL
     ```
     El campo `id` de la respuesta es el `site-id`.
   - Hacer PATCH para autorizar a la app:
     ```
     POST https://graph.microsoft.com/v1.0/sites/{site-id}/permissions
     {
       "roles": ["read"],
       "grantedToIdentities": [
         { "application": { "id": "<client-id>", "displayName": "Cuadros-Basicos-Sync" } }
       ]
     }
     ```
   - Esto se hace una sola vez con un admin de SharePoint.

## Env vars en Vercel

Project Settings → Environment Variables (en **Production** y **Preview**):

| Variable | Ejemplo | De dónde sale |
|---|---|---|
| `GRAPH_TENANT_ID` | `aabbccdd-1234-5678-90ab-cdef12345678` | App Registration |
| `GRAPH_CLIENT_ID` | `11223344-5566-7788-99aa-bbccddeeff00` | App Registration |
| `GRAPH_CLIENT_SECRET` | (valor del secret) | App Registration → Certificates & secrets |
| `GRAPH_SITE_HOSTNAME` | `mabe.sharepoint.com` | URL del SharePoint |
| `GRAPH_SITE_PATH` | `/sites/CO-ARCOMERCIAL` | URL del SharePoint |
| `GRAPH_FILE_PATH` | `General/7. Analistas de Ventas/1 - TABLEROS/Tablero - archivos para actualizar/FC + BO 2026 - Hanna.xlsx` | Path relativo dentro del Document Library |
| `GRAPH_TABLE_FC` | (nombre interno de la tabla FC) | En Excel: solapa FC → Table Design → Table Name |
| `GRAPH_TABLE_BO` | (nombre interno de la tabla BO) | Idem en solapa BO |
| `CRON_SECRET` | (string random) | Lo genera Vercel automáticamente al activar el cron; sino, generá uno propio con `openssl rand -hex 32` |

## Probar localmente

```bash
# .env.local con las vars
npm run dev

# en otra terminal
curl "http://localhost:3000/api/cron/sync-ventas?secret=$REFRESH_SECRET1"
```

El endpoint devuelve un JSON con métricas:

```json
{
  "ok": true,
  "rows": 8500,
  "fc": 4200,
  "bo": 4300,
  "received": { "fc": 35000, "bo": 12000 },
  "matchedCB": { "fc": 4200, "bo": 4300 },
  "skippedNoCB": 38500,
  "skippedInvalid": 0,
  "fetchMs": 45000,
  "blobUrl": "https://..."
}
```

## Disparar el cron manualmente

Desde el panel de Vercel → Project → Cron Jobs → Run now. O por curl
con cualquiera de los dos secrets:

```bash
# Con CRON_SECRET (header)
curl https://cuadros-basicos.vercel.app/api/cron/sync-ventas \
  -H "Authorization: Bearer $CRON_SECRET"

# Con REFRESH_SECRET1 (query string — más cómodo para tests manuales)
curl "https://cuadros-basicos.vercel.app/api/cron/sync-ventas?secret=$REFRESH_SECRET1"
```

## Apagar Power Automate

Una vez que el cron funciona y el dashboard muestra datos reales, ir al
flow `Sync FC+BO → Dashboard Ventas` en Power Automate y hacer
**Turn off**. Lo dejamos como backup; se puede borrar después.
