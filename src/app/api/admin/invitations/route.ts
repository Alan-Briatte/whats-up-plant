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
    console.error("Create invitation error:", error);
    return NextResponse.json(
      { error: "Impossible de générer le lien d'invitation." },
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

      // Supprime aussi les diagnostics liés à ce userId
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

