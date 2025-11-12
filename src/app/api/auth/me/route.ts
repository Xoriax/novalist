import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    
    if (!token) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, secret);
    
    // Récupérer les données complètes de l'utilisateur depuis la base de données
    await dbConnect();
    const user = await User.findById(payload.sub).lean() as {
      email: string;
      role: string;
      _id: string;
      employee?: {
        id?: string;
        name?: string;
        linked?: boolean;
      };
    } | null;
    
    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }
    
    return NextResponse.json({
      email: user.email,
      role: user.role,
      id: user._id,
      employee: user.employee || null
    });
  } catch {
    return NextResponse.json({ error: "Token invalide" }, { status: 401 });
  }
}