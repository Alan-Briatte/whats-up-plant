import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminEmail } from "@/lib/auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = (searchParams.get("token") || "").trim();

  const adminEmail = getAdminEmail();
  const adminUser = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true },
  });
  const adminExists = Boolean(adminUser);

  if (!token) {
    return NextResponse.json({
      valid: false,
      adminExists,
      reason: "Un lien d'invitation valide est requis pour créer un compte.",
    });
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token },
  });

  if (!invitation) {
    return NextResponse.json({
      valid: false,
      adminExists,
      reason: "Ce lien d'invitation est introuvable ou a été révoqué.",
    });
  }

  if (invitation.usedAt) {
    return NextResponse.json({
      valid: false,
      adminExists,
      reason: "Ce lien d'invitation a déjà été utilisé.",
    });
  }

  if (new Date(invitation.expiresAt) < new Date()) {
    return NextResponse.json({
      valid: false,
      adminExists,
      reason: "Ce lien d'invitation a expiré.",
    });
  }

  return NextResponse.json({
    valid: true,
    adminExists,
    invitation: {
      label: invitation.label,
      email: invitation.email,
      expiresAt: invitation.expiresAt,
    },
  });
}

