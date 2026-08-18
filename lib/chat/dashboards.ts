// ============================================================================
// Metadata de los dashboards con copiloto, compartida entre server y cliente.
// NO importa nada de data-access, así que <DataChat> (client component) la
// puede usar sin arrastrar Drive/Supabase al bundle del navegador.
// ============================================================================

export const DASHBOARD_IDS = ["cb-trade", "floor-share", "sell-in", "trade-cruce"] as const;

export type DashboardId = (typeof DASHBOARD_IDS)[number];

export function isDashboardId(s: string): s is DashboardId {
  return (DASHBOARD_IDS as readonly string[]).includes(s);
}

/** Preguntas de ejemplo que muestra el drawer cuando el hilo está vacío. */
export const SUGERENCIAS: Record<DashboardId, string[]> = {
  "cb-trade": [
    "¿Cómo viene el cumplimiento de CB esta semana?",
    "¿Qué promotores están más lejos del 80%?",
    "Graficá la evolución semanal de % CB",
  ],
  "floor-share": [
    "¿Cuál es el floor share de Drean por categoría?",
    "¿En qué cadenas estamos más lejos del objetivo?",
    "Graficá la evolución semanal del share",
  ],
  "sell-in": [
    "¿Cómo viene el cumplimiento de CB este mes?",
    "¿Qué clientes están por debajo del 80%?",
    "¿Qué SKUs son los que más faltan?",
  ],
  "trade-cruce": [
    "¿Dónde conviene atacar primero para subir el share?",
    "¿Qué tiendas tienen problema de surtido y cuáles de ejecución?",
    "¿Cuánto share ganaríamos si cerramos el CB?",
  ],
};

export const TITULOS: Record<DashboardId, string> = {
  "cb-trade": "Cuadro Básico Trade",
  "floor-share": "Floor Share",
  "sell-in": "Cuadro Básico Sell-in",
  "trade-cruce": "CB Trade × Floor Share",
};
