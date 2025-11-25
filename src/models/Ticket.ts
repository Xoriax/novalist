import mongoose from "mongoose";

interface TicketLog {
  id: number;
  action: string;
  description: string;
  date: string;
  type: 'creation' | 'opening' | 'action' | 'assignment';
  icon: string;
}

const TicketLogSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
  },
  action: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['creation', 'opening', 'action', 'assignment'],
    required: true,
  },
  icon: {
    type: String,
    required: true,
  },
});

const TicketSchema = new mongoose.Schema({
  // Identifiants uniques du ticket
  workOrderNumber: {
    type: String,
    index: true,
  },
  customerReferenceNumber: {
    type: String,
    index: true,
  },
  
  // Données brutes du ticket (tous les champs Excel)
  rawData: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  
  // Logs générés automatiquement
  logs: [TicketLogSchema],
  
  // Métadonnées
  importedFrom: {
    type: String,
    required: true, // nom du fichier Excel
  },
  importedAt: {
    type: Date,
    default: Date.now,
  },
  importedBy: {
    type: String,
    required: true, // email de l'utilisateur
  },
  
  // Index de la ligne dans le fichier Excel original
  rowIndex: {
    type: Number,
    required: true,
  },
  
  // Headers du fichier Excel pour référence
  headers: [{
    type: String,
    required: true,
  }],
});

// Index composé pour recherche rapide
TicketSchema.index({ workOrderNumber: 1, customerReferenceNumber: 1 });
TicketSchema.index({ importedFrom: 1, rowIndex: 1 });

const Ticket = mongoose.models.Ticket || mongoose.model("Ticket", TicketSchema);

export default Ticket;
export type { TicketLog };