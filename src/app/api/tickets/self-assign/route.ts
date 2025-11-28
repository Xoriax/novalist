import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { dbConnect } from "@/lib/db";
import Ticket from "@/models/Ticket";
import ExcelData from "@/models/ExcelData";
import User from "@/models/User";
import { verifySession } from "@/lib/jwt";

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    
    if (!token) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const payload = await verifySession(token);
    if (!payload) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    await dbConnect();

    // Récupérer l'utilisateur pour obtenir son employé lié
    const user = await User.findOne({ email: payload.email });
    if (!user || !user.employee || !user.employee.linked) {
      return NextResponse.json({ 
        error: "Aucun employé lié à votre compte" 
      }, { status: 400 });
    }

    const { ticketId } = await request.json();

    if (!ticketId) {
      return NextResponse.json(
        { error: "ticketId est requis" },
        { status: 400 }
      );
    }

    // Récupérer le ticket
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket non trouvé" }, { status: 404 });
    }

    // Vérifier que le ticket est en TBP
    const statusIdCol = ticket.headers.find((h: string) => 
      h.toLowerCase().includes('work order status id')
    );
    const currentStatus = statusIdCol ? String(ticket.rawData[statusIdCol] || '') : '';
    
    if (currentStatus !== 'TBP') {
      return NextResponse.json(
        { error: "Seuls les tickets en statut TBP peuvent être récupérés" },
        { status: 400 }
      );
    }

    // Trouver les colonnes nécessaires
    const employeeIdCol = ticket.headers.find((h: string) => 
      h.toLowerCase().includes('employee id')
    );
    const employeeNameCol = ticket.headers.find((h: string) => 
      h.toLowerCase().includes('employee name')
    );
    const statusDescCol = ticket.headers.find((h: string) => 
      h.toLowerCase().includes('work order status desc')
    );
    const assignDateCol = ticket.headers.find((h: string) => 
      h.toLowerCase().includes('assign date time')
    );

    if (!employeeIdCol || !employeeNameCol || !statusIdCol || !statusDescCol) {
      return NextResponse.json(
        { error: "Colonnes requises manquantes dans le ticket" },
        { status: 400 }
      );
    }

    // Mettre à jour les données du ticket
    const now = new Date();
    const assignDateTime = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    ticket.rawData[employeeIdCol] = user.employee.id;
    ticket.rawData[employeeNameCol] = user.employee.name;
    ticket.rawData[statusIdCol] = 'AS';
    ticket.rawData[statusDescCol] = 'Assigned';
    if (assignDateCol) {
      ticket.rawData[assignDateCol] = assignDateTime;
    }
    
    // Marquer rawData comme modifié
    ticket.markModified('rawData');

    // Ajouter un log de changement de statut
    const statusLog = {
      id: ticket.logs.length + 1,
      action: 'Changement de statut',
      description: `Statut changé de TBP à AS - Assigned`,
      date: assignDateTime,
      type: 'action' as const,
      icon: '🔄'
    };

    // Ajouter un log de récupération par l'opérateur
    const selfAssignLog = {
      id: ticket.logs.length + 2,
      action: 'Ticket récupéré',
      description: `${user.employee.name} (${user.employee.id}) a récupéré le ticket`,
      date: assignDateTime,
      type: 'assignment' as const,
      icon: '🎯'
    };

    // Ajouter les logs (du plus récent au plus ancien)
    ticket.logs.unshift(selfAssignLog);
    ticket.logs.unshift(statusLog);

    // Sauvegarder le ticket
    await ticket.save();

    // Régénérer ExcelData
    const allActiveTickets = await Ticket.find({ status: 'active' }).lean();
    const allData = allActiveTickets.map(t => t.rawData);
    
    await ExcelData.deleteMany({});
    await ExcelData.create({
      filename: allActiveTickets[0]?.importedFrom || 'data.xlsx',
      uploadedBy: allActiveTickets[0]?.importedBy || 'system',
      uploadedAt: new Date(),
      headers: ticket.headers,
      data: allData,
      rowCount: allData.length,
      columnCount: ticket.headers.length
    });

    return NextResponse.json({
      success: true,
      message: "Ticket récupéré avec succès",
      ticket: {
        _id: ticket._id,
        workOrderNumber: ticket.workOrderNumber,
        customerReferenceNumber: ticket.customerReferenceNumber,
        assignedTo: { id: user.employee.id, name: user.employee.name },
        status: 'AS',
        assignDateTime
      }
    });

  } catch (error) {
    console.error("Erreur lors de la récupération du ticket:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la récupération" },
      { status: 500 }
    );
  }
}
