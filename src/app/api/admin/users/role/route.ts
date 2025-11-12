import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { verifySession } from "@/lib/jwt";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  await dbConnect();
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const payload = await verifySession(token).catch(() => null);
  if (!payload || payload.role !== "admin")
    return NextResponse.json({ error: "Interdit" }, { status: 403 });

  const { email, role } = await req.json();
  if (!email || !role) return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
  if (!["admin", "user"].includes(role)) return NextResponse.json({ error: "Rôle invalide" }, { status: 400 });

  const target = await User.findOne({ email: email.toLowerCase() });
  if (!target) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  if (target.role === "admin" && target.email !== email.toLowerCase()) {
    return NextResponse.json({ error: "Impossible de modifier un autre admin" }, { status: 403 });
  }

  target.role = role;
  await target.save();
  return NextResponse.json({ ok: true });
}