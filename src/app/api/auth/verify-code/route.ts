import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import crypto from "crypto";
import LoginToken from "@/models/LoginToken";
import User from "@/models/User";
import AllowedEmail from "@/models/AllowedEmail";
import { signSession } from "@/lib/jwt";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { email, code } = await req.json();
    if (!email || !code) return NextResponse.json({ error: "Email et code requis" }, { status: 400 });

    // Vérifier le code email
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");
    const token = await LoginToken.findOneAndDelete({
      email: email.toLowerCase(),
      codeHash,
      expiresAt: { $gt: new Date() }
    });

    if (!token) return NextResponse.json({ error: "Code invalide ou expiré" }, { status: 401 });

    // Vérifier si l'email est autorisé
    const allowed = await AllowedEmail.findOne({ email: email.toLowerCase() });
    if (!allowed) return NextResponse.json({ error: "Email non autorisé" }, { status: 403 });

    // Créer ou mettre à jour l'utilisateur
    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      user = await User.create({
        email: email.toLowerCase(),
        role: allowed.defaultRole || "user",
        mfa: { enabled: false }
      });
    }

    // Si l'utilisateur a MFA activé, créer une session pré-auth
    if (user.mfa?.enabled) {
      const preToken = await signSession({ uid: user._id.toString(), role: user.role, email: user.email }, 0.25); // 15 minutes
      const cookieStore = await cookies();
      cookieStore.set("preauth", preToken, {
        httpOnly: true, sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/", maxAge: 15 * 60, // 15 minutes
      });
      return NextResponse.json({ requiresMFA: true });
    }

    // Sinon, créer une session complète
    const sessionToken = await signSession({ uid: user._id.toString(), role: user.role, email: user.email }, 24);
    const cookieStore = await cookies();
    cookieStore.set("session", sessionToken, {
      httpOnly: true, sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/", maxAge: 24 * 60 * 60,
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("verify-code error:", err);
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}