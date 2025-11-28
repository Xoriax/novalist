import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { dbConnect } from "@/lib/db";
import ExcelData from "@/models/ExcelData";
import Ticket from "@/models/Ticket";
import User from "@/models/User";
import * as XLSX from "xlsx";
import { extractTicketIdentifiers, generateTicketLogs } from "@/lib/ticketUtils";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, secret);

    await dbConnect();
    
    // Récupérer le dernier fichier Excel importé
    const excelData = await ExcelData.findOne().sort({ uploadedAt: -1 }).lean() as any;
    
    if (!excelData) {
      return NextResponse.json({ 
        headers: [], 
        data: [], 
        filename: null,
        uploadedBy: null,
        uploadedAt: null,
        rowCount: 0,
        columnCount: 0
      });
    }

    return NextResponse.json({
      headers: excelData.headers || [],
      data: excelData.data || [],
      filename: excelData.filename || null,
      uploadedBy: excelData.uploadedBy || null,
      uploadedAt: excelData.uploadedAt || null,
      rowCount: excelData.rowCount || 0,
      columnCount: excelData.columnCount || 0
    });

  } catch (error) {
    console.error("Erreur lors de la récupération des données Excel:", error);
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
      return NextResponse.json({ error: "Accès refusé - Seuls les administrateurs peuvent importer des fichiers" }, { status: 403 });
    }

    await dbConnect();

    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    // Vérifier que c'est un fichier Excel (par extension car les MIME types peuvent varier)
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedExtensions.includes(fileExtension)) {
      return NextResponse.json({ error: "Type de fichier non supporté. Utilisez .xlsx, .xls ou .csv" }, { status: 400 });
    }

    // Lire le fichier
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Parser le fichier Excel avec options spécifiques pour les anciens formats
    const workbook = XLSX.read(buffer, { 
      type: 'buffer',
      cellDates: true, // Traiter les dates correctement
      cellNF: false, // Ne pas formater les nombres
      cellText: false, // Garder les valeurs brutes
      codepage: 65001 // Force UTF-8 encoding
    });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Fonction pour détecter le début du tableau de données
    function findTableStart(sheet: XLSX.WorkSheet): { startRow: number, startCol: number } {
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
      
      // Convertir toute la feuille en tableau pour analyser
      const fullData = XLSX.utils.sheet_to_json(sheet, { 
        header: 1, 
        raw: true, 
        range: range,
        defval: null 
      }) as unknown[][];

      let bestStartRow = 0;
      let bestStartCol = 0;
      let maxConsistentCols = 0;

      // Chercher la ligne avec le plus de colonnes non-vides consécutives
      for (let row = 0; row < Math.min(fullData.length, 20); row++) { // Limiter la recherche aux 20 premières lignes
        const rowData = fullData[row] || [];
        
        // Trouver le début de colonnes consécutives non-vides
        let startCol = 0;
        while (startCol < rowData.length && (rowData[startCol] === null || rowData[startCol] === undefined || String(rowData[startCol]).trim() === '')) {
          startCol++;
        }
        
        if (startCol >= rowData.length) continue; // Ligne complètement vide
        
        // Compter les colonnes consécutives non-vides à partir de startCol
        let consecutiveCols = 0;
        for (let col = startCol; col < rowData.length; col++) {
          const cellValue = rowData[col];
          if (cellValue !== null && cellValue !== undefined && String(cellValue).trim() !== '') {
            consecutiveCols++;
          } else {
            // Permettre quelques cellules vides au milieu, mais pas plus de 2 consécutives
            let emptyCells = 0;
            let tempCol = col;
            while (tempCol < rowData.length && emptyCells < 3) {
              const tempValue = rowData[tempCol];
              if (tempValue === null || tempValue === undefined || String(tempValue).trim() === '') {
                emptyCells++;
              } else {
                break;
              }
              tempCol++;
            }
            
            if (emptyCells < 3 && tempCol < rowData.length) {
              consecutiveCols += emptyCells;
              col = tempCol - 1; // -1 car le for loop va incrémenter
            } else {
              break;
            }
          }
        }
        
        // Considérer cette ligne comme candidate si elle a au moins 3 colonnes et plus que le précédent meilleur
        if (consecutiveCols >= 3 && consecutiveCols > maxConsistentCols) {
          maxConsistentCols = consecutiveCols;
          bestStartRow = row;
          bestStartCol = startCol;
        }
      }

      return { startRow: bestStartRow, startCol: bestStartCol };
    }

    // Détecter le début du tableau
    const tableStart = findTableStart(worksheet);
    console.log(`Tableau détecté à partir de la ligne ${tableStart.startRow + 1}, colonne ${String.fromCharCode(65 + tableStart.startCol)}`);

    // Définir la plage à partir du début détecté
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    const startCell = XLSX.utils.encode_cell({ r: tableStart.startRow, c: tableStart.startCol });
    const endCell = XLSX.utils.encode_cell({ r: range.e.r, c: range.e.c });
    const adjustedRange = `${startCell}:${endCell}`;

    // Convertir en JSON avec la plage ajustée
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      raw: true, // Garder les valeurs brutes pour préserver les dates/heures
      defval: '', // Valeur par défaut pour les cellules vides
      range: adjustedRange
    });
    
    if (jsonData.length === 0) {
      return NextResponse.json({ error: "Le fichier est vide ou aucun tableau détecté" }, { status: 400 });
    }

    // Extraire les en-têtes (première ligne du tableau détecté) et nettoyer
    const rawHeaders = jsonData[0] as unknown[];
    const headers = rawHeaders.map((h, index) => {
      let header = String(h || `Colonne ${index + 1}`).trim();
      
      // Corriger les problèmes d'encodage dans les en-têtes aussi
      header = header
        .replace(/Ã©/g, 'é')
        .replace(/Ã¨/g, 'è')
        .replace(/Ã /g, 'à')
        .replace(/Ã¢/g, 'â')
        .replace(/Ã´/g, 'ô')
        .replace(/Ã»/g, 'û')
        .replace(/Ã®/g, 'î')
        .replace(/Ã§/g, 'ç')
        .replace(/Ã±/g, 'ñ')
        .replace(/â€™/g, "'")
        .replace(/â€œ/g, '"')
        .replace(/â€/g, '"')
        .replace(/â€¦/g, '...')
        .replace(/â€"/g, '–')
        .replace(/â€"/g, '—');
        
      return header;
    });
    
    // Extraire les données (lignes suivantes) avec validation
    const data = jsonData.slice(1)
      .filter(row => row && (row as unknown[]).some(cell => cell !== null && cell !== undefined && String(cell).trim() !== ''))
      .map((row) => {
        const rowArray = row as unknown[];
        const rowObj: Record<string, unknown> = {};
        let openTimeValue = '';
        
        headers.forEach((header, index) => {
          const cellValue = rowArray[index];
          
          // Capturer Open Time pour l'utiliser dans Open Date
          if (header.toLowerCase() === 'open time' && cellValue instanceof Date) {
            const date = cellValue;
            const day = String(date.getUTCDate()).padStart(2, '0');
            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
            const year = date.getUTCFullYear();
            const hours = String(date.getUTCHours()).padStart(2, '0');
            const minutes = String(date.getUTCMinutes()).padStart(2, '0');
            const seconds = String(date.getUTCSeconds()).padStart(2, '0');
            openTimeValue = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
          }
        });
        
        headers.forEach((header, index) => {
          const cellValue = rowArray[index];
          // Nettoyer et formater les valeurs avec gestion de l'encodage
          if (cellValue === null || cellValue === undefined) {
            rowObj[header] = '';
          } else if (typeof cellValue === 'number') {
            rowObj[header] = cellValue;
          } else if (cellValue instanceof Date) {
            // Si c'est Open Date, extraire uniquement la date de Open Time
            if (header.toLowerCase() === 'open date' && openTimeValue) {
              const [datePart] = openTimeValue.split(' ');
              rowObj[header] = datePart;
            } else {
              // Conserver les dates avec heure au format complet
              const date = cellValue;
              const day = String(date.getUTCDate()).padStart(2, '0');
              const month = String(date.getUTCMonth() + 1).padStart(2, '0');
              const year = date.getUTCFullYear();
              const hours = String(date.getUTCHours()).padStart(2, '0');
              const minutes = String(date.getUTCMinutes()).padStart(2, '0');
              const seconds = String(date.getUTCSeconds()).padStart(2, '0');
              
              // Format DD/MM/YYYY HH:MM:SS
              rowObj[header] = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
            }
          } else {
            // Corriger les problèmes d'encodage UTF-8
            let cleanValue = String(cellValue).trim();
            
            // Remplacer les caractères mal encodés courants
            cleanValue = cleanValue
              .replace(/Ã©/g, 'é')
              .replace(/Ã¨/g, 'è')
              .replace(/Ã /g, 'à')
              .replace(/Ã¢/g, 'â')
              .replace(/Ã´/g, 'ô')
              .replace(/Ã»/g, 'û')
              .replace(/Ã®/g, 'î')
              .replace(/Ã§/g, 'ç')
              .replace(/Ã±/g, 'ñ')
              .replace(/â€™/g, "'")
              .replace(/â€œ/g, '"')
              .replace(/â€/g, '"')
              .replace(/â€¦/g, '...')
              .replace(/â€"/g, '–')
              .replace(/â€"/g, '—');
              
            rowObj[header] = cleanValue;
          }
        });
        return rowObj;
      });

    // Récupérer l'email de l'utilisateur
    const user = await User.findById(payload.uid).lean() as { email?: string } | null;
    const userEmail = user?.email || "unknown";

    // Collecter tous les Customer Reference Numbers du nouveau fichier
    const customerRefsInFile = new Set<string>();
    data.forEach(row => {
      const { customerReferenceNumber } = extractTicketIdentifiers(row, headers);
      if (customerReferenceNumber) {
        customerRefsInFile.add(customerReferenceNumber);
      }
    });

    // Créer les tickets individuels avec leurs logs (sans supprimer les anciens)
    const newTickets = [];
    const updatedTickets = [];
    const skippedTickets = [];
    const batchSize = 100; // Traiter par lots pour optimiser les performances

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      for (let batchIndex = 0; batchIndex < batch.length; batchIndex++) {
        const row = batch[batchIndex];
        const actualIndex = i + batchIndex;
        const { workOrderNumber, customerReferenceNumber } = extractTicketIdentifiers(row, headers);
        
        // Vérifier si un ticket avec ce Customer Reference Number existe déjà
        const existingTicket = await Ticket.findOne({ customerReferenceNumber });
        
        if (!existingTicket) {
          // Le ticket n'existe pas, on peut l'ajouter
          const logs = generateTicketLogs(row, headers);

          const newTicket = {
            workOrderNumber,
            customerReferenceNumber,
            rawData: row,
            logs,
            importedFrom: file.name,
            importedBy: userEmail,
            rowIndex: actualIndex,
            headers,
            status: 'active'
          };

          await Ticket.create(newTicket);
          newTickets.push(newTicket);
        } else {
          // Le ticket existe déjà, vérifier si les données sont identiques
          const existingData = JSON.stringify(existingTicket.rawData);
          const newData = JSON.stringify(row);
          
          if (existingData === newData) {
            // Les données sont identiques, aucune modification mais marquer comme actif
            console.log(`⚠️ Customer Reference Number "${customerReferenceNumber}" (Work Order: ${workOrderNumber}) existe déjà sans modification - Import ignoré`);
            skippedTickets.push({ customerReferenceNumber, workOrderNumber, reason: 'identical' });
            // Marquer comme actif car présent dans le fichier
            existingTicket.status = 'active';
            await existingTicket.save();
          } else {
            // Les données sont différentes, détecter les changements et mettre à jour
            console.log(`🔄 Customer Reference Number "${customerReferenceNumber}" (Work Order: ${workOrderNumber}) existe avec des modifications - Mise à jour en cours`);
            
            const newLogs: Array<{
              id: number;
              date: string;
              type: 'creation' | 'opening' | 'action' | 'assignment';
              description: string;
              action: string;
              icon: string;
              field?: string;
              oldValue?: string;
              newValue?: string;
            }> = [];
            const currentDate = new Date().toLocaleString('fr-FR', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });

            // Comparer chaque champ pour détecter les changements spécifiques
            const statusChanges: { id?: string; desc?: string; oldId?: string; oldDesc?: string } = {};
            let lastCode = '';
            let lastCodeDesc = '';
            let lastActionDate = '';
            let employeeName = '';
            let employeeId = '';
            let assignDateTime = '';
            
            headers.forEach(header => {
              const headerLower = header.toLowerCase();
              const oldValue = existingTicket.rawData[header];
              const newValue = row[header];

              // Ignorer les champs vides ou identiques
              if (oldValue === newValue) return;
              if (!oldValue && !newValue) return;

              // Collecter les informations de statut
              if (headerLower === 'work order status id') {
                statusChanges.oldId = String(oldValue || '');
                statusChanges.id = String(newValue || '');
              } else if (headerLower === 'work order status desc') {
                statusChanges.oldDesc = String(oldValue || '');
                statusChanges.desc = String(newValue || '');
              }
              // Collecter les informations d'employé
              else if (headerLower === 'employee name') {
                employeeName = String(newValue || '');
              } else if (headerLower === 'employee id') {
                employeeId = String(newValue || '');
              } else if (headerLower === 'assign date time') {
                assignDateTime = String(newValue || '');
              }
              // Collecter last action
              else if (headerLower === 'last code') {
                if (newValue) lastCode = String(newValue);
              } else if (headerLower === 'last code desc') {
                if (newValue) lastCodeDesc = String(newValue);
              } else if (headerLower === 'last code date time') {
                lastActionDate = String(newValue || '');
              }
              // Ignorer les changements de disponibilité des pièces (pas de log)
            });

            // 1. Ajouter le log de changement de statut unique (regroupé)
            if (statusChanges.id && (statusChanges.id !== statusChanges.oldId || statusChanges.desc !== statusChanges.oldDesc)) {
              const oldStatus = statusChanges.oldDesc ? `${statusChanges.oldId} - ${statusChanges.oldDesc}` : statusChanges.oldId || 'N/A';
              const newStatus = statusChanges.desc ? `${statusChanges.id} - ${statusChanges.desc}` : statusChanges.id;
              
              // Si le statut passe de TBP à un statut assigné, utiliser Assign Date Time
              const statusDate = (statusChanges.oldId?.includes('TBP') && assignDateTime) 
                ? assignDateTime 
                : currentDate;
              
              newLogs.push({
                id: existingTicket.logs.length + newLogs.length + 1,
                date: statusDate,
                type: 'action',
                action: 'Changement de statut',
                description: `${oldStatus} → ${newStatus}`,
                icon: '📊',
                field: 'Work Order Status',
                oldValue: oldStatus,
                newValue: newStatus
              });
              console.log(`  📊 Statut modifié : "${oldStatus}" → "${newStatus}"`);
            }

            // 2. Ajouter le log d'assignation avec Employee Name, ID et Assign Date Time
            if (employeeName && employeeId) {
              newLogs.push({
                id: existingTicket.logs.length + newLogs.length + 1,
                date: assignDateTime || currentDate,
                type: 'assignment',
                action: 'Assignation',
                description: `Assigné à: ${employeeName} (${employeeId})`,
                icon: '👤',
                field: 'Employee',
                oldValue: '',
                newValue: `${employeeName} (${employeeId})`
              });
              console.log(`  👤 Assigné à : "${employeeName} (${employeeId})" le ${assignDateTime || currentDate}`);
            }

            // 4. Ajouter le log de dernière action avec Last Code Date Time
            if (lastCode || lastCodeDesc) {
              let description = 'Action effectuée';
              if (lastCode && lastCodeDesc) {
                description = `${lastCode} - ${lastCodeDesc}`;
              } else if (lastCode) {
                description = `Code action: ${lastCode}`;
              } else if (lastCodeDesc) {
                description = lastCodeDesc;
              }
              
              newLogs.push({
                id: existingTicket.logs.length + newLogs.length + 1,
                date: lastActionDate || currentDate,
                type: 'action',
                action: 'Dernière action',
                description: description,
                icon: '⚡',
                field: 'Last Action',
                oldValue: '',
                newValue: description
              });
              console.log(`  ⚡ Action : "${description}" le ${lastActionDate || currentDate}`);
            }

            // Mettre à jour le ticket avec les nouvelles données et les nouveaux logs
            if (newLogs.length > 0) {
              existingTicket.rawData = row;
              // Ajouter les nouveaux logs au début pour avoir les plus récents en premier
              existingTicket.logs.unshift(...newLogs);
              existingTicket.importedFrom = file.name;
              existingTicket.importedBy = userEmail;
              existingTicket.headers = headers;
              existingTicket.status = 'active'; // Réactiver le ticket s'il était fermé
              
              await existingTicket.save();
              updatedTickets.push({ 
                customerReferenceNumber, 
                workOrderNumber, 
                changesCount: newLogs.length 
              });
              console.log(`  ✅ ${newLogs.length} modification(s) enregistrée(s)`);
            } else {
              // Même si pas de changements dans les logs, marquer comme actif
              existingTicket.status = 'active';
              await existingTicket.save();
            }
          }
        }
      }
    }

    // Marquer comme fermés les tickets qui ne sont plus dans le fichier
    console.log(`\n📋 Customer Reference Numbers dans le nouveau fichier: ${customerRefsInFile.size}`);
    console.log(`Customer Refs: ${Array.from(customerRefsInFile).slice(0, 5).join(', ')}...`);
    
    // Compter les tickets actifs avant fermeture
    const activeTicketsBeforeClose = await Ticket.countDocuments({ status: 'active' });
    console.log(`Tickets actifs avant fermeture: ${activeTicketsBeforeClose}`);
    
    const closedTicketsResult = await Ticket.updateMany(
      { 
        customerReferenceNumber: { $nin: Array.from(customerRefsInFile) },
        status: 'active'
      },
      { 
        $set: { status: 'closed' }
      }
    );
    
    console.log(`🔒 Tickets fermés: ${closedTicketsResult.modifiedCount}`);

    console.log(`Créé ${newTickets.length} nouveaux tickets, ${updatedTickets.length} tickets mis à jour, ${skippedTickets.length} tickets ignorés, ${closedTicketsResult.modifiedCount} tickets fermés`);

    // Mettre à jour ExcelData avec les données cumulées (seulement les tickets actifs)
    const allTickets = await Ticket.find({ status: 'active' }).lean();
    const allData = allTickets.map(ticket => ticket.rawData);
    const allHeaders = headers; // On garde les headers du dernier import
    
    await ExcelData.deleteMany({});
    const excelData = new ExcelData({
      filename: file.name,
      uploadedBy: userEmail,
      headers: allHeaders,
      data: allData,
      rowCount: allData.length,
      columnCount: allHeaders.length
    });

    await excelData.save();

    return NextResponse.json({ 
      success: true, 
      message: `Fichier importé avec succès. ${newTickets.length} nouveaux tickets ajoutés, ${updatedTickets.length} tickets mis à jour, ${skippedTickets.length} tickets ignorés, ${closedTicketsResult.modifiedCount} tickets fermés.`,
      rowCount: data.length,
      columnCount: headers.length,
      ticketsCreated: newTickets.length,
      ticketsUpdated: updatedTickets.length,
      ticketsSkipped: skippedTickets.length,
      ticketsClosed: closedTicketsResult.modifiedCount,
      totalTickets: allTickets.length,
      filename: file.name
    });

  } catch (error) {
    console.error("Erreur lors de l'import du fichier Excel:", error);
    return NextResponse.json({ error: "Erreur lors du traitement du fichier" }, { status: 500 });
  }
}

export async function DELETE() {
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
    
    // Supprimer toutes les données Excel et tickets
    await ExcelData.deleteMany({});
    await Ticket.deleteMany({});

    return NextResponse.json({ success: true, message: "Données supprimées avec succès" });

  } catch (error) {
    console.error("Erreur lors de la suppression des données Excel:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}