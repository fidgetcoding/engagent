import { NextResponse } from "next/server";
import config from "@/engagent.config";
import { fileStore } from "@/lib/store";
import { isBrowserAction } from "@/lib/validation";

export async function POST(req: Request) {
  if (process.env.ENGAGENT_DEMO !== "0") return NextResponse.json({ error: "demo" }, { status: 404 });
  const origin = req.headers.get("origin");
  const requestUrl = new URL(req.url);
  // Next can use its internal listener address in req.url. Host is the browser's destination.
  const expectedOrigin = new URL(`${requestUrl.protocol}//${req.headers.get("host") ?? requestUrl.host}`).origin;
  if ((origin && origin !== expectedOrigin) || req.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "cross-origin action" }, { status: 403 });
  }
  if (req.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return NextResponse.json({ error: "expected JSON" }, { status: 415 });
  }
  // Bound the actual stream, including requests without Content-Length.
  const reader = req.body?.getReader();
  if (!reader) return NextResponse.json({ error: "invalid action" }, { status: 400 });
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 65536) { await reader.cancel(); return NextResponse.json({ error: "action too large" }, { status: 413 }); }
      chunks.push(value);
    }
  } catch { return NextResponse.json({ error: "invalid body" }, { status: 400 }); }
  finally { reader.releaseLock(); }
  let action: unknown;
  try { action = JSON.parse(Buffer.concat(chunks).toString("utf8") || "null"); }
  catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }); }
  if (!isBrowserAction(action, config)) return NextResponse.json({ error: "invalid action" }, { status: 400 });
  try {
    return NextResponse.json(await fileStore().apply(action), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Storage unavailable. Try again." }, { status: 503 });
  }
}
