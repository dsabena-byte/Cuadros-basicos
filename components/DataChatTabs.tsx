"use client";

import { useEffect, useState } from "react";
import { DataChat } from "./DataChat";
import type { DashboardId } from "@/lib/chat/dashboards";

// ============================================================================
// Monta el copiloto en / (dashboard vanilla de public/dashboard.js), siguiendo
// la tab activa: "Cumplimiento CB" → cb-trade, "Floor Share" → floor-share.
//
// dashboard.js emite `cb:tabchange` al construir el shell y en cada click de
// tab (ver initTabs()). Mientras no llegue el primer evento no renderizamos
// nada, así el botón no aparece sobre el loader.
// ============================================================================

const MAP: Record<string, DashboardId> = {
  cb: "cb-trade",
  floorshare: "floor-share",
};

export function DataChatTabs() {
  const [tab, setTab] = useState<DashboardId | null>(null);

  useEffect(() => {
    const onTab = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      const id = MAP[detail];
      if (id) setTab(id);
    };
    window.addEventListener("cb:tabchange", onTab);
    // Por si el evento se disparó antes de que montara este componente.
    const actual = document.querySelector<HTMLElement>(".tab.active")?.dataset.tab;
    if (actual && MAP[actual]) setTab(MAP[actual]);
    return () => window.removeEventListener("cb:tabchange", onTab);
  }, []);

  if (!tab) return null;
  return <DataChat dashboard={tab} />;
}
