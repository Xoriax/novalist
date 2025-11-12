import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { dbConnect } from "@/lib/db";
import ExcelData from "@/models/ExcelData";
import User from "@/models/User";
import * as XLSX from "xlsx";

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
    
    // Convertir en JSON avec options pour compatibilité maximale
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      raw: false, // Convertir toutes les valeurs en string pour uniformité
      dateNF: 'yyyy-mm-dd', // Format de date standardisé
      defval: '' // Valeur par défaut pour les cellules vides
    });
    
    if (jsonData.length === 0) {
      return NextResponse.json({ error: "Le fichier est vide" }, { status: 400 });
    }

    // Extraire les en-têtes (première ligne) et nettoyer
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

    // Sauvegarder les nouvelles données
    const excelData = new ExcelData({
      filename: file.name,
      uploadedBy: userEmail,
      headers: headers,
      data: data,
      rowCount: data.length,
      columnCount: headers.length
    });

    await excelData.save();

    return NextResponse.json({ 
      success: true, 
      message: "Fichier importé avec succès",
      rowCount: data.length,
      columnCount: headers.length,
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
    
    // Supprimer toutes les données Excel
    await ExcelData.deleteMany({});

    return NextResponse.json({ success: true, message: "Données supprimées avec succès" });

  } catch (error) {
    console.error("Erreur lors de la suppression des données Excel:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}