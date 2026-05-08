# Dashboard Cumplimiento Cuadros Básicos · Drean Argentina

Dashboard React + Next.js que muestra el cumplimiento mensual de los
**Cuadros Básicos** de Drean: porcentajes de **CB total**, **Infaltables** y
**Estratégico** por gerente, vendedor, cliente y categoría, con objetivo
80%.

## Fuentes de datos

| Tipo                        | Origen                                                 | Archivo en `/public/data/`     |
|-----------------------------|--------------------------------------------------------|--------------------------------|
| Cuadro básico (estático)    | Google Drive · `Cuadros-basicos-Abril-2026.csv`        | `cuadro-basico.json`           |
| Clasificación de clientes   | Google Drive · `Clasificacion-clientes-Abril-2026.csv` | `clasificacion-clientes.json`  |
| Ventas FC + BO (dinámico)   | SharePoint · `FC + BO 2026 - Hanna.xlsx` (Power Automate) | `ventas.json`               |

> Carpeta de Drive: <https://drive.google.com/drive/folders/1qWyyWFcAe9EvfXr0ayDIVeIG1M6y3233>
>
> Sitio SharePoint: `mabe.sharepoint.com/sites/CO-ARCOMERCIAL` →
> `General > 7. Analistas de Ventas > 1 - TABLEROS > Tablero - archivos para actualizar`

Hoy los tres archivos JSON son **dummy** (ver `scripts/generate-dummy-data.mjs`).
Cuando estén los CSVs reales y el flow de Power Automate, los reemplazamos por
los datos de producción sin tocar el dashboard.

## Estructura

```
app/
  layout.tsx           Shell HTML + Tailwind
  page.tsx             Server component, lee los 3 JSON y se los pasa al Dashboard
  globals.css          Tailwind base

components/
  Dashboard.tsx        Componente cliente con todos los gráficos, tablas y filtros

lib/
  types.ts             Tipos compartidos (CuadroBasicoItem, ClasificacionCliente, VentaRow…)
  data.ts              Lectura de los JSON estáticos desde /public/data/

public/data/
  cuadro-basico.json
  clasificacion-clientes.json
  ventas.json

scripts/
  generate-dummy-data.mjs   Genera los 3 JSON dummy (datos del mock original)
```

## Lógica de cumplimiento

Un SKU está **cumplido** para un cliente si tiene al menos 1 unidad en FC o BO.

```
% CB           = SKUs cumplidos / SKUs totales
% Infaltables  = idem solo sobre tipo INFALTABLE
% Estratégico  = idem solo sobre tipo ESTRATEGICO
```

Objetivo 80%; el delta vs objetivo se muestra en pp con flechas ↑↓.

## Filtros (en orden)

`MES · CATEGORÍA · GERENTE · VENDEDOR · TIPOLOGÍA · CLIENTE · [Limpiar]`

Cascadas: gerente filtra vendedor; tipología filtra cliente.

## Layout

1. Header con timestamp de última sincronización (`ventas.json#generatedAt`)
2. FilterBar sticky
3. KPI cards: % CB · % Infaltables · % Estratégico · Clientes · En riesgo (<50%)
4. **Evolución mensual** — LineChart, cálculo acumulativo
5. **Cumplimiento por Categoría** — BarChart agrupado
6. **Cumplimiento por Vendedor** + **Cumplimiento por Cliente / Cadena** (tablas lado a lado)
7. Detalle de SKUs del cliente seleccionado (al hacer click en una fila)

## Desarrollo local

```bash
npm install
npm run dev          # http://localhost:3000

# regenerar datos dummy
node scripts/generate-dummy-data.mjs

# typecheck
npm run typecheck
```

## Paleta

| Métrica         | Color     |
|-----------------|-----------|
| % CB            | `#2542C2` |
| % Infaltables   | `#A855F7` |
| % Estratégico   | `#EC4899` |
| Header tablas   | `#1e3a8a` |

Coloreado de celdas: ≥80% verde · 70-79% amarillo · <70% rojo.
