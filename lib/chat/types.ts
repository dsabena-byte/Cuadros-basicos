// ============================================================================
// Copiloto de datos — tipos compartidos (chat + gráficos dinámicos).
//
// El motor (/api/chat) y la UI (<DataChat>) son GENÉRICOS: cada dashboard solo
// aporta su set de TOOLS + su contexto (ver lib/chat/registry.ts).
// ============================================================================

export interface ChartSeries {
  key: string;
  label: string;
  type?: "bar" | "line";
  color?: string;
  axis?: "left" | "right";
}

export interface ChartSpec {
  type: "bar" | "line" | "composed";
  title?: string;
  data: Array<Record<string, string | number | null>>;
  xKey: string;
  series: ChartSeries[];
}

/**
 * Alcance con el que corre una tool. `vendedor` no es null cuando el usuario
 * logueado en /ventas tiene rol "vendedor": las tools DEBEN acotarse a sus
 * clientes, igual que hace el server component de /ventas.
 */
export interface ChatToolCtx {
  vendedor: string | null;
}

/** Una herramienta que el modelo puede llamar: una query function envuelta. */
export interface ChatTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema (OpenAI function params)
  run: (args: Record<string, unknown>, ctx: ChatToolCtx) => Promise<unknown>;
}
