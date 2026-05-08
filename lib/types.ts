export type Tipologia =
  | "TOP 10"
  | "GRANDES CUENTAS RESTO"
  | "HIPERMERCADOS"
  | "SMALL RETAILERS";

export type Categoria = "LAVADO" | "REFRIGERACION" | "COCCION";

export type TipoCB = "INFALTABLE" | "ESTRATEGICO";

export type CuadroBasicoItem = {
  tipologia: Tipologia;
  cliente: string;
  tipo: TipoCB;
  categoria: Categoria;
  sku: string;
};

export type ClasificacionCliente = {
  id: string;            // ID interno del cliente (col ID del CSV)
  cliente: string;
  pesoFacturacion: number; // 0..1
  tipologia: Tipologia;
  vendedor: string;
  gerente: string;       // "Cuentas Clave" | "Interior" | "Buenos Aires"
};

export type VentaTipo = "FC" | "BO";

// Una línea de la solapa BO o FC de "FC + BO 2026 - Hanna.xlsx".
// Un pedido (documentoVentas) puede tener para un mismo SKU una porción
// facturada (fila en FC) y otra pendiente (fila en BO); ambas se unen por
// `documentoVentas + sku` cuando hace falta reconstruir el pedido completo.
export type VentaRow = {
  documentoVentas: string;
  cliente: string;
  sku: string;
  tipo: VentaTipo;
  unidades: number;
  fecha: string; // YYYY-MM-DD
  mes: number;   // 1..12 (derivado de fecha)
  vendedor: string;
};

export type VentasFile = {
  generatedAt: string;
  source: "dummy" | "sharepoint";
  rows: VentaRow[];
};

// Payload que manda el flow de Power Automate al endpoint /api/ventas.
// Una entrada por fila de la solapa correspondiente; el server las
// concatena en `VentasFile.rows` con su `tipo` ("FC" o "BO").
export type VentasPayloadRow = {
  documentoVentas: string;
  cliente: string;
  sku: string;
  unidades: number;
  fecha: string; // YYYY-MM-DD
  vendedor: string;
};

export type VentasPayload = {
  fc: VentasPayloadRow[];
  bo: VentasPayloadRow[];
  generatedAt?: string;
};
