import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getSessionUser, isAdminEmail } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json(
      { error: "Accès réservé à l'administrateur." },
      { status: 403 }
    );
  }

  const now = new Date();

  const [invitations, rawUsers] = await Promise.all([
    prisma.invitation.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        _count: {
          select: { plants: true },
        },
        resetTokens: {
          where: {
            usedAt: null,
            expiresAt: { gt: now },
          },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            token: true,
            expiresAt: true,
            createdAt: true,
          },
        },
      },
    }),
  ]);

  const users = rawUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    createdAt: u.createdAt,
    plantsCount: u._count.plants,
    isAdmin: isAdminEmail(u.email),
    activeResetToken: u.resetTokens[0]?.token || null,
  }));

  return NextResponse.json({ invitations, users });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json(
      { error: "Accès réservé à l'administrateur." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();

    // Action 1 : Générer un lien de réinitialisation de mot de passe pour un utilisateur
    if (body.action === "reset_password" && typeof body.userId === "string") {
      const targetUser = await prisma.user.findUnique({
        where: { id: body.userId },
      });
      if (!targetUser) {
        return NextResponse.json(
          { error: "Utilisateur introuvable." },
          { status: 404 }
        );
      }

      const token = crypto.randomBytes(18).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

      const resetRecord = await prisma.passwordResetToken.create({
        data: {
          userId: targetUser.id,
          token,
          expiresAt,
        },
      });

      return NextResponse.json({
        resetToken: resetRecord.token,
        expiresAt: resetRecord.expiresAt,
        userId: targetUser.id,
      });
    }

    // Action 2 : Générer un lien d'invitation
    const label = typeof body.label === "string" ? body.label.trim() : null;
    const email =
      typeof body.email === "string" && body.email.trim()
        ? body.email.trim().toLowerCase()
        : null;
    const expiresInDays = Math.min(
      90,
      Math.max(1, Number(body.expiresInDays) || 7)
    );

    const token = crypto.randomBytes(18).toString("hex");
    const expiresAt = new Date(
      Date.now() + expiresInDays * 24 * 60 * 60 * 1000
    );

    const invitation = await prisma.invitation.create({
      data: {
        token,
        label: label || null,
        email,
        expiresAt,
      },
    });

    return NextResponse.json({ invitation });
  } catch (error) {
    console.error("Admin POST error:", error);
    return NextResponse.json(
      { error: "Impossible d'exécuter cette action." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json(
      { error: "Accès réservé à l'administrateur." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const inviteId = searchParams.get("inviteId");
  const userId = searchParams.get("userId");

  try {
    if (inviteId) {
      await prisma.invitation.delete({
        where: { id: inviteId },
      });
      return NextResponse.json({ deletedInviteId: inviteId });
    }

    if (userId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (!targetUser) {
        return NextResponse.json(
          { error: "Utilisateur introuvable." },
          { status: 404 }
        );
      }
      if (targetUser.id === user.id || isAdminEmail(targetUser.email)) {
        return NextResponse.json(
          { error: "Impossible de supprimer le compte administrateur." },
          { status: 400 }
        );
      }

      await prisma.healthDiagnosis.deleteMany({
        where: { userId: targetUser.id },
      });
      await prisma.user.delete({
        where: { id: targetUser.id },
      });

      return NextResponse.json({ deletedUserId: userId });
    }

    return NextResponse.json(
      { error: "Paramètre inviteId ou userId manquant." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Admin delete error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression." },
      { status: 500 }
    );
  }
}
