import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { dbConnect } from "@/lib/db";
import Ticket from "@/models/Ticket";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    await jwtVerify(token, secret);
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const workOrderNumber = searchParams.get('workOrderNumber');
    const customerReference = searchParams.get('customerReference'); // Paramètre d'entrée
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Si on cherche un ticket spécifique, retourner juste ce ticket
    const ticketId = searchParams.get('ticketId');
    const singleTicket = searchParams.get('singleTicket') === 'true';
    
    if (singleTicket && (ticketId || workOrderNumber || customerReference)) {
      console.log("GET /api/tickets - recherche d'un ticket spécifique");
      console.log("Paramètres reçus:", { ticketId, workOrderNumber, customerReference });
      let ticket;
      
      if (ticketId) {
        console.log("Recherche par ticketId:", ticketId);
        ticket = await Ticket.findById(ticketId).lean();
      } else if (workOrderNumber || customerReference) {
        const query: Record<string, unknown> = {};
        
        // Recherche flexible - essayer plusieurs variantes
        const orConditions: any[] = [];
        
        if (workOrderNumber) {
          // Essayer recherche exacte ET contient
          orConditions.push(
            { workOrderNumber: workOrderNumber },
            { workOrderNumber: { $regex: workOrderNumber, $options: 'i' } },
            { 'rawData.Work Order Number': workOrderNumber },
            { 'rawData.Work Order Number': { $regex: workOrderNumber, $options: 'i' } }
          );
        }
        
        if (customerReference) {
          // Essayer recherche exacte ET contient pour customerReference
          orConditions.push(
            { customerReferenceNumber: customerReference },
            { customerReferenceNumber: { $regex: customerReference, $options: 'i' } },
            { 'rawData.Customer Reference Number': customerReference },
            { 'rawData.Customer Reference Number': { $regex: customerReference, $options: 'i' } }
          );
        }
        
        if (orConditions.length > 0) {
          query.$or = orConditions;
        }
        
        console.log("Recherche par query:", JSON.stringify(query, null, 2));
        ticket = await Ticket.findOne(query).lean();
        
        // Si pas trouvé, essayer avec $and au lieu de $or
        if (!ticket && workOrderNumber && customerReference) {
          const andQuery = {
            $and: [
              {
                $or: [
                  { workOrderNumber: workOrderNumber },
                  { 'rawData.Work Order Number': workOrderNumber }
                ]
              },
              {
                $or: [
                  { customerReferenceNumber: customerReference },
                  { 'rawData.Customer Reference Number': customerReference }
                ]
              }
            ]
          };
          console.log("Recherche alternative avec $and:", JSON.stringify(andQuery, null, 2));
          ticket = await Ticket.findOne(andQuery).lean();
        }
      }
      
      console.log("Ticket trouvé:", ticket ? "oui" : "non");
      if (ticket) {
        console.log("Détails du ticket trouvé:", {
          _id: (ticket as any)._id,
          workOrderNumber: (ticket as any).workOrderNumber,
          customerReferenceNumber: (ticket as any).customerReferenceNumber,
          rawWorkOrder: (ticket as any).rawData?.['Work Order Number'],
          rawCustomerRef: (ticket as any).rawData?.['Customer Reference Number']
        });
      }
      
      if (!ticket) {
        return NextResponse.json({ error: "Ticket non trouvé" }, { status: 404 });
      }
      
      return NextResponse.json({ ticket });
    }

    // Sinon, logique de recherche normale avec pagination
    const query: Record<string, unknown> = {};

    if (search) {
      // Recherche globale dans workOrderNumber et customerReferenceNumber
      query.$or = [
        { workOrderNumber: { $regex: search, $options: 'i' } },
        { customerReferenceNumber: { $regex: search, $options: 'i' } }
      ];
    } else {
      // Recherche spécifique
      if (workOrderNumber) {
        query.workOrderNumber = { $regex: workOrderNumber, $options: 'i' };
      }
      if (customerReference) {
        query.customerReferenceNumber = { $regex: customerReference, $options: 'i' };
      }
    }

    // Récupérer les tickets avec pagination
    const tickets = await Ticket.find(query)
      .sort({ importedAt: -1 }) // Plus récents en premier
      .skip(skip)
      .limit(limit)
      .lean();

    // Compter le total pour la pagination
    const totalTickets = await Ticket.countDocuments(query);
    const totalPages = Math.ceil(totalTickets / limit);

    return NextResponse.json({
      tickets,
      pagination: {
        currentPage: page,
        totalPages,
        totalTickets,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error("Erreur lors de la récupération des tickets:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST peut être utilisé pour créer de nouveaux tickets si nécessaire
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    await jwtVerify(token, secret);
    await dbConnect();

    // Logique pour créer un nouveau ticket si nécessaire
    return NextResponse.json({ message: "POST endpoint disponible pour créer des tickets" }, { status: 501 });

  } catch (error) {
    console.error("Erreur POST tickets:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}