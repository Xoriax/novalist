import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");

async function readSession(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as any;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/signin") || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const sess = await readSession(req);
  if (!sess) {
    const url = new URL("/signin", req.url);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin/")) {
    if (sess.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};