// Microsoft Graph API helper para leer tablas Excel de SharePoint sin pasar
// por Power Automate (que cap a 5K filas en el connector de Excel). Usa
// OAuth client credentials flow contra Azure AD.
//
// Env vars necesarias (configurar en Vercel → Project Settings → Environment Variables):
//   GRAPH_TENANT_ID      ← Directory (tenant) ID de Azure AD
//   GRAPH_CLIENT_ID      ← Application (client) ID de la App Registration
//   GRAPH_CLIENT_SECRET  ← Client secret value (sólo se ve al crearlo)
//   GRAPH_SITE_HOSTNAME  ← ej. "mabe.sharepoint.com"
//   GRAPH_SITE_PATH      ← ej. "/sites/CO-ARCOMERCIAL"
//   GRAPH_FILE_PATH      ← ej. "General/7. Analistas de Ventas/1 - TABLEROS/Tablero - archivos para actualizar/FC + BO 2026 - Hanna.xlsx"
//   GRAPH_TABLE_FC       ← nombre interno de la tabla FC en Excel
//   GRAPH_TABLE_BO       ← nombre interno de la tabla BO en Excel

const GRAPH = "https://graph.microsoft.com/v1.0";

type TokenCache = { token: string; expiresAt: number };
let cachedToken: TokenCache | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }
  const tenant = required("GRAPH_TENANT_ID");
  const clientId = required("GRAPH_CLIENT_ID");
  const clientSecret = required("GRAPH_CLIENT_SECRET");

  const res = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Token request failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

function required(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
}

async function graphFetch<T>(path: string): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${GRAPH}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Graph ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

type Site = { id: string };
type DriveItem = { id: string; parentReference: { driveId: string } };

async function resolveFile(): Promise<{ driveId: string; itemId: string }> {
  const hostname = required("GRAPH_SITE_HOSTNAME");
  const sitePath = required("GRAPH_SITE_PATH");
  const filePath = required("GRAPH_FILE_PATH");

  const site = await graphFetch<Site>(
    `/sites/${hostname}:${sitePath}`,
  );
  const item = await graphFetch<DriveItem>(
    `/sites/${site.id}/drive/root:/${encodeURI(filePath)}`,
  );
  return { driveId: item.parentReference.driveId, itemId: item.id };
}

// Lee una tabla completa de un Excel paginando 1000 filas por request hasta
// agotar el contenido. Sin tope de 5K como el connector de Power Automate.
//
// Devuelve un array de objetos {columnHeader: value}, igual que lo que daba
// el "List rows present in a table" — así los mappings de las Selects de
// Power Automate se pueden reusar sin cambios.
export async function getExcelTableRows(
  tableName: string,
): Promise<Array<Record<string, unknown>>> {
  const { driveId, itemId } = await resolveFile();

  // Headers de la tabla (los pedimos una vez).
  const headerRange = await graphFetch<{ values: unknown[][] }>(
    `/drives/${driveId}/items/${itemId}/workbook/tables('${encodeURIComponent(tableName)}')/headerRowRange?$select=values`,
  );
  const headers = (headerRange.values[0] ?? []).map((h) => String(h));

  // dataBodyRange contiene todas las filas sin el header. Lo bajamos en
  // chunks contiguos vía rangos de celdas, así el JSON no explota.
  const dataBody = await graphFetch<{ rowCount: number; columnCount: number; address: string }>(
    `/drives/${driveId}/items/${itemId}/workbook/tables('${encodeURIComponent(tableName)}')/dataBodyRange?$select=rowCount,columnCount,address`,
  );

  const rows: Array<Record<string, unknown>> = [];
  if (dataBody.rowCount === 0) return rows;

  // El address viene como 'Sheet1!A2:Z3500'. Extraemos sheet y range para
  // poder pedir slices.
  const [sheet, rangeRef] = dataBody.address.split("!");
  const match = rangeRef.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
  if (!match) {
    throw new Error(`No pude parsear el rango de la tabla ${tableName}: ${dataBody.address}`);
  }
  const [, startCol, startRowStr, endCol] = match;
  const startRow = Number(startRowStr);
  const endRow = startRow + dataBody.rowCount - 1;

  const CHUNK = 5000;
  for (let r = startRow; r <= endRow; r += CHUNK) {
    const chunkEnd = Math.min(r + CHUNK - 1, endRow);
    const address = `${sheet}!${startCol}${r}:${endCol}${chunkEnd}`;
    const chunk = await graphFetch<{ values: unknown[][] }>(
      `/drives/${driveId}/items/${itemId}/workbook/worksheets('${encodeURIComponent(sheet)}')/range(address='${encodeURIComponent(address)}')?$select=values`,
    );
    for (const valuesRow of chunk.values) {
      const obj: Record<string, unknown> = {};
      headers.forEach((h, i) => {
        obj[h] = valuesRow[i];
      });
      rows.push(obj);
    }
  }
  return rows;
}
