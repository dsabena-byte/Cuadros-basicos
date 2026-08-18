import "server-only";
import { cbTradeTools } from "./tools-cb-trade";
import { floorShareTools } from "./tools-floor-share";
import { sellInTools } from "./tools-sell-in";
import { tradeCruceTools } from "./tools-trade-cruce";
import type { ChatTool } from "./types";

// ============================================================================
// Registro de dashboards → sus tools + contexto para el copiloto.
// Agregar un dashboard nuevo = importar sus tools y sumar una entrada acá.
// El motor (/api/chat) y la UI (<DataChat>) NO cambian.
// ============================================================================

export interface DashboardChat {
  context: string;
  tools: ChatTool[];
  /** true = exige sesión de /ventas y acota la data al vendedor logueado. */
  requiereSesion?: boolean;
}

const BASE =
  "Respondé SIEMPRE en español, conciso y con números concretos. " +
  // --- Reglas duras: nacieron de errores reales en producción ---
  "NUNCA inventes datos ni afirmes nada que no venga de una tool. " +
  "En particular: no describas una evolución, tendencia o rango de meses/semanas si no llamaste a la tool de evolución correspondiente y te devolvió esa serie. " +
  "Si una tool te da UN agregado, es UN número — no lo presentes como si fuera una serie temporal ni le pongas un período que no vino en la respuesta. " +
  "Nunca nombres meses, semanas ni períodos que no aparezcan en lo que devolvió una tool. " +
  "Si te falta una tool para responder lo que preguntaron, decí qué parte no podés responder en vez de aproximar. " +
  // --- Nunca contestar 'no hay datos' sin agotar la búsqueda ---
  "Los nombres en la data no coinciden con el habla: un cliente puede figurar como razón social ('FRAVEGA S A C I E I') y un vendedor con apellido y nombre ('POMBO MARCELO'). Las tools resuelven coincidencias parciales solas: pasá el filtro tal como lo dijo el usuario. " +
  "Si una tool devuelve `sin_coincidencias`, NO respondas que no hay datos: mirá los `candidatos` que trae y volvé a llamarla con el valor correcto en el mismo turno. Si ninguno sirve, mostrale los candidatos al usuario y preguntale a cuál se refería. " +
  "Si devuelve `sin_datos` con filtros aplicados, probá aflojando el filtro más específico antes de rendirte, y aclarale al usuario qué universo miraste. " +
  "Cuando la respuesta traiga `filtros_aplicados`, contá en una línea cómo interpretaste lo que te pidieron (ej. 'Frávega = FRAVEGA S A C I E I'). " +
  // --- Formato ---
  "FORMATO: breve y claro (máx ~6 líneas salvo que pidan detalle). Usá **negritas** SOLO en los números/nombres clave y listas cortas con '- '. " +
  "NUNCA pegues URLs ni links. No uses sintaxis de imagen markdown. " +
  "Si el usuario pide un gráfico, primero traé la data con las tools y después llamá a render_chart armando el spec con esa data (no repitas la tabla en texto si ya la graficaste). " +
  "Todo es de Drean (marca de electrodomésticos, Argentina). ";

const REGISTRY: Record<string, DashboardChat> = {
  "cb-trade": {
    context:
      BASE +
      "Dashboard Cuadro Básico Trade: presencia en piso de los SKUs de Drean medida por los promotores, semana a semana y tienda a tienda. " +
      "% CB = unidades reales / unidades target; Infaltables y Estratégico son los dos tipos de SKU (Estratégico = CB − Infaltable). Objetivo: 80% en las tres métricas. " +
      "Las dimensiones son cliente/cadena, tienda, promotor, supervisor y división (Lavado/Refrigeración/Cocción). " +
      "La evolución semanal viene dentro de get_cb_resumen (`evolucion_semanal`). Para '¿cuánto falta para el 80%?' mirá `faltan_para_objetivo` (unidades de CB).",
    tools: cbTradeTools,
  },
  "floor-share": {
    context:
      BASE +
      "Dashboard Floor Share: % de exhibición de Drean sobre el total del piso en cada tienda, por categoría y marca. " +
      "Objetivos por categoría: Lavado 32%, Refrigeración 25%, Cocción 23%. " +
      "El share se calcula sobre unidades exhibidas; el dato es semanal y el mes se deriva del calendario fiscal 5-4-4. " +
      "Para evolución / tendencia usá get_fs_evolucion. Para '¿cuánto falta para el objetivo?' mirá `unidades_para_objetivo` (unidades Drean a sumar en piso). " +
      "OJO: la data está agregada por categoría — no hay apertura por modelo, tecnología (cíclica/no frost) ni ancho de cocina. Si preguntan por eso, decí que no se puede medir con la data actual.",
    tools: floorShareTools,
  },
  "sell-in": {
    context:
      BASE +
      "Dashboard Cuadro Básico Sell-in (/ventas): cumplimiento del CB desde la COMPRA del cliente, no desde el piso. " +
      "Un item de CB cumple si ese cliente tuvo unidades facturadas (FC) o en backorder (BO) de ese SKU. Objetivo: 80%. " +
      "Sin filtro de mes, la facturación se mira a MES CERRADO: últimos 3 meses para SMALL RETAILERS y últimos 2 para el resto de las tipologías; el BO cuenta acumulado. " +
      "Las dimensiones son cliente, vendedor, gerencia (Cuentas Clave / Interior / Buenos Aires), tipología y categoría. " +
      "Para evolución / tendencia / 'mes a mes' usá get_sellin_evolucion, que devuelve la serie mensual real; el resumen NO es una serie. " +
      "Para '¿qué le falta a X para el 80%?' filtrá por X y mirá `faltan_para_objetivo` (cuántos items de CB más hay que cumplir) y get_sellin_faltantes (cuáles).",
    tools: sellInTools,
    requiereSesion: true,
  },
  "trade-cruce": {
    context:
      BASE +
      "Dashboard CB Trade × Floor Share: cruza por tienda la PRESENCIA de los SKUs de Drean (CB Trade, objetivo 80%) con el SHARE de góndola (Floor Share, objetivos Lavado 32 / Refri 25 / Cocción 23). " +
      "Los cuadrantes separan problema de compra (surtido) de problema de ejecución. El uplift proyecta cuántos puntos de share subiría el segmento si se cerraran los SKUs de CB faltantes.",
    tools: tradeCruceTools,
  },
};

export function getDashboardChat(dashboard: string): DashboardChat | undefined {
  return REGISTRY[dashboard];
}
