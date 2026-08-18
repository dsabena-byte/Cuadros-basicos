import "server-only";
import { getDataset } from "@/lib/data-source";
import {
  CB_OBJETIVO,
  FS_TARGETS,
  construirAnalisisTrade,
  type SegmentoTrade,
} from "@/lib/analisis-trade";
import type { ChatTool } from "./types";
import { limitOf } from "./filters";

// ============================================================================
// Tools del dashboard "CB Trade × Floor Share" (/trade).
// Reusa construirAnalisisTrade — la misma función que renderiza la pantalla.
// ============================================================================

const CUADRANTES: Record<string, string> = {
  sostener: "CB alto y Floor Share alto: mantener.",
  ejecucion: "CB alto pero Floor Share bajo: el surtido está, falta pelear la góndola.",
  surtido: "CB bajo y Floor Share bajo: problema de compra, falta el producto.",
  fragil: "CB bajo pero Floor Share alto: share sostenido con surtido incompleto, es frágil.",
  sinFS: "Tienda con CB medido pero sin datos de Floor Share.",
};

function slim(s: SegmentoTrade) {
  return {
    nombre: s.nombre,
    tiendas: s.tiendas,
    pctCB: Math.round(s.pctCB * 10) / 10,
    pctInf: Math.round(s.pctInf * 10) / 10,
    fsShare: s.fsShare,
    fsTarget: s.fsTarget,
    cuadrante: s.cuadrante,
    skus_faltantes: s.skusFaltantes.length,
    uplift_pp: s.upliftPp,
    fs_share_proyectado: s.fsShareProyectado,
  };
}

async function analisis() {
  const ds = await getDataset();
  return construirAnalisisTrade(ds.rows, ds.floorShare);
}

export const tradeCruceTools: ChatTool[] = [
  {
    name: "get_trade_resumen",
    description:
      "Cruce global CB Trade × Floor Share: % CB, share de Drean vs objetivo, cobertura de tiendas, la matriz de cuadrantes (sostener / ejecución / surtido / frágil) y el corte por categoría.",
    parameters: { type: "object", properties: {} },
    run: async () => {
      const a = await analisis();
      return {
        objetivo_cb: CB_OBJETIVO,
        objetivos_fs: FS_TARGETS,
        global: a.global,
        cobertura: a.cobertura,
        matriz_cuadrantes: a.matriz,
        que_significa_cada_cuadrante: CUADRANTES,
        por_categoria: a.categorias,
      };
    },
  },
  {
    name: "get_trade_segmentos",
    description:
      "Segmentos del cruce CB × Floor Share por cadena, promotor, supervisor o tienda: cumplimiento de CB, share actual, cuadrante, SKUs de CB faltantes y el uplift de share proyectado si se cerrara el CB. Usalo para '¿dónde conviene atacar?'.",
    parameters: {
      type: "object",
      required: ["dimension"],
      properties: {
        dimension: { type: "string", enum: ["cadena", "promotor", "supervisor", "tienda"] },
        cuadrante: {
          type: "string",
          enum: ["sostener", "ejecucion", "surtido", "fragil", "sinFS"],
          description: "filtrar a un cuadrante (opcional)",
        },
        orden: {
          type: "string",
          enum: ["mayor_uplift", "peor_cb", "peor_share"],
          description: "default: mayor_uplift",
        },
        limit: { type: "number", description: "default 15, máx 50" },
      },
    },
    run: async (args) => {
      const a = await analisis();
      const dim = String(args.dimension ?? "");
      const pool: SegmentoTrade[] | undefined = {
        cadena: a.cadenas,
        promotor: a.promotores,
        supervisor: a.supervisores,
        tienda: a.tiendasSeg,
      }[dim];
      if (!pool) return { error: "dimension inválida" };

      let list = pool;
      if (typeof args.cuadrante === "string") {
        list = list.filter((s) => s.cuadrante === args.cuadrante);
      }
      const orden = String(args.orden ?? "mayor_uplift");
      const sorted = [...list].sort((x, y) => {
        if (orden === "peor_cb") return x.pctCB - y.pctCB;
        if (orden === "peor_share") return (x.fsShare ?? 999) - (y.fsShare ?? 999);
        return (y.upliftPp ?? -1) - (x.upliftPp ?? -1);
      });
      return {
        dimension: dim,
        total: sorted.length,
        segmentos: sorted.slice(0, limitOf(args.limit, 15, 50)).map(slim),
      };
    },
  },
];
