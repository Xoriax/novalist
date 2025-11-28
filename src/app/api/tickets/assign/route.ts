import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { dbConnect } from "@/lib/db";
import Ticket from "@/models/Ticket";
import ExcelData from "@/models/ExcelData";
import { verifySession } from "@/lib/jwt";

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification et le rôle admin
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    
    if (!token) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const payload = await verifySession(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Accès refusé - Admin uniquement" }, { status: 403 });
    }

    const { ticketId, employeeId, employeeName } = await request.json();

    if (!ticketId || !employeeId || !employeeName) {
      return NextResponse.json(
        { error: "ticketId, employeeId et employeeName sont requis" },
        { status: 400 }
      );
    }

    await dbConnect();

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
        { error: "Seuls les tickets en statut TBP peuvent être assignés" },
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

    console.log('Colonnes trouvées:', { employeeIdCol, employeeNameCol, statusIdCol, statusDescCol, assignDateCol });
    console.log('Données avant modification:', {
      employeeId: ticket.rawData[employeeIdCol],
      employeeName: ticket.rawData[employeeNameCol],
      status: ticket.rawData[statusIdCol],
      statusDesc: ticket.rawData[statusDescCol]
    });

    // Mettre à jour les données du ticket
    const now = new Date();
    const assignDateTime = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    ticket.rawData[employeeIdCol] = employeeId;
    ticket.rawData[employeeNameCol] = employeeName;
    ticket.rawData[statusIdCol] = 'AS';
    ticket.rawData[statusDescCol] = 'Assigned';
    if (assignDateCol) {
      ticket.rawData[assignDateCol] = assignDateTime;
    }
    
    // Marquer rawData comme modifié (requis pour les champs Mixed de Mongoose)
    ticket.markModified('rawData');
    
    console.log('Données après modification:', {
      employeeId: ticket.rawData[employeeIdCol],
      employeeName: ticket.rawData[employeeNameCol],
      status: ticket.rawData[statusIdCol],
      statusDesc: ticket.rawData[statusDescCol]
    });

    // Ajouter un log de changement de statut
    const statusLog = {
      id: ticket.logs.length + 1,
      action: 'Changement de statut',
      description: `Statut changé de TBP à AS - Assigned`,
      date: assignDateTime,
      type: 'action' as const,
      icon: '🔄'
    };

    // Ajouter un log d'assignation
    const assignLog = {
      id: ticket.logs.length + 2,
      action: 'Assignation',
      description: `Ticket assigné à ${employeeName} (${employeeId})`,
      date: assignDateTime,
      type: 'assignment' as const,
      icon: '👤'
    };

    // Ajouter un log pour l'admin qui a effectué l'assignation
    const adminLog = {
      id: ticket.logs.length + 3,
      action: 'Attribué par',
      description: `Assignation effectuée par ${payload.email}`,
      date: assignDateTime,
      type: 'action' as const,
      icon: '👨‍💼'
    };

    // Ajouter les logs (du plus récent au plus ancien)
    ticket.logs.unshift(adminLog);
    ticket.logs.unshift(assignLog);
    ticket.logs.unshift(statusLog);

    // Sauvegarder le ticket
    const savedTicket = await ticket.save();
    
    console.log('Ticket sauvegardé avec succès. Status:', savedTicket.rawData[statusIdCol]);

    // Régénérer ExcelData avec toutes les données des tickets actifs pour que le dashboard se mette à jour
    const allActiveTickets = await Ticket.find({ status: 'active' }).lean();
    const allData = allActiveTickets.map(t => t.rawData);
    
    // Mettre à jour ExcelData avec un nouveau timestamp pour déclencher le polling
    await ExcelData.deleteMany({});
    await ExcelData.create({
      filename: allActiveTickets[0]?.importedFrom || 'data.xlsx',
      uploadedBy: allActiveTickets[0]?.importedBy || 'system',
      uploadedAt: new Date(), // Timestamp actuel pour le polling
      headers: ticket.headers,
      data: allData,
      rowCount: allData.length,
      columnCount: ticket.headers.length
    });
    
    console.log('ExcelData régénéré avec', allData.length, 'tickets actifs');

    return NextResponse.json({
      success: true,
      message: "Ticket assigné avec succès",
      ticket: {
        _id: ticket._id,
        workOrderNumber: ticket.workOrderNumber,
        customerReferenceNumber: ticket.customerReferenceNumber,
        assignedTo: { id: employeeId, name: employeeName },
        status: 'AS',
        assignDateTime
      }
    });

  } catch (error) {
    console.error("Erreur lors de l'assignation du ticket:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de l'assignation" },
      { status: 500 }
    );
  }
}
