import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

async function trySendResetEmail(
  toEmail: string,
  toName: string,
  resetUrl: string
): Promise<boolean> {
  const fromEmail =
    process.env.EMAIL_FROM || "WhatsUpPlant <noreply@braquoland.ovh>";
  const subject = "Réinitialisation de votre mot de passe WhatsUpPlant 🌿";
  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border-radius: 16px; border: 1px solid #d4e4da; background: #f8fbf9;">
      <h2 style="color: #1e3b2c; margin-top: 0;">Bonjour ${toName} 🌿</h2>
      <p style="color: #374151; font-size: 14px; line-height: 1.5;">
        Vous avez demandé à réinitialiser votre mot de passe sur <strong>WhatsUpPlant</strong>.
        Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe (valable 24 heures) :
      </p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}" style="display: inline-block; background: #2a5940; color: #ffffff; text-decoration: none; font-weight: bold; padding: 12px 22px; border-radius: 12px; font-size: 14px;">
          Réinitialiser mon mot de passe
        </a>
      </p>
      <p style="color: #6b7280; font-size: 12px;">
        Ou copiez ce lien dans votre navigateur :<br/>
        <a href="${resetUrl}" style="color: #2a5940;">${resetUrl}</a>
      </p>
    </div>
  `;

  try {
    if (process.env.RESEND_API_KEY) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [toEmail],
          subject,
          html: htmlContent,
        }),
      });
      return res.ok;
    }

    if (process.env.BREVO_API_KEY) {
      const senderEmail =
        process.env.EMAIL_FROM_ADDRESS || "noreply@braquoland.ovh";
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: { name: "WhatsUpPlant", email: senderEmail },
          to: [{ email: toEmail, name: toName }],
          subject,
          htmlContent,
        }),
      });
      return res.ok;
    }
  } catch (err) {
    console.error("Send reset email error:", err);
  }

  return false;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) {
      return NextResponse.json(
        { error: "Veuillez saisir votre adresse email." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Réponse générique pour ne pas divulguer les emails existants
      return NextResponse.json({
        ok: true,
        emailSent: false,
      });
    }

    const token = crypto.randomBytes(18).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://plant.braquoland.ovh";
    const resetUrl = `${origin}/reset-password?token=${token}`;

    const emailSent = await trySendResetEmail(user.email, user.name, resetUrl);

    return NextResponse.json({
      ok: true,
      emailSent,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la demande de réinitialisation." },
      { status: 500 }
    );
  }
}

