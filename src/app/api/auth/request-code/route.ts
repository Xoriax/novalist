import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import AllowedEmail from "@/models/AllowedEmail";
import LoginToken from "@/models/LoginToken";
import { getTransport } from "@/lib/mailer";
import crypto from "crypto";



export async function POST(req: Request) {
  try {
    await dbConnect();
    const { email } = await req.json();
    if (!email || typeof email !== "string")
      return NextResponse.json({ error: "Email requis" }, { status: 400 });

    const allowed = await AllowedEmail.findOne({ email: email.toLowerCase() });
    if (!allowed) {
      // réponse neutre pour ne pas divulguer
      return NextResponse.json({ ok: true });
    }

    const code = (Math.floor(100000 + Math.random() * 900000)).toString();
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await LoginToken.create({ email: email.toLowerCase(), codeHash, expiresAt });

    const t = getTransport();
    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Code de connexion - Novalist</title>
        <style>
            body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
            table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
            img { -ms-interpolation-mode: bicubic; }

            img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
            table { border-collapse: collapse !important; }
            body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }

            a[x-apple-data-detectors] {
                color: inherit !important;
                text-decoration: none !important;
                font-size: inherit !important;
                font-family: inherit !important;
                font-weight: inherit !important;
                line-height: inherit !important;
            }

            @media screen and (max-width: 525px) {
                .wrapper { width: 100% !important; max-width: 100% !important; }
                .responsive-table { width: 100% !important; }
                .padding { padding: 10px 5% 15px 5% !important; }
                .section-padding { padding: 0 15px 50px 15px !important; }
            }

            .button {
                display: inline-block;
                padding: 16px 36px;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 18px;
                color: #ffffff;
                text-decoration: none;
                background-color: #6366f1;
                border-radius: 12px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                font-weight: 600;
                letter-spacing: 2px;
            }

            .code-box {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 24px;
                border-radius: 16px;
                text-align: center;
                margin: 24px 0;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
            }

            .code-text {
                font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
                font-size: 36px;
                font-weight: bold;
                color: #ffffff;
                letter-spacing: 8px;
                margin: 0;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }
        </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc;">
        <div style="display: none; font-size: 1px; color: #fefefe; line-height: 1px; font-family: 'Inter', sans-serif; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
            Votre code de connexion Novalist
        </div>
        
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td bgcolor="#f8fafc" align="center">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;" class="wrapper">
                        
                        <!-- Header -->
                        <tr>
                            <td align="center" valign="top" style="padding: 40px 20px 20px 20px;" class="padding">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;" class="responsive-table">
                                    <tr>
                                        <td>
                                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                                <tr>
                                                    <td align="center">
                                                        <h1 style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 32px; font-weight: 700; color: #6366f1; margin: 0; padding-bottom: 8px;">
                                                            Novalist
                                                        </h1>
                                                        <p style="font-family: 'Inter', sans-serif; font-size: 16px; color: #64748b; margin: 0;">
                                                            Votre plateforme de gestion moderne
                                                        </p>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Main Content -->
                        <tr>
                            <td align="center" valign="top" style="padding: 0 20px 40px 20px;" class="padding">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;" class="responsive-table">
                                    <tr>
                                        <td>
                                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                                <tr>
                                                    <td style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); padding: 40px 32px;">
                                                        
                                                        <!-- Welcome Message -->
                                                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                                            <tr>
                                                                <td align="center" style="padding-bottom: 24px;">
                                                                    <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                                                                        <svg width="32" height="32" fill="white" viewBox="0 0 24 24">
                                                                            <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                                                                        </svg>
                                                                    </div>
                                                                    <h2 style="font-family: 'Inter', sans-serif; font-size: 24px; font-weight: 600; color: #1e293b; margin: 0 0 8px 0;">
                                                                        Code de connexion
                                                                    </h2>
                                                                    <p style="font-family: 'Inter', sans-serif; font-size: 16px; color: #64748b; margin: 0; line-height: 1.5;">
                                                                        Utilisez le code ci-dessous pour vous connecter à votre compte Novalist
                                                                    </p>
                                                                </td>
                                                            </tr>
                                                        </table>

                                                        <!-- Code Box -->
                                                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                                            <tr>
                                                                <td align="center" style="padding: 24px 0;">
                                                                    <div class="code-box">
                                                                        <p class="code-text">${code}</p>
                                                                        <p style="font-family: 'Inter', sans-serif; font-size: 14px; color: rgba(255, 255, 255, 0.8); margin: 8px 0 0 0;">
                                                                            Code de vérification
                                                                        </p>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        </table>

                                                        <!-- Instructions -->
                                                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                                            <tr>
                                                                <td style="padding: 24px 0 0 0;">
                                                                    <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; border-left: 4px solid #6366f1;">
                                                                        <h3 style="font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 600; color: #1e293b; margin: 0 0 8px 0;">
                                                                            📋 Instructions
                                                                        </h3>
                                                                        <ul style="font-family: 'Inter', sans-serif; font-size: 14px; color: #475569; margin: 0; padding-left: 20px; line-height: 1.6;">
                                                                            <li>Ce code est valide pendant <strong>10 minutes</strong></li>
                                                                            <li>Saisissez-le dans votre navigateur pour vous connecter</li>
                                                                            <li>Ne partagez jamais ce code avec d'autres personnes</li>
                                                                        </ul>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        </table>

                                                        <!-- Security Notice -->
                                                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                                            <tr>
                                                                <td style="padding: 24px 0 0 0;">
                                                                    <p style="font-family: 'Inter', sans-serif; font-size: 13px; color: #64748b; margin: 0; text-align: center; line-height: 1.5;">
                                                                        🔒 Si vous n'avez pas demandé ce code, vous pouvez ignorer cet email en toute sécurité.
                                                                    </p>
                                                                </td>
                                                            </tr>
                                                        </table>

                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td align="center" valign="top" style="padding: 0 20px 40px 20px;" class="padding">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;" class="responsive-table">
                                    <tr>
                                        <td align="center" style="border-top: 1px solid #e2e8f0; padding-top: 24px;">
                                            <p style="font-family: 'Inter', sans-serif; font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.5;">
                                                © 2025 Novalist. Tous droits réservés.<br>
                                                Cet email a été envoyé à ${email}
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;

    try {
      await t.sendMail({
        to: email,
        from: process.env.SMTP_USER!,
        subject: `🔐 Code de connexion Novalist`,
        text: `Bonjour,\n\nVotre code de connexion Novalist est : ${code}\n\nCe code est valide pendant 10 minutes.\n\nSi vous n'avez pas demandé ce code, vous pouvez ignorer cet email.\n\nCordialement,\nL'équipe Novalist`,
        html: htmlTemplate,
      });
    } catch (e: unknown) {
      console.error("SMTP sendMail error:", e);
      const message = e instanceof Error ? e.message : "inconnue";
      return NextResponse.json({ error: "Erreur SMTP: " + message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("request-code error:", err);
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}