import mongoose from "mongoose";

const ExcelDataSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
  },
  uploadedBy: {
    type: String,
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  headers: [{
    type: String,
    required: true,
  }],
  data: [{
    type: mongoose.Schema.Types.Mixed,
    required: true,
  }],
  rowCount: {
    type: Number,
    required: true,
  },
  columnCount: {
    type: Number,
    required: true,
  },
});

const ExcelData = mongoose.models.ExcelData || mongoose.model("ExcelData", ExcelDataSchema);

export default ExcelData;