import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import AllowedEmail from "@/models/AllowedEmail";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, secret);
    
    if (payload.role !== "admin") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    await dbConnect();
    
    const users = await User.find({}, { password: 0, totpSecret: 0 }).lean();
    
    const formattedUsers = users.map((user) => {
      const userObj = user as unknown as {
        _id: { toString: () => string };
        email: string;
        role?: string;
        createdAt?: Date;
      };
      
      return {
        id: userObj._id.toString(),
        email: userObj.email,
        role: userObj.role || "user",
        createdAt: userObj.createdAt
      };
    });

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, secret);
    
    if (payload.role !== "admin") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    await dbConnect();
    
    // Vérifier que l'utilisateur à supprimer existe
    const userToDelete = await User.findOne({ email: email.toLowerCase() });
    if (!userToDelete) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // Empêcher la suppression de son propre compte admin
    if (payload.email === email.toLowerCase() && userToDelete.role === "admin") {
      return NextResponse.json({ error: "Impossible de supprimer votre propre compte administrateur" }, { status: 403 });
    }

    // Supprimer l'utilisateur
    await User.deleteOne({ email: email.toLowerCase() });
    
    // Supprimer automatiquement l'email autorisé correspondant
    await AllowedEmail.deleteOne({ email: email.toLowerCase() });

    return NextResponse.json({ success: true, message: "Utilisateur supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}