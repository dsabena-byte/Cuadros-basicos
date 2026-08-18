"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartSpec } from "@/lib/chat/types";
import styles from "./DataChat.module.css";

// Renderer GENÉRICO: dibuja cualquier ChartSpec (bar/line/composed) que devuelva
// el copiloto. Reutilizable en todos los dashboards, sin cambios.
const COLORS = ["#3b82f6", "#e63946", "#10b981", "#f59e0b", "#8b5cf6", "#0891b2"];

export function DynamicChart({ spec }: { spec: ChartSpec }) {
  if (!spec?.data?.length || !spec.series?.length) {
    return <div className={styles.chartBox}><span className={styles.chartEmpty}>Sin datos para graficar.</span></div>;
  }
  const usesRight = spec.series.some((s) => s.axis === "right");
  return (
    <div className={styles.chartBox}>
      {spec.title && <div className={styles.chartTitle}>{spec.title}</div>}
      <ResponsiveContainer width="100%" height={230}>
        <ComposedChart data={spec.data} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey={spec.xKey} fontSize={10} stroke="#64748b" />
          <YAxis yAxisId="left" fontSize={10} stroke="#64748b" />
          {usesRight && <YAxis yAxisId="right" orientation="right" fontSize={10} stroke="#64748b" />}
          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid #e2e8f0" }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {spec.series.map((s, i) => {
            const color = s.color ?? COLORS[i % COLORS.length];
            const yAxisId = s.axis === "right" ? "right" : "left";
            return s.type === "line" ? (
              <Line
                key={s.key}
                yAxisId={yAxisId}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={color}
                strokeWidth={2}
                dot={{ r: 2 }}
                connectNulls
              />
            ) : (
              <Bar key={s.key} yAxisId={yAxisId} dataKey={s.key} name={s.label} fill={color} />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
