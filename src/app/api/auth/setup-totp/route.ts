import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { verifySession } from "@/lib/jwt";
import { cookies } from "next/headers";
import { authenticator } from "otplib";
import QRCode from "qrcode";

export async function POST() {
  await dbConnect();
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const payload = await verifySession(session).catch(() => null);
  if (!payload) return NextResponse.json({ error: "Session invalide" }, { status: 401 });

  const user = await User.findById(payload.uid);
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const secret = authenticator.generateSecret();
  user.mfa.tempSecret = secret;
  await user.save();

  const label = `${process.env.APP_NAME}:${user.email}`;
  const otpauth = authenticator.keyuri(user.email, process.env.APP_NAME || "novilist", secret);
  const qrDataUrl = await QRCode.toDataURL(otpauth);

  return NextResponse.json({ otpauth, qrDataUrl });
}