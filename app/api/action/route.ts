import { NextResponse } from "next/server";
import { fileStore } from "@/lib/store";
import { DIRECTION_KINDS, PLATFORMS, type Action } from "@/lib/types";

const validate = (a: any): a is Action => {
  if (!a || typeof a.type !== "string") return false;
  switch (a.type) {
    case "direction.add": case "direction.remove": return DIRECTION_KINDS.includes(a.direction?.kind) && typeof a.direction?.value === "string" && a.direction.value.length <= 300;
    case "platform.toggle": return PLATFORMS.includes(a.platform);
    case "find.approve": return [a.id, a.cardId, a.firstStage, a.contentType].every((x) => typeof x === "string");
    case "find.skip": return typeof a.id === "string";
    case "card.add": return typeof a.card?.id === "string" && typeof a.card?.title === "string" && Array.isArray(a.card?.metrics) && Array.isArray(a.card?.platforms);
    case "card.move": return typeof a.id === "string" && typeof a.stage === "string";
    case "card.due": return typeof a.id === "string" && (a.due === null || /^\d{4}-\d{2}-\d{2}$/.test(a.due));
    case "card.brief": return typeof a.id === "string" && typeof a.brief === "string" && typeof a.approvals === "boolean";
    case "card.review": return typeof a.id === "string" && ["approved", "changes"].includes(a.decision);
    case "metric.log": return typeof a.id === "string" && PLATFORMS.includes(a.metric?.platform) && ["views", "likes", "comments", "shares"].every((k) => Number.isFinite(a.metric[k]) && a.metric[k] >= 0);
    default: return false; // find.add and spend.add belong to the scanner, not the browser.
  }
};

export async function POST(req: Request) {
  if (process.env.ENGAGENT_DEMO !== "0") return NextResponse.json({ error: "demo" }, { status: 404 });
  const action = await req.json().catch(() => null);
  if (!validate(action)) return NextResponse.json({ error: "invalid action" }, { status: 400 });
  return NextResponse.json(await fileStore().apply(action));
}
