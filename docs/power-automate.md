# Conexión SharePoint → dashboard (Power Automate)

El dashboard lee `ventas.json` desde Vercel Blob (en prod) o desde
`/data/ventas.json` (en dev). El flow de Power Automate se encarga de
leer el Excel del SharePoint, armar el payload y postearlo al endpoint
`POST /api/ventas` con un secret compartido.

## Origen

- **Sitio:** `https://mabe.sharepoint.com/sites/CO-ARCOMERCIAL`
- **Ruta:** `General > 7. Analistas de Ventas > 1 - TABLEROS > Tablero - archivos para actualizar`
- **Archivo:** `FC + BO 2026 - Hanna.xlsx`
- **Solapas:** `BO` (back order) y `FC` (facturación), ambas formateadas como tabla

Las dos solapas comparten el campo **Documento de Ventas**: un mismo pedido
aparece simultáneamente en BO (lo que falta despachar) y en FC (lo ya
facturado). Las unidades en BO + FC para `(documentoVentas, sku)` reconstruyen
el total del pedido.

## Modelo de datos esperado

El dashboard considera un SKU **cumplido** para un cliente si tiene al menos
1 unidad en FC o en BO en alguna fila. La métrica `% CB` se calcula a nivel
`(cliente, sku)`, no a nivel pedido — pero las unidades FC/BO que se muestran
en el detalle vienen sumadas de todos los pedidos.

## Endpoint

```
POST https://<tu-app>.vercel.app/api/ventas
Headers:
  Content-Type: application/json
  x-refresh-secret: <REFRESH_SECRET1>     ← variable de entorno en Vercel
```

### Body

```json
{
  "generatedAt": "2026-05-08T13:42:00Z",
  "fc": [
    {
      "documentoVentas": "80012345",
      "cliente": "ELECTRONICA MEGATONE SRL",
      "sku": "LCFDR0608LB0",
      "unidades": 12,
      "fecha": "2026-05-02",
      "vendedor": "CUENTAS CLAVE RETAIL"
    }
  ],
  "bo": [
    {
      "documentoVentas": "80012345",
      "cliente": "ELECTRONICA MEGATONE SRL",
      "sku": "LCFDR0608LB0",
      "unidades": 4,
      "fecha": "2026-05-02",
      "vendedor": "CUENTAS CLAVE RETAIL"
    }
  ]
}
```

Notas:

- `generatedAt` es opcional; si no viene, el server usa la hora del request.
  Lo recomendable es que el flow mande la fecha de la última actualización
  del Excel.
- `fecha` puede venir como `YYYY-MM-DD`, ISO completo o `DD/MM/YYYY`. El
  server normaliza y deriva el `mes` solo.
- En el ejemplo, el pedido `80012345` para Megatone del SKU `LCFDR0608LB0`
  tiene **12 u facturadas** (FC) + **4 u pendientes** (BO) = 16 u total.
- Si un pedido está 100% facturado va sólo en `fc`; si está 100% pendiente
  va sólo en `bo`; si está partido va en las dos con el mismo
  `documentoVentas + sku`.

### Respuesta

```json
{
  "ok": true,
  "generatedAt": "2026-05-08T13:42:00Z",
  "rows": 4321,
  "fc": 2987,
  "bo": 1334,
  "pedidos": 1058,
  "blobUrl": "https://....public.blob.vercel-storage.com/ventas.json"
}
```

`blobUrl` aparece sólo en producción (cuando hay `BLOB_READ_WRITE_TOKEN`).

### Errores

- `401 Unauthorized` — falta el header `x-refresh-secret` o no matchea.
- `400 Bad Request` — el body no es JSON válido o no tiene `fc` y `bo`.
- `422 Unprocessable Entity` — alguna fila tiene campos inválidos. La
  respuesta incluye `details` con los primeros 20 errores.

## Esqueleto del flow

1. **Trigger:** *When a file is modified* sobre el archivo
   `FC + BO 2026 - Hanna.xlsx` en SharePoint.
2. **List rows present in a table** (Excel Online for Business): una vez
   sobre la tabla `BO`, otra vez sobre la tabla `FC`.
3. **Select** (transformación): mapear las columnas del Excel a las del
   payload. Mínimo:

   | Excel              | JSON              |
   |--------------------|-------------------|
   | Documento de Ventas| `documentoVentas` |
   | Cliente            | `cliente`         |
   | Material / SKU     | `sku`             |
   | Cantidad / Unidades| `unidades`        |
   | Fecha              | `fecha`           |
   | Vendedor           | `vendedor`        |

4. **Compose** el body con los dos arrays:

   ```
   {
     "generatedAt": "@{utcNow()}",
     "fc": @{outputs('Select_FC')},
     "bo": @{outputs('Select_BO')}
   }
   ```

5. **HTTP** action (POST) al endpoint con el header `x-refresh-secret`.
6. (Opcional) **Condition** sobre el status code para mandar mail si
   falla.

## Variables de entorno en Vercel

| Variable                  | Para qué                                         |
|---------------------------|--------------------------------------------------|
| `REFRESH_SECRET1`         | Secret compartido con Power Automate (header `x-refresh-secret`). El "1" es porque `REFRESH_SECRET` ya estaba ocupado en este proyecto Vercel. |
| `BLOB_READ_WRITE_TOKEN`   | Token de Vercel Blob (lo crea Vercel automáticamente cuando agregás un Blob store al proyecto) |

## Probar localmente

```bash
# server
REFRESH_SECRET1=dev-secret npm run dev

# en otra terminal
curl -X POST http://localhost:3000/api/ventas \
  -H "Content-Type: application/json" \
  -H "x-refresh-secret: dev-secret" \
  -d @docs/sample-payload.json
```

Sin `BLOB_READ_WRITE_TOKEN`, `writeVentas` escribe directo a
`data/ventas.json` y refrescás la home.
