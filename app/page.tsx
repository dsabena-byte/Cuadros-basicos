import Script from "next/script";
import { buildDataset } from "@/lib/dataset";
import type { DataRow } from "@/lib/parse";
import type { FloorShareDataset } from "@/lib/dataset-floorshare";

export const dynamic = "force-static";
export const revalidate = 3600;

function escapeForScript(value: string): string {
  return value.replace(/<\/script/gi, "<\\/script");
}

function EmptyState({ message }: { message: string }) {
  return (
    <>
      <h1>📊 Dashboard Cumplimiento Cuadros Básicos</h1>
      <div className="sub">Análisis multi-semana · CB · Infaltables · Estratégico</div>
      <div className="card empty">{message}</div>
    </>
  );
}

export default async function Page() {
  const folderId = process.env.DRIVE_FOLDER_ID;
  if (!folderId) {
    return (
      <EmptyState message="DRIVE_FOLDER_ID no está configurado. Definí la variable de entorno en Vercel." />
    );
  }

  let rows: DataRow[] = [];
  let semanas: number[] = [];
  let floorShare: FloorShareDataset | null = null;
  let errorMessage: string | null = null;

  try {
    const dataset = await buildDataset(folderId);
    rows = dataset.rows;
    semanas = dataset.semanas;
    floorShare = dataset.floorShare;
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Error desconocido al leer Drive";
  }

  if (errorMessage) {
    return <EmptyState message={`⚠️ ${errorMessage}`} />;
  }

  if (rows.length === 0 && (!floorShare || floorShare.rows.length === 0)) {
    return (
      <EmptyState message="📁 No se encontraron CSVs con datos en la carpeta de Drive." />
    );
  }

  const preloadedScript =
    `window.__PRELOADED_DATA__=${escapeForScript(JSON.stringify(rows))};` +
    `window.__PRELOADED_SEMANAS__=${escapeForScript(JSON.stringify(semanas))};` +
    `window.__PRELOADED_FLOORSHARE__=${escapeForScript(JSON.stringify(floorShare))};`;

  return (
    <>
      <h1>📊 Dashboard Cumplimiento Cuadros Básicos</h1>
      <div className="sub">Análisis multi-semana · CB · Infaltables · Estratégico · Floor Share</div>

      <div className="tabs" role="tablist">
        <button className="tab active" data-tab="cb" role="tab" aria-selected="true">
          Cumplimiento CB
        </button>
        <button className="tab" data-tab="floorshare" role="tab" aria-selected="false">
          Floor Share
        </button>
      </div>

      <section id="tab-cb" className="tab-panel active">
        <div className="card upload-card">
          <div className="upload-row">
            <input type="file" id="fileInput" accept=".csv" multiple style={{ display: "none" }} />
            <button className="upload-btn">+ Sumar semana(s)</button>
            <button className="upload-btn" id="btnExport" style={{ background: "#10b981" }}>
              📥 Exportar HTML con datos
            </button>
            <div className="upload-info" id="dataInfo"></div>
            <div id="semanasBadges" style={{ marginLeft: "auto" }}></div>
          </div>
        </div>

        <div className="card">
          <div className="filters">
            <div>
              <label>Mes</label>
              <select id="fMes">
                <option value="">Todos</option>
              </select>
            </div>
            <div>
              <label>Semana</label>
              <select id="fSemana">
                <option value="">Todos</option>
              </select>
            </div>
            <div>
              <label>Categoría</label>
              <select id="fDivision">
                <option value="">Todos</option>
              </select>
            </div>
            <div>
              <label>Supervisor</label>
              <select id="fSupervisor">
                <option value="">Todos</option>
              </select>
            </div>
            <div>
              <label>Promotor</label>
              <select id="fPromotor">
                <option value="">Todos</option>
              </select>
            </div>
            <div>
              <label>Cliente / Cadena</label>
              <select id="fCliente">
                <option value="">Todos</option>
              </select>
            </div>
            <div>
              <label>Tienda</label>
              <select id="fTienda">
                <option value="">Todos</option>
              </select>
            </div>
            <button className="reset-btn" id="btnReset">
              ↺ Limpiar
            </button>
          </div>
        </div>

        <div id="content"></div>
      </section>

      <section id="tab-floorshare" className="tab-panel" hidden>
        <div className="card">
          <div className="filters filters-fs">
            <div>
              <label>Mes</label>
              <select id="fsMes"><option value="">Todos</option></select>
            </div>
            <div>
              <label>Cliente / Cadena</label>
              <select id="fsCliente"><option value="">Todos</option></select>
            </div>
            <div>
              <label>Categoría</label>
              <select id="fsCategoria"><option value="">Todas</option></select>
            </div>
            <div>
              <label>Subcategoría</label>
              <select id="fsSubcategoria"><option value="">Todas</option></select>
            </div>
            <div>
              <label>Tienda</label>
              <select id="fsTienda"><option value="">Todas</option></select>
            </div>
            <div>
              <label>Supervisor</label>
              <select id="fsSupervisor"><option value="">Todos</option></select>
            </div>
            <div>
              <label>Promotor</label>
              <select id="fsPromotor"><option value="">Todos</option></select>
            </div>
            <button className="reset-btn" id="fsBtnReset">↺ Limpiar</button>
          </div>
        </div>

        <div id="fsContent"></div>
      </section>

      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js"
        strategy="beforeInteractive"
      />
      <Script
        id="preload-data"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: preloadedScript }}
      />
      <Script src="/dashboard.js" strategy="afterInteractive" />
    </>
  );
}
