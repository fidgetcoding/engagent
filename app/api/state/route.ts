import { NextResponse } from "next/server";
import { fileStore } from "@/lib/store";

export const dynamic = "force-dynamic";
export async function GET() {
  if (process.env.ENGAGENT_DEMO !== "0") return NextResponse.json({ error: "demo" }, { status: 404 });
  return NextResponse.json(await fileStore().read());
}
