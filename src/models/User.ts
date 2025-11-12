import { Schema, model, models } from "mongoose";

const UserSchema = new Schema(
  {
    email: { type: String, unique: true, index: true, required: true },
    role: { type: String, enum: ["admin", "user"], default: "user" },
    mfa: {
      enabled: { type: Boolean, default: false },
      totpSecret: { type: String },     // secret actif (si MFA activée)
      tempSecret: { type: String },     // secret temporaire durant le setup
    },
    employee: {
      id: { type: String },           // Employee ID du fichier Excel
      name: { type: String },         // Employee Name du fichier Excel
      linked: { type: Boolean, default: false }, // Si l'utilisateur est lié à un employé
    },
  },
  { timestamps: true }
);

export type IUser = {
  _id: string;
  email: string;
  role: "admin" | "user";
  mfa: { enabled: boolean; totpSecret?: string; tempSecret?: string };
  employee?: {
    id?: string;
    name?: string;
    linked?: boolean;
  };
};

export default models.User || model("User", UserSchema);