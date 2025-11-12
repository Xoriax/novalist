import nodemailer from "nodemailer";

function bool(v: string | undefined, def: boolean) {
  if (v === undefined) return def;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

export function getTransport() {
  const host = process.env.SMTP_HOST!;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = bool(process.env.SMTP_SECURE, port === 465);
  const user = process.env.SMTP_USER!;
  const pass = process.env.SMTP_PASS!;
  const requireTLS = bool(process.env.SMTP_REQUIRE_TLS, port === 587);
  const rejectUnauthorized = bool(process.env.SMTP_REJECT_UNAUTHORIZED, true);
  const debug = bool(process.env.SMTP_DEBUG, false);

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    requireTLS,
    tls: {
      rejectUnauthorized,
      servername: host,
    },
    logger: debug,
    debug,
  });
}