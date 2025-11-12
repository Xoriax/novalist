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
  },
  { timestamps: true }
);

export type IUser = {
  _id: string;
  email: string;
  role: "admin" | "user";
  mfa: { enabled: boolean; totpSecret?: string; tempSecret?: string };
};

export default models.User || model("User", UserSchema);