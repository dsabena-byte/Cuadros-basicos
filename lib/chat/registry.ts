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
  "Respondé SIEMPRE en español, conciso y con números concretos. Nunca inventes datos: usá solo lo que devuelven las tools. " +
  "Si una tool devuelve `sin_datos`, decilo en vez de estimar. " +
  "Antes de filtrar por un cliente, promotor, tienda o categoría que el usuario nombró, si no estás seguro de cómo se escribe, llamá primero a la tool de contexto. " +
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
      "Las dimensiones son cliente/cadena, tienda, promotor, supervisor y división (Lavado/Refrigeración/Cocción).",
    tools: cbTradeTools,
  },
  "floor-share": {
    context:
      BASE +
      "Dashboard Floor Share: % de exhibición de Drean sobre el total del piso en cada tienda, por categoría y marca. " +
      "Objetivos por categoría: Lavado 32%, Refrigeración 25%, Cocción 23%. " +
      "El share se calcula sobre unidades exhibidas; el dato es semanal y el mes se deriva del calendario fiscal 5-4-4. " +
      "OJO: la data está agregada por categoría — no hay apertura por modelo, tecnología (cíclica/no frost) ni ancho de cocina.",
    tools: floorShareTools,
  },
  "sell-in": {
    context:
      BASE +
      "Dashboard Cuadro Básico Sell-in (/ventas): cumplimiento del CB desde la COMPRA del cliente, no desde el piso. " +
      "Un item de CB cumple si ese cliente tuvo unidades facturadas (FC) o en backorder (BO) de ese SKU. Objetivo: 80%. " +
      "Sin filtro de mes, la facturación se mira a MES CERRADO: últimos 3 meses para SMALL RETAILERS y últimos 2 para el resto de las tipologías; el BO cuenta acumulado. " +
      "Las dimensiones son cliente, vendedor, gerencia (Cuentas Clave / Interior / Buenos Aires), tipología y categoría.",
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
