import { NextResponse } from "next/server";
import { currentDataSource, getDataset } from "@/lib/data-source";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dataset = await getDataset();
    return NextResponse.json(dataset, {
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
        "x-data-source": currentDataSource(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
