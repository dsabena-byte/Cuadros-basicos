import { NextResponse } from "next/server";
import { buildDataset } from "@/lib/dataset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function GET() {
  const folderId = process.env.DRIVE_FOLDER_ID;
  if (!folderId) {
    return NextResponse.json({ error: "DRIVE_FOLDER_ID no está definido" }, { status: 500 });
  }
  try {
    const dataset = await buildDataset(folderId);
    return NextResponse.json(dataset, {
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
