import { Schema, model, models } from "mongoose";

const LoginTokenSchema = new Schema(
  {
    email: { type: String, index: true, required: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    consumed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default models.LoginToken || model("LoginToken", LoginTokenSchema);