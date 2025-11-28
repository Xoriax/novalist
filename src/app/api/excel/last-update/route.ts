import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import ExcelData from "@/models/ExcelData";

export async function GET() {
  try {
    await dbConnect();

    // Récupérer le dernier ExcelData pour obtenir son timestamp
    const latestData = await ExcelData.findOne().sort({ uploadedAt: -1 }).select('uploadedAt').lean();

    if (!latestData) {
      return NextResponse.json({
        lastUpdate: null,
        message: "Aucune donnée trouvée"
      });
    }

    return NextResponse.json({
      lastUpdate: latestData.uploadedAt,
      timestamp: new Date(latestData.uploadedAt).getTime()
    });

  } catch (error) {
    console.error("Erreur lors de la récupération du dernier timestamp:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
