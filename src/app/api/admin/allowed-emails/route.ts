import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import AllowedEmail from "@/models/AllowedEmail";
import User from "@/models/User";
import { verifySession } from "@/lib/jwt";
import { cookies } from "next/headers";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) throw new Error("401");
  const payload = await verifySession(token).catch(() => null);
  if (!payload || payload.role !== "admin") throw new Error("403");
  return payload;
}

export async function GET() {
  await dbConnect();
  try {
    await requireAdmin();
    const list = await AllowedEmail.find().sort({ createdAt: -1 });
    return NextResponse.json(list);
  } catch (e) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

export async function POST(req: Request) {
  await dbConnect();
  try {
    const admin = await requireAdmin();
    const { email, defaultRole = "user", note } = await req.json();
    if (!email) return NextResponse.json({ error: "Email requis" }, { status: 400 });
    
    // Ajouter l'email autorisé
    const doc = await AllowedEmail.findOneAndUpdate(
      { email: email.toLowerCase() },
      { email: email.toLowerCase(), defaultRole, note, addedBy: admin.uid },
      { upsert: true, new: true }
    );
    
    // Créer automatiquement un utilisateur correspondant s'il n'existe pas
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (!existingUser) {
      await User.create({
        email: email.toLowerCase(),
        role: defaultRole,
        createdAt: new Date(),
        lastLogin: null
      });
    } else {
      // Mettre à jour le rôle de l'utilisateur existant si différent
      if (existingUser.role !== defaultRole) {
        await User.updateOne(
          { email: email.toLowerCase() },
          { role: defaultRole }
        );
      }
    }
    
    return NextResponse.json(doc);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

export async function DELETE(req: Request) {
  await dbConnect();
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    if (!email) return NextResponse.json({ error: "Email manquant" }, { status: 400 });
    
    // Supprimer l'email autorisé
    await AllowedEmail.deleteOne({ email: email.toLowerCase() });
    
    // Supprimer automatiquement l'utilisateur correspondant
    await User.deleteOne({ email: email.toLowerCase() });
    
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}