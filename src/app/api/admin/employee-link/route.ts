import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import ExcelData from "@/models/ExcelData";

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

    // Récupérer tous les utilisateurs avec leurs informations employee
    const users = await User.find({}, { 
      email: 1, 
      role: 1, 
      employee: 1,
      createdAt: 1 
    }).lean();

    // Récupérer les employés disponibles du fichier Excel
    const excelData = await ExcelData.findOne().sort({ uploadedAt: -1 }).lean() as {
      headers: string[];
      data: Record<string, unknown>[];
    } | null;
    const availableEmployees: Array<{id: string, name: string, fullKey: string}> = [];

    if (excelData && excelData.headers && excelData.data) {
      const employeeIdIndex = excelData.headers.findIndex((header: string) => 
        header.toLowerCase().includes('employee id') || header.toLowerCase().includes('employeeid')
      );
      const employeeNameIndex = excelData.headers.findIndex((header: string) => 
        header.toLowerCase().includes('employee name') || header.toLowerCase().includes('employeename')
      );

      if (employeeIdIndex !== -1 && employeeNameIndex !== -1) {
        const employeeIdHeader = excelData.headers[employeeIdIndex];
        const employeeNameHeader = excelData.headers[employeeNameIndex];
        
        const uniqueEmployees = new Set<string>();
        
        excelData.data.forEach((row: Record<string, unknown>) => {
          const id = String(row[employeeIdHeader] || '').trim();
          const name = String(row[employeeNameHeader] || '').trim();
          
          if (id && name) {
            const fullKey = `${id}-${name}`;
            if (!uniqueEmployees.has(fullKey)) {
              uniqueEmployees.add(fullKey);
              availableEmployees.push({ id, name, fullKey });
            }
          }
        });
        
        availableEmployees.sort((a, b) => a.name.localeCompare(b.name));
      }
    }

    return NextResponse.json({
      users: users.map(user => ({
        id: user._id,
        email: user.email,
        role: user.role,
        employee: user.employee || null,
        createdAt: user.createdAt
      })),
      availableEmployees
    });

  } catch (error) {
    console.error("Erreur lors de la récupération des liaisons:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: Request) {
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

    const { userEmail, employeeId, employeeName } = await req.json();

    if (!userEmail) {
      return NextResponse.json({ error: "Email utilisateur requis" }, { status: 400 });
    }

    await dbConnect();

    // Si employeeId et employeeName sont fournis, créer la liaison
    if (employeeId && employeeName) {
      // Vérifier que l'employé n'est pas déjà lié à un autre utilisateur
      const existingLink = await User.findOne({
        "employee.id": employeeId,
        "employee.name": employeeName,
        "employee.linked": true,
        email: { $ne: userEmail }
      });

      if (existingLink) {
        return NextResponse.json({ 
          error: `Cet employé est déjà lié à ${existingLink.email}` 
        }, { status: 400 });
      }

      // Mettre à jour l'utilisateur avec la liaison
      const updatedUser = await User.findOneAndUpdate(
        { email: userEmail },
        {
          $set: {
            "employee.id": employeeId,
            "employee.name": employeeName,
            "employee.linked": true
          }
        },
        { new: true }
      );

      if (!updatedUser) {
        return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true, 
        message: `${userEmail} a été lié à l'employé ${employeeId}-${employeeName}`,
        user: {
          id: updatedUser._id,
          email: updatedUser.email,
          role: updatedUser.role,
          employee: updatedUser.employee
        }
      });
    } else {
      // Supprimer la liaison (unlinking)
      const updatedUser = await User.findOneAndUpdate(
        { email: userEmail },
        {
          $unset: {
            "employee": 1
          }
        },
        { new: true }
      );

      if (!updatedUser) {
        return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true, 
        message: `La liaison de ${userEmail} a été supprimée`,
        user: {
          id: updatedUser._id,
          email: updatedUser.email,
          role: updatedUser.role,
          employee: null
        }
      });
    }

  } catch (error) {
    console.error("Erreur lors de la mise à jour de la liaison:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}