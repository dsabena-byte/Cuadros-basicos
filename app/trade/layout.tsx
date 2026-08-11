import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../ventas/globals.css";

export const metadata: Metadata = {
  title: "CB Trade × Floor Share · Drean",
  description: "Análisis cruzado Cuadro Básico Trade y Floor Share por tienda",
};

export default function TradeLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
