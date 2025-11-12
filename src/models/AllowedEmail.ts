import { Schema, model, models } from "mongoose";

const AllowedEmailSchema = new Schema(
  {
    email: { type: String, unique: true, index: true, required: true },
    defaultRole: { type: String, enum: ["admin", "user"], default: "user" },
    note: { type: String },
    addedBy: { type: String }, // email de l'admin
  },
  { timestamps: true }
);

export default models.AllowedEmail || model("AllowedEmail", AllowedEmailSchema);