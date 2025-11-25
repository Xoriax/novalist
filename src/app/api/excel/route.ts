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
        headers.forEach((header, index) => {
          const cellValue = rowArray[index];
          // Nettoyer et formater les valeurs avec gestion de l'encodage
          if (cellValue === null || cellValue === undefined) {
            rowObj[header] = '';
          } else if (typeof cellValue === 'number') {
            rowObj[header] = cellValue;
          } else if (cellValue instanceof Date) {
            // Conserver les dates avec heure au format complet
            const date = cellValue;
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            
            // Format DD/MM/YYYY HH:MM:SS
            rowObj[header] = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
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

    // Supprimer les anciennes données
    await ExcelData.deleteMany({});
    await Ticket.deleteMany({}); // Supprimer aussi les anciens tickets

    // Sauvegarder les nouvelles données Excel (pour compatibilité)
    const excelData = new ExcelData({
      filename: file.name,
      uploadedBy: userEmail,
      headers: headers,
      data: data,
      rowCount: data.length,
      columnCount: headers.length
    });

    await excelData.save();

    // Créer les tickets individuels avec leurs logs
    const tickets = [];
    const batchSize = 100; // Traiter par lots pour optimiser les performances

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const batchTickets = batch.map((row, batchIndex) => {
        const actualIndex = i + batchIndex;
        const { workOrderNumber, customerReferenceNumber } = extractTicketIdentifiers(row, headers);
        const logs = generateTicketLogs(row, headers);

        return {
          workOrderNumber,
          customerReferenceNumber,
          rawData: row,
          logs,
          importedFrom: file.name,
          importedBy: userEmail,
          rowIndex: actualIndex,
          headers
        };
      });

      // Insérer le lot de tickets
      await Ticket.insertMany(batchTickets);
      tickets.push(...batchTickets);
    }

    console.log(`Créé ${tickets.length} tickets avec logs automatiques`);

    return NextResponse.json({ 
      success: true, 
      message: "Fichier importé avec succès",
      rowCount: data.length,
      columnCount: headers.length,
      ticketsCreated: tickets.length,
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