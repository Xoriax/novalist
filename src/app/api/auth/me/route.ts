import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    
    if (!token) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, secret);
    
    return NextResponse.json({
      email: payload.email,
      role: payload.role,
      id: payload.sub
    });
  } catch {
    return NextResponse.json({ error: "Token invalide" }, { status: 401 });
  }
}