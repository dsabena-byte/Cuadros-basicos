"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { SUGERENCIAS, TITULOS, type DashboardId } from "@/lib/chat/dashboards";
import type { ChartSpec } from "@/lib/chat/types";
import styles from "./DataChat.module.css";

// recharts pesa ~100 kB: se carga recién cuando el copiloto devuelve un
// gráfico, para no engordar el bundle inicial de los dashboards.
const DynamicChart = dynamic(() => import("./DynamicChart").then((m) => m.DynamicChart), {
  ssr: false,
});

// ============================================================================
// Copiloto GENÉRICO: botón flotante + drawer + hilo. Se monta en cualquier
// dashboard pasándole su `dashboard` id (mapea a lib/chat/registry.ts). El hilo
// muestra respuestas de texto y gráficos (<DynamicChart>) inline.
//
// Sin Tailwind a propósito: también corre en / , que no carga Tailwind.
// ============================================================================

interface Msg {
  role: "user" | "assistant";
  content: string;
  charts?: ChartSpec[];
  error?: boolean;
}

// Renderer de markdown MÍNIMO (sin dependencias): negritas, listas y saltos de
// línea; saca imágenes y deja los links como texto. Suficiente para la salida
// del copiloto, sin sumar librerías.
function renderInline(text: string, keyBase: string) {
  const clean = text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  return clean.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**") && p.length > 4 ? (
      <strong key={`${keyBase}-${i}`}>{p.slice(2, -2)}</strong>
    ) : (
      <span key={`${keyBase}-${i}`}>{p}</span>
    ),
  );
}

function MiniMarkdown({ text }: { text: string }) {
  return (
    <div className={styles.md}>
      {text.split("\n").map((line, i) => {
        const t = line.trim();
        if (!t) return <div key={i} className={styles.mdSpacer} />;
        if (/^[-*]\s+/.test(t)) {
          return (
            <div key={i} className={styles.mdItem}>
              <span className={styles.bullet}>•</span>
              <span>{renderInline(t.replace(/^[-*]\s+/, ""), `l${i}`)}</span>
            </div>
          );
        }
        const num = t.match(/^(\d+)\.\s+(.*)$/);
        if (num) {
          return (
            <div key={i} className={styles.mdItem}>
              <span className={styles.bullet}>{num[1]}.</span>
              <span>{renderInline(num[2] ?? "", `l${i}`)}</span>
            </div>
          );
        }
        return <div key={i}>{renderInline(t, `l${i}`)}</div>;
      })}
    </div>
  );
}

export function DataChat({ dashboard }: { dashboard: DashboardId }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  // El hilo es por dashboard: si el usuario cambia de tab, arranca limpio.
  useEffect(() => {
    setMsgs([]);
    setInput("");
  }, [dashboard]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || loadingRef.current) return;
    const next: Msg[] = [...msgs, { role: "user", content: q }];
    setMsgs(next);
    setInput("");
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dashboard,
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = (await res.json()) as { text?: string; charts?: ChartSpec[]; error?: string };
      setMsgs([
        ...next,
        {
          role: "assistant",
          content: data.text || data.error || "No pude responder.",
          charts: data.charts ?? [],
          error: !data.text && !!data.error,
        },
      ]);
    } catch {
      setMsgs([...next, { role: "assistant", content: "Error al consultar. Reintentá.", error: true }]);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className={styles.fab} onClick={() => setOpen(true)}>
        <span aria-hidden>✨</span> Preguntá a tus datos
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        className={styles.overlay}
        aria-label="Cerrar copiloto"
        onClick={() => setOpen(false)}
      />
      <aside className={styles.drawer} role="dialog" aria-label="Copiloto de datos">
        <div className={styles.header}>
          <div>
            <span className={styles.headerTitle}>✨ Preguntá a tus datos</span>
            <span className={styles.headerSub}>{TITULOS[dashboard]}</span>
          </div>
          <button type="button" className={styles.close} onClick={() => setOpen(false)} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div ref={scrollRef} className={styles.thread}>
          {msgs.length === 0 && (
            <div className={styles.intro}>
              <p>Preguntame sobre los datos de este tablero o pedime un gráfico. Ejemplos:</p>
              {SUGERENCIAS[dashboard].map((s) => (
                <button key={s} type="button" className={styles.suggestion} onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}
          {msgs.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className={styles.rowUser}>
                <div className={styles.bubbleUser}>{m.content}</div>
              </div>
            ) : (
              <div key={i} className={`${styles.bubbleBot} ${m.error ? styles.bubbleError : ""}`}>
                <MiniMarkdown text={m.content} />
                {m.charts?.map((c, j) => (
                  <DynamicChart key={j} spec={c} />
                ))}
              </div>
            ),
          )}
          {loading && <div className={styles.loading}>Pensando…</div>}
        </div>

        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            className={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribí tu pregunta…"
            aria-label="Tu pregunta"
          />
          <button type="submit" className={styles.send} disabled={loading} aria-label="Enviar">
            ➤
          </button>
        </form>
      </aside>
    </>
  );
}
