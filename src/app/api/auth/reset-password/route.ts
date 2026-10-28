import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionToken, setSessionCookie } from "@/lib/auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = (searchParams.get("token") || "").trim();

  if (!token) {
    return NextResponse.json({
      valid: false,
      reason: "Jeton de réinitialisation manquant.",
    });
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!record) {
    return NextResponse.json({
      valid: false,
      reason: "Ce lien de réinitialisation est invalide ou introuvable.",
    });
  }

  if (record.usedAt) {
    return NextResponse.json({
      valid: false,
      reason: "Ce lien de réinitialisation a déjà été utilisé.",
    });
  }

  if (new Date(record.expiresAt) < new Date()) {
    return NextResponse.json({
      valid: false,
      reason: "Ce lien de réinitialisation a expiré.",
    });
  }

  return NextResponse.json({
    valid: true,
    user: {
      name: record.user.name,
      email: record.user.email,
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = (body.token || "").trim();
    const newPassword = body.newPassword || "";

    if (!token || newPassword.length < 6) {
      return NextResponse.json(
        {
          error:
            "Veuillez saisir un nouveau mot de passe d'au moins 6 caractères.",
        },
        { status: 400 }
      );
    }

    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record || record.usedAt || new Date(record.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "Ce lien de réinitialisation est invalide ou a expiré." },
        { status: 403 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const updatedUser = await prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });

    await prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    const sessionToken = await createSessionToken({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
    });
    setSessionCookie(sessionToken);

    return NextResponse.json({
      ok: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
      },
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la réinitialisation du mot de passe." },
      { status: 500 }
    );
  }
}

