import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { verifySession } from "@/lib/jwt";
import { cookies } from "next/headers";
import { authenticator } from "otplib";

export async function POST(req: Request) {
  await dbConnect();
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const payload = await verifySession(session).catch(() => null);
  if (!payload) return NextResponse.json({ error: "Session invalide" }, { status: 401 });

  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: "Code requis" }, { status: 400 });

  const user = await User.findById(payload.uid);
  if (!user?.mfa?.tempSecret)
    return NextResponse.json({ error: "Aucun secret en attente" }, { status: 400 });

  const ok = authenticator.verify({ token: code, secret: user.mfa.tempSecret });
  if (!ok) return NextResponse.json({ error: "Code TOTP invalide" }, { status: 400 });

  user.mfa.totpSecret = user.mfa.tempSecret;
  user.mfa.tempSecret = undefined;
  user.mfa.enabled = true;
  await user.save();

  return NextResponse.json({ ok: true });
}