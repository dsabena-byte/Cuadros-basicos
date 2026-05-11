# Office Script: reemplazo de Power Automate

## Por qué

El connector "Excel Online (Business)" de Power Automate tiene un **cap
de 5000 filas** que ningún tier de licencia levanta. El Excel productivo
tiene 35K+ filas en FC sola, así que estábamos perdiendo ~85% de la data.

**Office Scripts corren dentro de Excel** (motor JS del propio Excel
Online), por lo tanto no tienen ese cap. Pueden además hacer `fetch()`
HTTP a APIs externas — el script puede leer todas las filas, filtrarlas
contra el catálogo del CB y POSTearlas al dashboard en un solo paso.

Sin licencia Premium, sin App Registration en Azure AD, sin IT.

## Pre-requisitos

- Excel Online (en navegador, **no en la app de escritorio**). Office
  Scripts no corren en la app de escritorio.
- Una cuenta Microsoft 365 con permiso de **Run Office Scripts** (Business
  Basic/Standard/Premium, E3, E5 — incluido en la mayoría de los tiers
  corporativos).
- El secret `REFRESH_SECRET1` (el mismo que ya usa Power Automate). Si
  no lo tenés, está en Vercel → Project Settings → Environment Variables.

## Instalación (la hace Hanna, una sola vez — ~10 min)

1. Abrir el Excel `FC + BO 2026 - Hanna.xlsx` desde SharePoint **en el
   navegador** (no en Excel de escritorio).
2. Cinta superior → **Automate** → **New Script**.
   - Si no aparece "Automate", quiere decir que la licencia no tiene
     Office Scripts habilitado. Confirmar con el admin de M365.
3. Se abre el editor (Code Editor) al costado.
4. Borrar el código placeholder y pegar todo el contenido de
   [`office-scripts/sync-ventas.ts`](../office-scripts/sync-ventas.ts).
5. Editar el bloque `CONFIG` arriba del archivo:

   ```ts
   const CONFIG = {
     apiBase: "https://cuadros-basicos.vercel.app", // confirmar URL real
     secret: "PEGAR_REFRESH_SECRET1_ACA",            // pegar el valor real
     tableNameFC: "FC",                              // nombre interno de la tabla
     tableNameBO: "BO",
   };
   ```

   **Cómo conseguir el nombre interno de la tabla**: clickear en cualquier
   celda DE LA TABLA → cinta **Table Design** → leer el campo *Table Name*
   (ej. `Table1`, `FC_Data`, etc.). Suele NO ser el mismo que el nombre
   de la solapa.

6. **Save Script** → ponerle nombre `Sync Dashboard Ventas`.

## Mapeo de columnas

El bloque `COLUMN_MAPPING` define cómo el script encuentra cada campo
mirando los headers del Excel. Para cada campo hay una lista de
candidatos — el primero que matchee se usa.

**Si el script tira error "No encontré la columna X"**: copiar el listado
de headers que devuelve el error y agregar el header real del Excel
como nuevo candidato. Por ejemplo si en FC el campo `vendedor` se llama
`Repr. Comercial` en lugar de `Ejecutivo de Venta`:

```ts
vendedor: ["Ejecutivo de Venta", "Ejecutivo Venta Descripción", "Repr. Comercial", "Vendedor"],
```

## Correr el script

### Manual (recomendado al principio)

1. En el Excel → cinta **Automate** → click en `Sync Dashboard Ventas`
   → botón **Run**.
2. El panel de la derecha muestra el log (`Sync OK: {...}`). Tarda ~30 seg.
3. El dashboard https://cuadros-basicos.vercel.app se actualiza al toque.

### Con botón en la hoja (más cómodo para Hanna)

1. Cinta **Insert** → **Shapes** → elegí un rectángulo, dibujalo en la hoja.
2. Click derecho en el shape → **Assign Script** → elegir `Sync Dashboard Ventas`.
3. Click derecho de nuevo → **Edit Text** → ponerle "Actualizar Dashboard".
4. Save el Excel.

Cada mañana Hanna abre el Excel, clickea el botón, espera 30 seg, listo.

## Automatización opcional (sin Hanna)

Power Automate tiene una acción **"Run script"** (Excel Online connector)
que dispara un Office Script en un schedule. Es Standard en muchos tiers,
Premium en otros. Si está disponible:

1. Crear un flow nuevo: **Recurrence** (Daily, 9 AM) → **Run script** →
   elegir el workbook y el script `Sync Dashboard Ventas`.
2. Listo. Corre solo todos los días.

Si "Run script" pide Premium, dejar el modo manual con botón — funciona
igual.

## Troubleshooting

### "Unauthorized" en el log

El `secret` del CONFIG no matchea `REFRESH_SECRET1`. Verificar en Vercel
y volver a pegarlo.

### "No encontré la columna X"

Headers del Excel cambiaron. Mirar el log para ver qué headers tiene el
Excel y agregar el correcto al `COLUMN_MAPPING` correspondiente.

### "Después del filtro CB no quedó ninguna fila"

El normalizado de cliente o el SKU no matchea. Verificar:
- Que el catálogo CB esté cargado (`/cuadro-basico`).
- Que los nombres de cliente en el Excel sean los mismos (al menos en
  algún cliente).

### El payload es muy grande (>4MB) → error 413

No debería pasar después del filtro CB (debería bajar de 35K a ~5K
filas). Si pasa, la lista del CB creció mucho. Próximo paso sería
chunkear el POST.

## Apagar Power Automate

Una vez que el script funciona en producción (ver que el dashboard
muestra las 35K+ filas reales en lugar de las 5K capadas), apagar el
flow viejo:

1. Power Automate → My flows → buscar el flow de sync FC+BO.
2. Hacer **Turn off** (no borrar, queda como backup).
