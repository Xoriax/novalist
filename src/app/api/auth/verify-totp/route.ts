import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { cookies } from "next/headers";
import { verifySession, signSession } from "@/lib/jwt";
import { authenticator } from "otplib";

export async function POST(req: Request) {
  await dbConnect();
  const cookieStore = await cookies();
  const pre = cookieStore.get("preauth")?.value;
  if (!pre) return NextResponse.json({ error: "Pré-auth requise" }, { status: 401 });

  const payload = await verifySession(pre).catch(() => null);
  if (!payload) return NextResponse.json({ error: "Pré-auth invalide" }, { status: 401 });

  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: "Code requis" }, { status: 400 });

  const user = await User.findById(payload.uid);
  if (!user?.mfa?.enabled || !user.mfa.totpSecret)
    return NextResponse.json({ error: "MFA non activée" }, { status: 400 });

  const ok = authenticator.verify({ token: code, secret: user.mfa.totpSecret });
  if (!ok) return NextResponse.json({ error: "Code TOTP invalide" }, { status: 400 });

  const tokenJwt = await signSession({ uid: user._id.toString(), role: user.role }, 24);
  cookieStore.delete("preauth");
  cookieStore.set("session", tokenJwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 24 * 60 * 60,
  });

  return NextResponse.json({ ok: true });
}