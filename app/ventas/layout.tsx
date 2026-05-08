import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cumplimiento Cuadro Básico · Drean",
  description: "Dashboard de cumplimiento de Cuadros Básicos · Infaltables · Estratégico",
};

export default function VentasLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
