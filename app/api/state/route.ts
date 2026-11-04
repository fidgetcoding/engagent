import { NextResponse } from "next/server";
import { fileStore } from "@/lib/store";

export const dynamic = "force-dynamic";
export async function GET() {
  if (process.env.ENGAGENT_DEMO !== "0") return NextResponse.json({ error: "demo" }, { status: 404 });
  try { return NextResponse.json(await fileStore().read(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Storage unavailable. Check the data file." }, { status: 503 }); }
}
