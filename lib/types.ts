export type Tipologia =
  | "TOP 10"
  | "GRANDES CUENTAS RESTO"
  | "HIPERMERCADOS"
  | "SMALL RETAILERS";

export type Categoria = "LAVADO Y SECADO" | "REFRIGERACION" | "COCCION";

export type TipoCB = "INFALTABLE" | "ESTRATEGICO";

export type CuadroBasicoItem = {
  tipologia: Tipologia;
  cliente: string;
  tipo: TipoCB;
  categoria: Categoria;
  sku: string;
};

export type ClasificacionCliente = {
  cliente: string;
  tipologia: Tipologia;
  vendedor: string;
  gerente: string;
};

export type VentaTipo = "FC" | "BO";

export type VentaRow = {
  cliente: string;
  sku: string;
  tipo: VentaTipo;
  unidades: number;
  fecha: string; // YYYY-MM-DD
  mes: number;   // 1..12
  vendedor: string;
};

export type VentasFile = {
  generatedAt: string;
  source: "dummy" | "sharepoint";
  rows: VentaRow[];
};
