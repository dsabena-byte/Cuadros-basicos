import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDashboardChat } from "@/lib/chat/registry";
import type { ChartSpec, ChatToolCtx } from "@/lib/chat/types";
import { normalizarChartSpec, recolectarNumeros } from "@/lib/chat/chart";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/users";

// ============================================================================
// Motor GENÉRICO del copiloto de datos ("Preguntá a tus datos").
//
// Loop de function-calling (OpenAI) sobre las tools del dashboard pedido.
// Devuelve { text, charts }. No es específico de ningún tablero: sirve para
// cualquier dashboard registrado en lib/chat/registry.ts.
//
// Mismo motor que el dashboard de Marketing, para que el comportamiento y el
// manejo de la API key sean consistentes entre los dos proyectos.
// ============================================================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
const MAX_STEPS = 6;
const MAX_MENSAJES = 20;
const MAX_CHARS_PREGUNTA = 2000;

interface OAIToolCall {
  id: string;
  function: { name: string; arguments: string };
}
interface OAIMessage {
  role: string;
  content: string | null;
  tool_calls?: OAIToolCall[];
  tool_call_id?: string;
}
interface ChatRequest {
  dashboard?: string;
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
}

const RENDER_CHART_TOOL = {
  type: "function" as const,
  function: {
    name: "render_chart",
    description:
      "Renderiza un gráfico. Llamalo cuando pidan graficar/visualizar, DESPUÉS de traer la data con las otras tools. " +
      "`data` va en formato ancho: UNA fila por punto del eje X con TODAS las series en esa misma fila " +
      "(ej. [{mes:'Julio', cb:76, share:24}, {mes:'Agosto', cb:78, share:25}]). NO concatenes un array por serie: " +
      "eso duplica las categorías del eje. Incluí solo puntos con datos reales y solo valores que haya devuelto una tool " +
      "de ESTE tablero — los que no se puedan verificar hacen que el gráfico se rechace.",
    parameters: {
      type: "object",
      required: ["type", "data", "xKey", "series"],
      properties: {
        type: { type: "string", enum: ["bar", "line", "composed"] },
        title: { type: "string" },
        xKey: { type: "string", description: "clave del eje X en cada objeto de data" },
        data: { type: "array", items: { type: "object" } },
        series: {
          type: "array",
          items: {
            type: "object",
            required: ["key", "label"],
            properties: {
              key: { type: "string" },
              label: { type: "string" },
              type: { type: "string", enum: ["bar", "line"] },
              axis: { type: "string", enum: ["left", "right"] },
            },
          },
        },
      },
    },
  },
};

// Throttle best-effort por IP. En serverless la memoria es por instancia, así
// que no es un rate limit real — solo corta un loop accidental del navegador.
const HITS = new Map<string, number[]>();
const VENTANA_MS = 60_000;
const MAX_POR_VENTANA = 20;

function throttled(ip: string): boolean {
  const ahora = Date.now();
  const prev = (HITS.get(ip) ?? []).filter((t) => ahora - t < VENTANA_MS);
  prev.push(ahora);
  HITS.set(ip, prev);
  if (HITS.size > 500) HITS.clear();
  return prev.length > MAX_POR_VENTANA;
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY no configurada" }, { status: 500 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  if (throttled(ip)) {
    return NextResponse.json({ error: "Demasiadas consultas seguidas. Esperá un momento." }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as ChatRequest;
  const dash = getDashboardChat(body.dashboard ?? "");
  if (!dash) return NextResponse.json({ error: "dashboard desconocido" }, { status: 400 });

  // Los dashboards protegidos (Sell-in) exigen la misma sesión que /ventas, y
  // acotan la data al vendedor logueado igual que el server component.
  const toolCtx: ChatToolCtx = { vendedor: null };
  if (dash.requiereSesion) {
    const token = cookies().get(SESSION_COOKIE.name)?.value;
    const session = token ? await verifySessionToken(token) : null;
    if (!session) return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });
    if (session.rol === "vendedor") toolCtx.vendedor = session.vendedor;
  }

  const historia = (body.messages ?? []).slice(-MAX_MENSAJES).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: (m.content ?? "").toString().slice(0, MAX_CHARS_PREGUNTA),
  }));
  if (historia.length === 0) {
    return NextResponse.json({ error: "Falta la pregunta" }, { status: 400 });
  }

  const toolMap = new Map(dash.tools.map((t) => [t.name, t]));
  const tools = [
    ...dash.tools.map((t) => ({
      type: "function" as const,
      function: { name: t.name, description: t.description, parameters: t.parameters },
    })),
    RENDER_CHART_TOOL,
  ];

  const messages: OAIMessage[] = [{ role: "system", content: dash.context }, ...historia];
  const charts: ChartSpec[] = [];
  // Números que devolvieron las tools en este turno: sirven para verificar que
  // el gráfico no invente valores ni traiga métricas de otro tablero.
  const numerosDeTools = new Set<string>();

  for (let step = 0; step < MAX_STEPS; step++) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, messages, tools, temperature: 0.2 }),
    });
    if (!res.ok) {
      console.error(`[chat] OpenAI ${res.status}: ${await res.text()}`);
      return NextResponse.json({ error: "El copiloto no está disponible en este momento." }, { status: 502 });
    }
    const json = (await res.json()) as { choices?: Array<{ message?: OAIMessage }> };
    const msg = json.choices?.[0]?.message;
    if (!msg) return NextResponse.json({ error: "OpenAI sin respuesta" }, { status: 502 });
    messages.push(msg);

    const calls = msg.tool_calls ?? [];
    if (calls.length === 0) {
      return NextResponse.json({ text: msg.content ?? "", charts });
    }

    // Los gráficos se resuelven al final de cada tanda: si el modelo pidió la
    // data y el gráfico en la misma vuelta, los valores de las tools ya están
    // recolectados cuando se verifica el spec.
    const ordenadas = [...calls].sort((a, b) => {
      const chart = (c: OAIToolCall) => (c.function?.name === "render_chart" ? 1 : 0);
      return chart(a) - chart(b);
    });

    // El protocolo exige responder los tool_calls en el mismo orden en que
    // llegaron, así que las respuestas se indexan por id.
    const respuestas = new Map<string, unknown>();

    for (const call of ordenadas) {
      const name = call.function?.name;
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function?.arguments || "{}") as Record<string, unknown>;
      } catch {
        args = {};
      }
      let result: unknown;
      if (name === "render_chart") {
        const r = normalizarChartSpec(args, numerosDeTools);
        if (r.ok) {
          charts.push(r.spec);
          result = r.notas.length > 0 ? { ok: true, ajustes: r.notas } : { ok: true };
        } else {
          result = { ok: false, error: r.error };
        }
      } else {
        const tool = toolMap.get(name);
        if (!tool) {
          result = { error: `tool desconocida: ${name}` };
        } else {
          try {
            result = await tool.run(args, toolCtx);
            recolectarNumeros(result, numerosDeTools);
          } catch (err) {
            console.error(`[chat] tool ${name} falló:`, err);
            result = { error: "la tool falló al consultar los datos" };
          }
        }
      }
      respuestas.set(call.id, result);
    }

    for (const call of calls) {
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(respuestas.get(call.id) ?? { error: "sin respuesta" }),
      });
    }
  }

  return NextResponse.json({ text: "No pude completar la respuesta (demasiados pasos).", charts });
}
