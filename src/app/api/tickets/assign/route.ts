import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { dbConnect } from "@/lib/db";
import Ticket from "@/models/Ticket";
import ExcelData from "@/models/ExcelData";
import { verifySession } from "@/lib/jwt";
import User from "@/models/User";

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

    const { ticketId, employeeId, employeeName } = await request.json();

    if (!ticketId || !employeeId || !employeeName) {
      return NextResponse.json(
        { error: "ticketId, employeeId et employeeName sont requis" },
        { status: 400 }
      );
    }
    
    await dbConnect();
    
    // Vérification des permissions :
    // - Admin peut transférer n'importe quel ticket vers n'importe quel opérateur
    // - Opérateur peut uniquement récupérer un ticket pour lui-même
    if (payload.role !== "admin") {
      // Si ce n'est pas un admin, récupérer l'utilisateur pour vérifier son employé lié
      const user = await User.findById(payload.uid);
      if (!user || !user.employee?.linked || !user.employee?.id) {
        return NextResponse.json(
          { error: "Vous devez avoir un compte employé lié" },
          { status: 403 }
        );
      }
      
      // Vérifier que l'opérateur récupère le ticket pour lui-même
      if (user.employee.id !== employeeId) {
        return NextResponse.json(
          { error: "Vous ne pouvez récupérer un ticket que pour vous-même" },
          { status: 403 }
        );
      }
    }

    // Récupérer le ticket
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket non trouvé" }, { status: 404 });
    }

    // Trouver les colonnes nécessaires
    const statusIdCol = ticket.headers.find((h: string) => 
      h.toLowerCase().includes('work order status id')
    );
    const currentStatus = statusIdCol ? String(ticket.rawData[statusIdCol] || '') : '';
    
    // Trouver les colonnes employé
    const employeeIdCol = ticket.headers.find((h: string) => 
      h.toLowerCase().includes('employee id')
    );
    const employeeNameCol = ticket.headers.find((h: string) => 
      h.toLowerCase().includes('employee name')
    );
    
    // Déterminer si c'est un transfert (ticket déjà assigné à un employé)
    const currentEmployeeId = employeeIdCol ? String(ticket.rawData[employeeIdCol] || '').trim() : '';
    const currentEmployeeName = employeeNameCol ? String(ticket.rawData[employeeNameCol] || '').trim() : '';
    const isTransfer = currentEmployeeId !== '' && currentEmployeeName !== '';
    
    // Vérification de sécurité : ne pas permettre d'assigner/transférer un ticket fermé
    if (ticket.status === 'closed') {
      return NextResponse.json(
        { error: "Impossible d'assigner ou transférer un ticket fermé" },
        { status: 400 }
      );
    }
    
    const oldEmployeeId = isTransfer ? currentEmployeeId : null;
    const oldEmployeeName = isTransfer ? currentEmployeeName : null;
    
    console.log('Type d\'opération:', isTransfer ? 'TRANSFERT' : 'ASSIGNATION');
    console.log('Ancien employé:', oldEmployeeName, '(', oldEmployeeId, ')');
    console.log('Nouvel employé:', employeeName, '(', employeeId, ')');

    // Si c'est un transfert, vérifier la règle des 24h sur "Last Code Date Time"
    if (isTransfer) {
      const lastCodeDateTimeCol = ticket.headers.find((h: string) => 
        h.toLowerCase().includes('last code date time')
      );
      
      if (lastCodeDateTimeCol && ticket.rawData[lastCodeDateTimeCol]) {
        const lastCodeDateTimeStr = String(ticket.rawData[lastCodeDateTimeCol]);
        console.log('Last Code Date Time:', lastCodeDateTimeStr);
        
        // Parser la date au format "DD/MM/YYYY HH:MM:SS"
        try {
          const [datePart, timePart] = lastCodeDateTimeStr.split(' ');
          const [day, month, year] = datePart.split('/').map(Number);
          const [hours, minutes, seconds] = timePart.split(':').map(Number);
          
          const lastCodeDateTime = new Date(year, month - 1, day, hours, minutes, seconds);
          const now = new Date();
          const diffInHours = (now.getTime() - lastCodeDateTime.getTime()) / (1000 * 60 * 60);
          
          console.log('Dernière action:', lastCodeDateTime.toISOString());
          console.log('Date actuelle:', now.toISOString());
          console.log('Différence en heures:', diffInHours.toFixed(2));
          
          if (diffInHours < 24) {
            const hoursRemaining = (24 - diffInHours).toFixed(1);
            return NextResponse.json(
              { 
                error: `Impossible de transférer ce ticket. La dernière action date de moins de 24h (${diffInHours.toFixed(1)}h). Attendez encore ${hoursRemaining}h avant de pouvoir transférer ce ticket.`,
                lastCodeDateTime: lastCodeDateTimeStr,
                hoursElapsed: diffInHours.toFixed(2),
                hoursRemaining: hoursRemaining
              },
              { status: 400 }
            );
          }
          
          console.log('✅ Transfert autorisé - Plus de 24h écoulées depuis la dernière action');
        } catch (error) {
          console.error('Erreur lors du parsing de Last Code Date Time:', error);
          // En cas d'erreur de parsing, on autorise le transfert (fallback sécurisé)
        }
      } else {
        console.log('⚠️ Pas de Last Code Date Time trouvé - Transfert autorisé par défaut');
      }
    }

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

    // Créer les logs selon le type d'opération
    let logCounter = ticket.logs.length + 1;
    const logsToAdd = [];

    if (isTransfer) {
      // Logs pour un transfert de ticket
      logsToAdd.push({
        id: logCounter++,
        action: 'Transfert de ticket',
        description: `Transféré de ${oldEmployeeName} (ID: ${oldEmployeeId}) vers ${employeeName} (ID: ${employeeId})`,
        date: assignDateTime,
        type: 'assignment' as const,
        icon: '🔀'
      });

      logsToAdd.push({
        id: logCounter++,
        action: 'Transfert par admin',
        description: `Opération effectuée par ${payload.email}`,
        date: assignDateTime,
        type: 'action' as const,
        icon: '👨‍💼'
      });
    } else {
      // Logs pour une assignation initiale
      if (currentStatus === 'TBP') {
        logsToAdd.push({
          id: logCounter++,
          action: 'Changement de statut',
          description: `Statut changé de ${currentStatus} à AS - Assigned`,
          date: assignDateTime,
          type: 'action' as const,
          icon: '🔄'
        });
      }

      logsToAdd.push({
        id: logCounter++,
        action: 'Assignation initiale',
        description: `Ticket assigné à ${employeeName} (ID: ${employeeId})`,
        date: assignDateTime,
        type: 'assignment' as const,
        icon: '👤'
      });

      logsToAdd.push({
        id: logCounter++,
        action: 'Assigné par admin',
        description: `Opération effectuée par ${payload.email}`,
        date: assignDateTime,
        type: 'action' as const,
        icon: '👨‍💼'
      });
    }

    // Ajouter tous les logs (du plus récent au plus ancien)
    ticket.logs.unshift(...logsToAdd.reverse());

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
      message: isTransfer 
        ? `Ticket transféré avec succès de ${oldEmployeeName} à ${employeeName}` 
        : `Ticket assigné avec succès à ${employeeName}`,
      isTransfer,
      ticket: {
        _id: ticket._id,
        workOrderNumber: ticket.workOrderNumber,
        customerReferenceNumber: ticket.customerReferenceNumber,
        assignedTo: { id: employeeId, name: employeeName },
        previousAssignedTo: isTransfer ? { id: oldEmployeeId, name: oldEmployeeName } : null,
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
