import { NextResponse, type NextRequest } from "next/server";

const same = (a: string, b: string) => { let d = a.length ^ b.length; for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0); return d === 0; };

// Demo stays open. Real deployments stay shut until a password is set.
export function middleware(req: NextRequest) {
  if (process.env.ENGAGENT_DEMO !== "0") return NextResponse.next();
  const pw = process.env.ENGAGENT_PASSWORD;
  if (!pw) return new NextResponse("Set ENGAGENT_PASSWORD to open this workspace.", { status: 503 });
  const [scheme, value] = (req.headers.get("authorization") ?? "").split(" ");
  if (scheme?.toLowerCase() === "basic" && value) {
    try {
      const decoded = atob(value);
      const colon = decoded.indexOf(":");
      if (colon >= 0 && same(decoded.slice(colon + 1), pw)) return NextResponse.next();
    } catch { /* malformed credentials are unauthorized */ }
  }
  return new NextResponse("Sign in", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Engagent"' } });
}
export const config = { matcher: "/((?!_next/static|_next/image|favicon.ico).*)" };
