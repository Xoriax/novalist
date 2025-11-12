import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");

type BasePayload = { uid: string; role: "admin" | "user"; email: string };

export async function signSession(payload: BasePayload, hours = 24) {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * hours;
  return await new SignJWT({
    ...payload,
    sub: payload.uid,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(exp)
    .setIssuedAt()
    .sign(secret);
}

export async function verifySession(token: string) {
  const { payload } = await jwtVerify<BasePayload>(token, secret);
  return payload;
}
